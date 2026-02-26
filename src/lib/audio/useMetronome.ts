import { useState, useEffect, useRef, useCallback } from 'react';

export type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8';

export function useMetronome() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(120);
    const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');

    const beatsPerMeasure = timeSignature === '6/8' ? 6 : parseInt(timeSignature.split('/')[0]);

    const audioContext = useRef<AudioContext | null>(null);
    const currentNote = useRef(0);
    const nextNoteTime = useRef(0);
    const timerWorker = useRef<number | null>(null);
    const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
    const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

    const initAudio = useCallback(() => {
        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);

    const nextNote = useCallback(() => {
        const secondsPerBeat = 60.0 / bpm;
        nextNoteTime.current += secondsPerBeat;
        currentNote.current = (currentNote.current + 1) % beatsPerMeasure;
    }, [bpm, beatsPerMeasure]);

    const scheduleNote = useCallback((beatNumber: number, time: number) => {
        if (!audioContext.current) return;

        // Create an oscillator
        const osc = audioContext.current.createOscillator();
        const envelope = audioContext.current.createGain();

        osc.connect(envelope);
        envelope.connect(audioContext.current.destination);

        // Accents setup based on classical time signatures
        let freq = 440.0;
        if (beatNumber === 0) {
            freq = 880.0; // Strong downbeat
        } else if (timeSignature === '4/4' && beatNumber === 2) {
            freq = 660.0; // Medium accent on beat 3 of 4/4
        } else if (timeSignature === '6/8' && beatNumber === 3) {
            freq = 660.0; // Medium accent on beat 4 of 6/8
        }

        osc.frequency.value = freq;

        envelope.gain.value = 1;
        envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
    }, [timeSignature]);

    const scheduler = useCallback(() => {
        if (!audioContext.current) return;
        // while there are notes that will need to play before the next interval, schedule them and advance the pointer.
        while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
            scheduleNote(currentNote.current, nextNoteTime.current);
            nextNote();
        }
    }, [nextNote, scheduleNote]);

    useEffect(() => {
        if (isPlaying) {
            initAudio();
            if (audioContext.current?.state === 'suspended') {
                audioContext.current.resume();
            }

            // Reset variables on start
            if (timerWorker.current === null) {
                currentNote.current = 0;
                nextNoteTime.current = (audioContext.current?.currentTime || 0) + 0.05;

                timerWorker.current = window.setInterval(scheduler, lookahead);
            }
        } else {
            if (timerWorker.current !== null) {
                window.clearInterval(timerWorker.current);
                timerWorker.current = null;
            }
        }

        return () => {
            if (timerWorker.current !== null) {
                window.clearInterval(timerWorker.current);
                timerWorker.current = null;
            }
        };
    }, [isPlaying, scheduler, initAudio]);

    const toggle = () => {
        if (!isPlaying) {
            initAudio();
        }
        // when starting from stop, always reset to the leading beat
        currentNote.current = 0;
        setIsPlaying(!isPlaying);
    };

    return { isPlaying, toggle, bpm, setBpm, timeSignature, setTimeSignature };
}
