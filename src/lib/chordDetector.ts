export type ChordType = 'Major' | 'minor' | 'dim' | 'aug' | 'sus4' | 'sus2' | '7' | 'maj7' | 'm7';

export interface DetectedChord {
    root: string;
    type: ChordType;
    name: string; // e.g. "C Major"
}

// Convert common flat notation to sharps for simplified backend matching
const noteNormalizationMap: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
};

const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function normalizeNote(noteWithOctave: string): string {
    // Extract just the note letter(s) by removing numbers
    let note = noteWithOctave.replace(/[0-9]/g, '');
    if (noteNormalizationMap[note]) {
        note = noteNormalizationMap[note];
    }
    return note;
}

// Interval patterns (semitones from root)
const chordPatterns: Record<string, { type: ChordType, nameSuffix: string }> = {
    '0,4,7': { type: 'Major', nameSuffix: 'Major' },
    '0,3,7': { type: 'minor', nameSuffix: 'minor' },
    '0,3,6': { type: 'dim', nameSuffix: 'dim' },
    '0,4,8': { type: 'aug', nameSuffix: 'aug' },
    '0,5,7': { type: 'sus4', nameSuffix: 'sus4' },
    '0,2,7': { type: 'sus2', nameSuffix: 'sus2' },
    '0,4,7,10': { type: '7', nameSuffix: '7' },
    '0,4,7,11': { type: 'maj7', nameSuffix: 'maj7' },
    '0,3,7,10': { type: 'm7', nameSuffix: 'm7' },
};

/**
 * Detects the musical chord from an array of raw note strings (e.g. ['C4', 'E4', 'G4', 'C5'])
 * Returns null if no recognized chord is found or not enough distinct notes exist.
 */
export function detectChord(rawNotes: string[]): DetectedChord | null {
    if (!rawNotes || rawNotes.length === 0) return null;

    // 1. Normalize and deduplicate notes (ignore octaves)
    const uniqueNotes = Array.from(new Set(rawNotes.map(normalizeNote)));

    // We need at least 3 distinct notes to reliably call it a chord
    if (uniqueNotes.length < 3) return null;

    // 2. Try every note as a potential root note to find a matching interval pattern (inversions)
    for (const rootNote of uniqueNotes) {
        const rootIndex = allNotes.indexOf(rootNote);
        if (rootIndex === -1) continue;

        // Calculate intervals from this assumed root
        const intervals = uniqueNotes.map(note => {
            const noteIndex = allNotes.indexOf(note);
            let interval = noteIndex - rootIndex;
            if (interval < 0) interval += 12; // Wrap around the octave
            return interval;
        });

        // Sort intervals to match our dictionary keys (e.g., '0,4,7')
        intervals.sort((a, b) => a - b);
        const intervalKey = intervals.join(',');

        const match = chordPatterns[intervalKey];
        if (match) {
            // Found a valid chord!
            // Convert C# back to Db aesthetically for certain keys if we wanted to, but C# is fine for now.
            // Let's create a display-friendly root name
            let displayRoot = rootNote;
            if (displayRoot === 'A#') displayRoot = 'Bb';
            if (displayRoot === 'D#') displayRoot = 'Eb';

            return {
                root: displayRoot,
                type: match.type,
                name: `${displayRoot} ${match.nameSuffix}`
            };
        }
    }

    return null; // Unknown cluster of notes
}
