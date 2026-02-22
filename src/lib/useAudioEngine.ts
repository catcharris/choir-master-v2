// src/lib/useAudioEngine.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { autoCorrelate, getPitchData, PitchData } from './pitch';

export function useAudioEngine() {
    const [isListening, setIsListening] = useState(false);
    const [pitch, setPitch] = useState<PitchData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);

    const startListening = useCallback(async () => {
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
            analyser.fftSize = 2048; // Standard size for vocal pitch resolution
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            setIsListening(true);
            setError(null);

            // Start the pitch detection loop
            updatePitch();
        } catch (err) {
            console.error("Microphone access denied or audio engine failed", err);
            setError("마이크 권한을 허용해주세요. (Microphone access required)");
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
        setIsListening(false);
        setPitch(null);
    }, []);

    const recentFrequenciesRef = useRef<number[]>([]);

    const updatePitch = useCallback(() => {
        if (!analyserRef.current || !audioContextRef.current) return;

        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer); // Get RAW PCM data

        const frequency = autoCorrelate(buffer, audioContextRef.current.sampleRate);

        if (frequency && frequency > 50 && frequency < 2000) { // Human vocal range broadly 50Hz - 2kHz
            // Add to moving average buffer
            recentFrequenciesRef.current.push(frequency);
            if (recentFrequenciesRef.current.length > 10) {
                recentFrequenciesRef.current.shift(); // Keep last 10 frames (~160ms)
            }

            // Calculate moving average
            const sum = recentFrequenciesRef.current.reduce((a, b) => a + b, 0);
            const avgFreq = sum / recentFrequenciesRef.current.length;

            const pitchData = getPitchData(avgFreq);
            setPitch(pitchData);
        } else {
            // If no valid frequency is found, clear the smoothing buffer so the next note doesn't slide
            recentFrequenciesRef.current = [];
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
        isListening,
        startListening,
        stopListening,
        pitch,
        error
    };
}
