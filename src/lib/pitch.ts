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
    // 1. Check if the signal is loud enough
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
        rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.01) {
        // Signal is too quiet
        return null;
    }

    // 2. Find the clear signal range to avoid edge artifacts
    let r1 = 0;
    let r2 = buffer.length - 1;
    const threshold = 0.2;

    for (let i = 0; i < buffer.length / 2; i++) {
        if (Math.abs(buffer[i]) < threshold) {
            r1 = i;
            break;
        }
    }
    for (let i = 1; i < buffer.length / 2; i++) {
        if (Math.abs(buffer[buffer.length - i]) < threshold) {
            r2 = buffer.length - i;
            break;
        }
    }

    buffer = buffer.slice(r1, r2);
    const SIZE = buffer.length;

    // 3. Auto-correlation calculation
    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) {
            c[i] = c[i] + buffer[j] * buffer[j + i];
        }
    }

    // 4. Find the first significant peak
    let d = 0;
    while (c[d] > c[d + 1]) {
        d++;
    }

    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }

    let T0 = maxpos;

    // 5. Parabolic interpolation for fine tuning the sub-sample peak
    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) {
        T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
}
