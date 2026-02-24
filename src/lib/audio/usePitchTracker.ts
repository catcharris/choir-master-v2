import { useState, useEffect, useRef, useCallback } from 'react';
import { autoCorrelate, getPitchData, PitchData } from '../pitch';

export type ListenMode = 'idle' | 'vocal' | 'piano';

export function usePitchTracker(a4: number = 440, onPitchUpdate?: (pitch: PitchData | null) => void) {
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

    useEffect(() => {
        a4Ref.current = a4;
    }, [a4]);

    useEffect(() => {
        modeRef.current = listenMode;
    }, [listenMode]);

    const startListening = useCallback(async (mode: 'vocal' | 'piano' = 'vocal') => {
        if (streamRef.current) {
            setListenMode(mode);
            setPitch(null);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: true, // Enabled to allow 60cm distance capture
                    noiseSuppression: false,
                    channelCount: 1
                }
            });

            streamRef.current = stream;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 4096;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);

            // [FIX] Safari/iOS ignores autoGainControl: true. We must force-amplify the mic manually.
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 3.0; // 300% boost for 60cm distance capture

            source.connect(gainNode);
            gainNode.connect(analyser);

            setListenMode(mode);
            setError(null);
            setPitch(null);

            updatePitch();
        } catch (err) {
            console.error("Microphone access denied or audio engine failed", err);
            setError("마이크 권한을 허용해주세요. (Microphone access required)");
            setListenMode('idle');
        }
    }, []);

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

        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);

        const frequency = autoCorrelate(buffer, audioContextRef.current.sampleRate, modeRef.current as 'vocal' | 'piano');

        if (frequency) {
            if (recentFrequenciesRef.current.length > 0) {
                const lastFreq = recentFrequenciesRef.current[recentFrequenciesRef.current.length - 1];
                const pitchJumpRatio = frequency / lastFreq;
                if (pitchJumpRatio > 1.09 || pitchJumpRatio < 0.91) {
                    recentFrequenciesRef.current = [];
                }
            }

            recentFrequenciesRef.current.push(frequency);
            if (recentFrequenciesRef.current.length > 25) {
                recentFrequenciesRef.current.shift();
            }

            const now = Date.now();
            if (now - lastUpdateTimeRef.current > 100) {
                const sum = recentFrequenciesRef.current.reduce((a, b) => a + b, 0);
                const avgFreq = sum / recentFrequenciesRef.current.length;

                const pitchData = getPitchData(avgFreq, a4Ref.current);
                setPitch(pitchData);
                if (onPitchUpdateRef.current) onPitchUpdateRef.current(pitchData);
                lastUpdateTimeRef.current = now;
            }
        } else {
            recentFrequenciesRef.current = [];
        }

        requestRef.current = requestAnimationFrame(updatePitch);
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return {
        listenMode,
        isListening: listenMode === 'vocal' || listenMode === 'piano',
        startListening,
        stopListening,
        clearPitch: () => setPitch(null),
        pitch,
        error,
        audioContextRef,
        streamRef
    };
}
