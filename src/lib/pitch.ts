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
/**
 * Harmonic Product Spectrum (HPS) pitch detection algorithm.
 * Better for human voices/choirs as it relies on the resonant harmonics 
 * rather than the raw fundamental vocal cord vibration.
 * 
 * @param frequencyData Float32Array containing FFT frequency data (from getFloatFrequencyData)
 * @param sampleRate The sample rate of the AudioContext
 * @param fftSize The FFT window size
 * @returns The detected pitch in Hz, or null
 */
export function detectPitchHPS(frequencyData: Float32Array, sampleRate: number, fftSize: number): number | null {
    const NUM_HARMONICS = 5; // Downsampling factor (x1 to x5)

    // 1. Convert Decibels to Linear Magnitude
    // The Web Audio API getFloatFrequencyData returns values in dB (-100 to 0).
    const magnitudes = new Float32Array(frequencyData.length);
    let maxMag = 0;

    for (let i = 0; i < frequencyData.length; i++) {
        // Simple linear mapping: push silent(-100dB) to 0, loud(0) to 1.
        let linear = Math.pow(10, frequencyData[i] / 20);
        magnitudes[i] = linear;
        if (linear > maxMag) maxMag = linear;
    }

    // Noise gate
    if (maxMag < 0.01) return null;

    // The resolution (Hz per array bin). e.g., 44100 / 2048 = ~21.5 Hz per bin
    // To get better resolution, fftSize needs to be large (e.g. 4096 or 8192)
    const binSize = (sampleRate / 2) / frequencyData.length;

    // 2. Compute Harmonic Product Spectrum
    const hps = new Float32Array(frequencyData.length);
    for (let i = 0; i < hps.length; i++) {
        let product = magnitudes[i]; // Start with fundamental bin

        for (let h = 2; h <= NUM_HARMONICS; h++) {
            const harmonicIndex = i * h;
            if (harmonicIndex < magnitudes.length) {
                // Multiply by the amplitude at harmonic multiples
                product *= magnitudes[harmonicIndex];
            } else {
                product *= 0;
            }
        }
        hps[i] = product;
    }

    // 3. Find the peak in the HPS array
    let maxHps = 0;
    let maxHpsIndex = -1;

    // Vocal pitch range restriction: 70Hz (Bass) to 1200Hz (Hi Soprano)
    const minBin = Math.floor(70 / binSize);
    const maxBin = Math.floor(1200 / binSize);

    for (let i = minBin; i <= maxBin; i++) {
        if (hps[i] > maxHps) {
            maxHps = hps[i];
            maxHpsIndex = i;
        }
    }

    if (maxHpsIndex === -1 || maxHps < 1e-10) return null;

    // The fundamental frequency is the bin index multiplied by the resolution
    return maxHpsIndex * binSize;
}
