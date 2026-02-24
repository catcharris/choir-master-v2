// src/lib/pitch.ts

const A4_INDEX = 69; // MIDI note number for A4
const NOTE_STRINGS = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

export interface PitchData {
    frequency: number;
    note: string;
    octave: number;
    cents: number; // Deviation from the perfect note (-50 to +50)
}

/**
 * Converts a frequency in Hz to the closest MIDI note number.
 */
export function freqToMidi(freq: number, a4: number = 440): number {
    return Math.round(A4_INDEX + 12 * Math.log2(freq / a4));
}

/**
 * Converts a frequency in Hz to a PitchData object containing the note string and cents deviation.
 */
export function getPitchData(frequency: number, a4: number = 440): PitchData | null {
    if (frequency <= 0) return null;

    const midi = freqToMidi(frequency, a4);
    const perfectFreq = a4 * Math.pow(2, (midi - A4_INDEX) / 12);

    // Calculate cents deviation: 1200 * log2(freq / perfectFreq)
    const cents = Math.round(1200 * Math.log2(frequency / perfectFreq));

    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;

    return {
        frequency,
        note: NOTE_STRINGS[noteIndex],
        octave,
        cents
    };
}

/**
 * Auto-correlation based pitch detection algorithm.
 * Excellent for monotonic vocal pitch detection.
 * Excellent for vocal pitch detection, robust to distance/volume drop-offs.
 * 
 * @param buffer Float32Array containing time-domain PCM audio data (from getFloatTimeDomainData)
 * @param sampleRate The sample rate of the AudioContext
 * @returns The detected pitch in Hz, or null
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number, mode: 'vocal' | 'piano' = 'vocal'): number | null {
    const SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // RMS Volume Threshold (Noise Gate / Proximity Bubble)
    // 0.01 allows comfortable reading distance at ~60cm for isolation (Vocal).
    // 0.005 allows picking up a piano across the rehearsal room (Piano).
    const rmsThreshold = mode === 'piano' ? 0.005 : 0.01;
    if (rms < rmsThreshold) {
        return null;
    }

    // 1. Find a signal's starting edge
    let r1 = 0;
    let r2 = SIZE - 1;
    let thres = 0.2;

    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buffer[i]) < thres) {
            r1 = i;
            break;
        }
    }

    // 2. Find a signal's ending edge
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buffer[SIZE - i]) < thres) {
            r2 = SIZE - i;
            break;
        }
    }

    let buf = buffer.slice(r1, r2);
    const newSize = buf.length;

    // 3. Auto-correlation calculation
    const c = new Array(newSize).fill(0);
    for (let i = 0; i < newSize; i++) {
        for (let j = 0; j < newSize - i; j++) {
            c[i] = c[i] + buf[j] * buf[j + i];
        }
    }

    // 4. Find the first significant peak
    let d = 0;
    while (c[d] > c[d + 1]) {
        d++;
    }

    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < newSize; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }

    // Periodicity / Clarity Check
    // c[0] represents perfect overlap (maximum possible signal energy).
    // If the detected peak (maxval) is too weak compared to c[0], 
    // the signal is mostly unpitched noise/breath, not a clear musical note.
    if (c[0] === 0 || maxval / c[0] < 0.6) {
        return null;
    }

    let T0 = maxpos;

    // 5. Parabolic interpolation for fine tuning the sub-sample peak
    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) {
        T0 = T0 - b / (2 * a);
    }

    const frequency = sampleRate / T0;

    // Vocal + Piano constraint (70Hz to 1200Hz)
    if (frequency < 70 || frequency > 1200) return null;

    return frequency;
}
