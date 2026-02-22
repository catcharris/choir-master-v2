// src/lib/pitch.ts

const A4 = 440;
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
export function freqToMidi(freq: number): number {
    return Math.round(A4_INDEX + 12 * Math.log2(freq / A4));
}

/**
 * Converts a frequency in Hz to a PitchData object containing the note string and cents deviation.
 */
export function getPitchData(frequency: number): PitchData | null {
    if (frequency <= 0) return null;

    const midi = freqToMidi(frequency);
    const perfectFreq = A4 * Math.pow(2, (midi - A4_INDEX) / 12);

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
 * 
 * @param buffer Float32Array containing PCM audio data from AnalyserNode
 * @param sampleRate The sample rate of the AudioContext (e.g., 44100 or 48000)
 * @returns The detected fundamental frequency in Hz, or null if no clear pitch is found.
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
    const SIZE = buffer.length;
    let rms = 0;

    // 1. Calculate Volume (RMS)
    for (let i = 0; i < SIZE; i++) {
        const val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // Lower threshold to pick up voices from further away (was 0.01)
    if (rms < 0.005) {
        return null;
    }

    // 2. Auto-correlation calculation
    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }
    const cleanBuffer = buffer.slice(r1, r2);
    const C_SIZE = cleanBuffer.length;

    const c = new Array(C_SIZE).fill(0);
    for (let i = 0; i < C_SIZE; i++) {
        for (let j = 0; j < C_SIZE - i; j++) {
            c[i] = c[i] + cleanBuffer[j] * cleanBuffer[j + i];
        }
    }

    // 3. Find the first valley then the first peak to avoid false high-frequency (harmonics) matches
    let d = 0;
    while (c[d] > c[d + 1]) {
        d++;
    }

    let maxval = -1, maxpos = -1;
    for (let i = d; i < C_SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }

    let T0 = maxpos;

    // 4. Parabolic interpolation
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;

    if (a) {
        T0 = T0 - b / (2 * a);
    }

    const freq = sampleRate / T0;

    // Reject wildly impossible human frequencies (soprano peak is ~1200, but whistle register higher)
    if (freq < 50 || freq > 2000) {
        return null;
    }

    return freq;
}
