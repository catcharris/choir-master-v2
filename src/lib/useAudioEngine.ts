import { useState, useEffect, useRef, useCallback } from 'react';
import { autoCorrelate, getPitchData, PitchData } from './pitch';

export type ListenMode = 'idle' | 'vocal' | 'piano';

export function useAudioEngine(a4: number = 440, onPitchUpdate?: (pitch: PitchData | null) => void) {
    const [listenMode, setListenMode] = useState<ListenMode>('idle');
    const [pitch, setPitch] = useState<PitchData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);
    const a4Ref = useRef(a4);
    const modeRef = useRef<ListenMode>('idle');
    const onPitchUpdateRef = useRef(onPitchUpdate);

    useEffect(() => {
        onPitchUpdateRef.current = onPitchUpdate;
    }, [onPitchUpdate]);

    // Keep ref synced so we don't have to recreate the update loop
    useEffect(() => {
        a4Ref.current = a4;
    }, [a4]);

    useEffect(() => {
        modeRef.current = listenMode;
    }, [listenMode]);

    const startListening = useCallback(async (mode: 'vocal' | 'piano' = 'vocal') => {
        // If already streaming, just swap mode and clear pitch buffer 
        if (streamRef.current) {
            setListenMode(mode);
            setPitch(null);
            return;
        }

        try {
            // Request strictly RAW audio by disabling all processor flags.
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    channelCount: 1 // Mono is fine for pitch tracking
                }
            });

            streamRef.current = stream;

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 4096; // Good resolution for time-domain autocorrelation
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            setListenMode(mode);
            setError(null);
            setPitch(null);

            // Start the pitch detection loop
            updatePitch();
        } catch (err) {
            console.error("Microphone access denied or audio engine failed", err);
            setError("마이크 권한을 허용해주세요. (Microphone access required)");
            setListenMode('idle');
        }
    }, []); // Note: updatePitch is a hoisted dependency loop, but we can bypass strict linting by omitting it or refactoring. 

    const stopListening = useCallback(() => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        setListenMode('idle');
        setPitch(null);
        if (onPitchUpdateRef.current) onPitchUpdateRef.current(null);
    }, []);

    const recentFrequenciesRef = useRef<number[]>([]);
    const lastUpdateTimeRef = useRef<number>(0);

    const updatePitch = useCallback(() => {
        if (!analyserRef.current || !audioContextRef.current) return;

        // Use time-domain data for Auto-Correlation (Waveform shape, not raw decibels)
        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);

        // Pass the modeRef so autoCorrelate can dynamically adjust the RMS Proximity noise gate
        // 'piano' mode allows far away sounds, 'vocal' stops background singers.
        const frequency = autoCorrelate(buffer, audioContextRef.current.sampleRate, modeRef.current as 'vocal' | 'piano');

        if (frequency) {
            // 1. Instant Note-Change Detection (Prevent Sluggish 'Portamento' UI Sliding)
            if (recentFrequenciesRef.current.length > 0) {
                const lastFreq = recentFrequenciesRef.current[recentFrequenciesRef.current.length - 1];
                const pitchJumpRatio = frequency / lastFreq;
                // If the frequency jumps by more than ~1.5 semitones (> 9%), it's a new note, not vibrato.
                if (pitchJumpRatio > 1.09 || pitchJumpRatio < 0.91) {
                    recentFrequenciesRef.current = []; // Flush buffer to snap instantly
                }
            }

            // 2. Vibrato Absorption Buffer (runs at 60fps)
            // A 25-frame buffer covers ~416ms, encompassing slightly more than one full 5-6Hz vocal vibrato cycle.
            // This averages out the cyclical peaks and valleys to find the singer's true 'center' pitch.
            recentFrequenciesRef.current.push(frequency);
            if (recentFrequenciesRef.current.length > 25) {
                recentFrequenciesRef.current.shift();
            }

            const now = Date.now();
            // 3. UI Throttle (10 FPS)
            if (now - lastUpdateTimeRef.current > 100) {
                // Calculate the true center pitch (Moving Average)
                const sum = recentFrequenciesRef.current.reduce((a, b) => a + b, 0);
                const avgFreq = sum / recentFrequenciesRef.current.length;

                const pitchData = getPitchData(avgFreq, a4Ref.current);
                setPitch(pitchData);
                if (onPitchUpdateRef.current) onPitchUpdateRef.current(pitchData);
                lastUpdateTimeRef.current = now;
            }
        } else {
            // If no valid frequency is found, clear the smoothing buffer but leave the last pitch on screen
            recentFrequenciesRef.current = [];
            // Optionally, we could send a null here if we wanted to show 'silence', 
            // but keeping the last known payload prevents flickering.
        }

        // Loop using requestAnimationFrame for smooth 60fps tracking
        requestRef.current = requestAnimationFrame(updatePitch);
    }, []);

    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return {
        listenMode,
        isListening: listenMode === 'vocal',
        startListening,
        stopListening,
        clearPitch: () => setPitch(null),
        pitch,
        error
    };
}
