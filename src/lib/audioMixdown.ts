import { PracticeTrack } from './storageUtils';

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number = 2): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 for PCM)
    view.setUint16(22, numChannels, true); // num channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

// Generate algorithmic impulse response for Convolution Reverb (Warm Hall)
function createReverbIR(audioCtx: BaseAudioContext, duration: number, decay: number) {
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Simple 1-pole Low-Pass Filter to remove harsh metallic high frequencies
    // Alpha controls warmth (lower = darker, higher = brighter)
    const lpAlpha = 0.15;
    let lpLeft = 0;
    let lpRight = 0;

    for (let i = 0; i < length; i++) {
        // Exponential decay
        const n = 1 - i / length;
        const env = Math.pow(n, decay);

        // Generate raw white noise
        const rawLeft = (Math.random() * 2 - 1);
        const rawRight = (Math.random() * 2 - 1);

        // Apply Low-Pass Filter
        lpLeft = lpLeft + lpAlpha * (rawLeft - lpLeft);
        lpRight = lpRight + lpAlpha * (rawRight - lpRight);

        // Apply envelope
        left[i] = lpLeft * env;
        right[i] = lpRight * env;
    }
    return impulse;
}

export const START_RECORD_DELAY_MS = 1500;
export const START_RECORD_DELAY_SEC = START_RECORD_DELAY_MS / 1000;

export async function mixdownTracks(
    tracks: PracticeTrack[],
    volumes: Record<string, number>,
    muted: Record<string, boolean>,
    panning: Record<string, number>,
    masterEq: { low: number, mid: number, high: number },
    reverbAmount: number = 0, // 0.0 to 1.0 (Wet/Dry mix)
    mrUrl?: string | null     // Optional backing track to layer in
): Promise<Blob> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // 1. Fetch and decode all audio
    const buffers: { buffer: AudioBuffer, trackId: string }[] = [];

    // 1(a). Fetch MR if provided
    if (mrUrl) {
        try {
            const response = await fetch(mrUrl);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                buffers.push({ buffer: audioBuffer, trackId: '__mr__' });
            }
        } catch (err) {
            console.error("Failed to include MR in mixdown:", err);
            // Non-fatal, we just continue with vocals
        }
    }

    // 1(b). Fetch vocal tracks
    for (const track of tracks) {
        // Fetch the raw audio payload
        const response = await fetch(track.publicUrl);
        if (!response.ok) throw new Error(`Failed to fetch track: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();

        // Decode the Opus/WebM/MP4 data into raw PCM AudioBuffer
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        buffers.push({ buffer: audioBuffer, trackId: track.id });
    }

    // 2. Determine longest track to set canvas duration
    let maxDuration = 0;
    for (const b of buffers) {
        let trackDuration = b.buffer.duration;
        if (b.trackId === '__mr__') {
            trackDuration += START_RECORD_DELAY_SEC; // Accounts for offset
        }
        if (trackDuration > maxDuration) {
            maxDuration = trackDuration;
        }
    }

    if (maxDuration === 0) throw new Error("No usable audio data found to mix.");

    // 3. Setup OfflineAudioContext for headless rendering
    // Fallback to 44100 if something is weird
    const sampleRate = buffers[0]?.buffer.sampleRate || 44100;
    // Add extra time to maxDuration so the reverb tail doesn't clip abruptly
    const tailLength = reverbAmount > 0 ? 3.0 : 0;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * (maxDuration + tailLength), sampleRate);

    // 4. Setup Master Buss Routing (EQ -> Reverb -> Destination)
    const masterOut = offlineCtx.createGain();

    // Master 3-Band EQ
    const lowNode = offlineCtx.createBiquadFilter();
    lowNode.type = 'lowshelf';
    lowNode.frequency.value = 300;
    lowNode.gain.value = masterEq.low;

    const midNode = offlineCtx.createBiquadFilter();
    midNode.type = 'peaking';
    midNode.frequency.value = 1000;
    midNode.Q.value = 0.5;
    midNode.gain.value = masterEq.mid;

    const highNode = offlineCtx.createBiquadFilter();
    highNode.type = 'highshelf';
    highNode.frequency.value = 4000;
    highNode.gain.value = masterEq.high;

    // Connect EQ chain
    masterOut.connect(lowNode);
    lowNode.connect(midNode);
    midNode.connect(highNode);

    let finalMasterIn = highNode; // If no reverb, this connects to destination

    let masterReverb: ConvolverNode | null = null;
    let reverbGain: GainNode | null = null;
    let dryGain: GainNode | null = null;

    if (reverbAmount > 0) {
        masterReverb = offlineCtx.createConvolver();
        masterReverb.buffer = createReverbIR(offlineCtx, 2.5, 4.0); // 2.5-second warm hall decay

        reverbGain = offlineCtx.createGain();
        reverbGain.gain.value = reverbAmount; // Wet level

        dryGain = offlineCtx.createGain();
        dryGain.gain.value = 1.0 - (reverbAmount * 0.5); // Slightly duck the dry signal

        finalMasterIn.connect(dryGain);
        finalMasterIn.connect(masterReverb);
        masterReverb.connect(reverbGain);

        dryGain.connect(offlineCtx.destination);
        reverbGain.connect(offlineCtx.destination);
    } else {
        finalMasterIn.connect(offlineCtx.destination);
    }

    // 5. Mix individual tracks into the Master Buss
    for (const b of buffers) {
        const source = offlineCtx.createBufferSource();
        source.buffer = b.buffer;

        const trackGain = offlineCtx.createGain();
        const isMuted = muted[b.trackId] ?? false;
        trackGain.gain.value = isMuted ? 0 : (volumes[b.trackId] ?? 1.0);

        // Stereo Panning
        const trackPan = offlineCtx.createStereoPanner();
        trackPan.pan.value = panning[b.trackId] ?? 0;

        source.connect(trackGain);
        trackGain.connect(trackPan);
        trackPan.connect(masterOut);

        // Satellites start exactly at 0.0 because the MediaRecorder was delayed by 1.5s
        // Therefore, the MR (which is the absolute truth timeline t=0) must be pushed right by +1.5s
        // so it perfectly aligns with the beginning of the satellite Blob.
        if (b.trackId === '__mr__') {
            source.start(START_RECORD_DELAY_SEC);
        } else {
            source.start(0);
        }
    }

    // 6. Render entire batch instantly
    const renderedBuffer = await offlineCtx.startRendering();

    // 7. Convert to standard WAV 
    // Interleave stereo channels for PCM format
    const left = renderedBuffer.getChannelData(0);
    const right = renderedBuffer.numberOfChannels > 1 ? renderedBuffer.getChannelData(1) : left; // Fallback to mono if needed
    const interleaved = new Float32Array(left.length + right.length);

    for (let i = 0; i < left.length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
    }

    return encodeWAV(interleaved, sampleRate, 2);
}
