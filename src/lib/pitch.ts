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

    const magnitudes = new Float32Array(frequencyData.length);
    let maxMag = 0;

    // WebAudio getFloatFrequencyData returns dBFS (typically -100 to 0).
    // We need to shift it up so the noise floor is near 0, and peaks are positive.
    // Raising MIN_DB to -45 strictly isolates loud/close proximity singing (within ~20cm)
    const MIN_DB = -45; // Ignore anything below -45dB

    for (let i = 0; i < frequencyData.length; i++) {
        const db = frequencyData[i];
        let mag = 0;
        if (db > MIN_DB) {
            mag = db - MIN_DB; // Shift up 
        }
        magnitudes[i] = mag;
        if (mag > maxMag) maxMag = mag;
    }

    // Noise gate: If the absolute loudest frequency is still very quiet, return null
    if (maxMag < 5) return null;

    // The resolution (Hz per array bin)
    const binSize = (sampleRate / 2) / frequencyData.length;

    // Compute Harmonic Product Spectrum
    const hps = new Float32Array(frequencyData.length);
    for (let i = 0; i < hps.length; i++) {
        let product = magnitudes[i];

        // Multiply by harmonics
        for (let h = 2; h <= NUM_HARMONICS; h++) {
            const harmonicIndex = i * h;
            if (harmonicIndex < magnitudes.length) {
                // Critical Fix: If a distant overtone falls below the noise gate (mag = 0),
                // multiplying by 0 destroys the entire reading. Default to 1 instead.
                product *= Math.max(1, magnitudes[harmonicIndex]);
            }
        }
        hps[i] = product;
    }

    // Find the peak in the HPS array within human vocal range
    let maxHps = 0;
    let maxHpsIndex = -1;

    const minBin = Math.floor(70 / binSize); // Bass ~70Hz
    const maxBin = Math.floor(1200 / binSize); // Soprano ~1200Hz

    for (let i = minBin; i <= maxBin; i++) {
        if (hps[i] > maxHps) {
            maxHps = hps[i];
            maxHpsIndex = i;
        }
    }

    // Since we multiplied magnitudes, the maxHps can be extremely large or 0
    if (maxHpsIndex === -1 || maxHps === 0) return null;

    return maxHpsIndex * binSize;
}
