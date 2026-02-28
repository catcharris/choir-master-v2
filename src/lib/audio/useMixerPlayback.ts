import { useState, useRef, useCallback, useEffect } from 'react';
import { PracticeTrack } from '../storageUtils';

// Helper: Generate a synthetic Impulse Response (IR) for reverb, 
// matching the implementation in audioMixdown.ts
function createReverbIR(ctx: BaseAudioContext, duration: number = 2.0, decay: number = 2.0) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const lpAlpha = 0.15;
    let lpLeft = 0;
    let lpRight = 0;

    for (let i = 0; i < length; i++) {
        const n = 1 - i / length;
        const env = Math.pow(n, decay);

        const rawLeft = (Math.random() * 2 - 1);
        const rawRight = (Math.random() * 2 - 1);

        lpLeft = lpLeft + lpAlpha * (rawLeft - lpLeft);
        lpRight = lpRight + lpAlpha * (rawRight - lpRight);

        left[i] = lpLeft * env;
        right[i] = lpRight * env;
    }
    return impulse;
}

interface UseMixerPlaybackProps {
    tracks: PracticeTrack[];
    mrUrl?: string | null;
}

export function useMixerPlayback({ tracks, mrUrl }: UseMixerPlaybackProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const trackSourcesRef = useRef<Map<string, { source: AudioBufferSourceNode, gainNode: GainNode, pannerNode: StereoPannerNode }>>(new Map());
    const decodedBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

    // Master Buss
    const masterGainRef = useRef<GainNode | null>(null);
    const reverbConvolverRef = useRef<ConvolverNode | null>(null);
    const reverbGainRef = useRef<GainNode | null>(null);
    const dryGainRef = useRef<GainNode | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialization and Buffer Decoding
    useEffect(() => {
        let isMounted = true;
        const initAudio = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const masterGain = ctx.createGain();

            // Reverb Routing Setup
            const reverbConvolver = ctx.createConvolver();
            reverbConvolver.buffer = createReverbIR(ctx, 2.5, 4.0); // 2.5s warm hall decay

            const reverbGain = ctx.createGain();
            reverbGain.gain.value = 0; // Default off (0 wet)

            const dryGain = ctx.createGain();
            dryGain.gain.value = 1.0; // Default fully dry

            // All track signals will flow into masterGain first, 
            // then split to dryGain and reverbConvolver -> reverbGain, 
            // then both merge into destination.
            masterGain.connect(dryGain);
            masterGain.connect(reverbConvolver);
            reverbConvolver.connect(reverbGain);

            dryGain.connect(ctx.destination);
            reverbGain.connect(ctx.destination);

            masterGainRef.current = masterGain;
            reverbConvolverRef.current = reverbConvolver;
            reverbGainRef.current = reverbGain;
            dryGainRef.current = dryGain;

            try {
                // Decode MR 
                if (mrUrl) {
                    const mrRes = await fetch(mrUrl);
                    const mrArray = await mrRes.arrayBuffer();
                    const mrDecoded = await ctx.decodeAudioData(mrArray);
                    if (isMounted) decodedBuffersRef.current.set('__mr__', mrDecoded);
                }

                // Decode Vocal Tracks
                await Promise.all(tracks.map(async (track) => {
                    const res = await fetch(track.publicUrl);
                    const array = await res.arrayBuffer();
                    const decoded = await ctx.decodeAudioData(array);
                    if (isMounted) decodedBuffersRef.current.set(track.id, decoded);
                }));

                if (isMounted) setIsReady(true);
            } catch (err) {
                console.error("Failed to decode audio for preview:", err);
            }
        };

        setIsReady(false);
        initAudio();

        return () => {
            isMounted = false;
            stopPlayback(); // Cleanup nodes
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.error(e));
            }
        };
    }, [tracks, mrUrl]); // Re-decode entirely if track list changes

    const stopPlayback = useCallback(() => {
        trackSourcesRef.current.forEach(({ source, gainNode, pannerNode }) => {
            try { source.stop(); } catch (e) { }
            source.disconnect();
            gainNode.disconnect();
            pannerNode.disconnect();
        });
        trackSourcesRef.current.clear();
        setIsPlaying(false);
    }, []);

    const playPreview = useCallback((
        volumes: Record<string, number>,
        muted: Record<string, boolean>,
        panning: Record<string, number>,
        reverbAmount: number = 0,
        userOffsetsMs: Record<string, number> = {}
    ) => {
        const ctx = audioContextRef.current;
        if (!ctx || !isReady || !masterGainRef.current) return;

        // Ensure clean slate
        stopPlayback();

        // Check if context needs user interaction unlock (Safari)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.error(e));
        }

        const now = ctx.currentTime;
        const PLAYBACK_DELAY = 0.1; // 100ms cushion for node scheduling
        const absoluteStartTime = now + PLAYBACK_DELAY;

        // Apply initial Reverb Amount
        if (reverbGainRef.current && dryGainRef.current) {
            reverbGainRef.current.gain.value = reverbAmount; // Wet level
            dryGainRef.current.gain.value = 1.0 - (reverbAmount * 0.5); // Slightly duck dry signal
        }

        // Play MR
        const mrBuffer = decodedBuffersRef.current.get('__mr__');
        if (mrBuffer) {
            const mrSource = ctx.createBufferSource();
            mrSource.buffer = mrBuffer;

            const mrGain = ctx.createGain();
            mrGain.gain.value = muted['__mr__'] ? 0 : (volumes['__mr__'] ?? 0.5);

            const mrPanner = ctx.createStereoPanner();
            mrPanner.pan.value = panning['__mr__'] ?? 0;

            mrSource.connect(mrGain).connect(mrPanner).connect(masterGainRef.current);

            const mrUserOffsetSec = (userOffsetsMs['__mr__'] || 0) / 1000;
            const startWhen = Math.max(0, mrUserOffsetSec);
            const bufferOffset = Math.max(0, -mrUserOffsetSec);

            mrSource.start(absoluteStartTime + startWhen, bufferOffset);

            mrSource.onended = () => {
                // If MR finishes, we assume the take is over
                setIsPlaying(false);
            };

            trackSourcesRef.current.set('__mr__', { source: mrSource, gainNode: mrGain, pannerNode: mrPanner });
        }

        // Play Vocals
        tracks.forEach(track => {
            const buffer = decodedBuffersRef.current.get(track.id);
            if (!buffer) return;

            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = muted[track.id] ? 0 : (volumes[track.id] ?? 1.0);

            const pannerNode = ctx.createStereoPanner();
            pannerNode.pan.value = panning[track.id] ?? 0;

            source.connect(gainNode).connect(pannerNode).connect(masterGainRef.current!);

            // True T=0 Native Sync Pattern logic directly mirrored from audioMixdown.ts
            const baseOffsetMs = track.offsetMs || 0;
            const userOffsetMs = userOffsetsMs[track.id] || 0;
            const finalOffsetSec = ((baseOffsetMs + userOffsetMs) / 1000);

            const startWhen = Math.max(0, finalOffsetSec);
            const bufferOffset = Math.max(0, -finalOffsetSec);

            source.start(absoluteStartTime + startWhen, bufferOffset);

            trackSourcesRef.current.set(track.id, { source, gainNode, pannerNode });
        });

        setIsPlaying(true);
    }, [tracks, isReady, stopPlayback]);

    // Real-time parameter updates
    const updateVolumes = useCallback((volumes: Record<string, number>, muted: Record<string, boolean>) => {
        if (!audioContextRef.current) return;
        trackSourcesRef.current.forEach(({ gainNode }, trackId) => {
            const targetVolume = muted[trackId] ? 0 : (volumes[trackId] ?? (trackId === '__mr__' ? 0.5 : 1.0));
            // Smoothly ease to the new volume to prevent clicks
            gainNode.gain.setTargetAtTime(targetVolume, audioContextRef.current!.currentTime, 0.05);
        });
    }, []);

    const updatePanning = useCallback((panning: Record<string, number>) => {
        if (!audioContextRef.current) return;
        trackSourcesRef.current.forEach(({ pannerNode }, trackId) => {
            const targetPan = panning[trackId] ?? 0;
            pannerNode.pan.setTargetAtTime(targetPan, audioContextRef.current!.currentTime, 0.05);
        });
    }, []);

    const updateReverb = useCallback((reverbAmount: number) => {
        if (!audioContextRef.current || !reverbGainRef.current || !dryGainRef.current) return;

        const ctxTime = audioContextRef.current.currentTime;
        // Wet level
        reverbGainRef.current.gain.setTargetAtTime(reverbAmount, ctxTime, 0.05);
        // Dry level (ducking)
        dryGainRef.current.gain.setTargetAtTime(1.0 - (reverbAmount * 0.5), ctxTime, 0.05);
    }, []);

    const togglePlayback = useCallback((
        volumes: Record<string, number>,
        muted: Record<string, boolean>,
        panning: Record<string, number>,
        reverbAmount: number = 0,
        userOffsetsMs: Record<string, number> = {}
    ) => {
        if (isPlaying) {
            stopPlayback();
        } else {
            playPreview(volumes, muted, panning, reverbAmount, userOffsetsMs);
        }
    }, [isPlaying, stopPlayback, playPreview]);

    return {
        isReady,
        isPlaying,
        togglePlayback,
        stopPlayback,
        updateVolumes,
        updatePanning,
        updateReverb
    };
}
