/**
 * Converts Float32Array PCM audio data from the Web Audio API into a standard .wav Blob.
 * 
 * @param audioData Flat array of all recorded audio segments (Float32).
 * @param sampleRate The recording sample rate (usually 44100 or 48000).
 * @param numChannels Number of channels (1 for mono, 2 for stereo).
 * @returns A Blob containing the uncompressed .wav file.
 */
export function encodeWav(audioData: Float32Array, sampleRate: number, numChannels: number = 1): Blob {
    const buffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioData.length * 2, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, audioData.length * 2, true);

    // Write PCM samples (convert Float32 from -1..1 to Int16)
    let offset = 44;
    for (let i = 0; i < audioData.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
