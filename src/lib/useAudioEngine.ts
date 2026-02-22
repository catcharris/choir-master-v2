// src/lib/useAudioEngine.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitchHPS, getPitchData, PitchData } from './pitch';

export function useAudioEngine(a4: number = 440) {
    const [isListening, setIsListening] = useState(false);
    const [pitch, setPitch] = useState<PitchData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);
    const a4Ref = useRef(a4);

    // Keep ref synced so we don't have to recreate the update loop
    useEffect(() => {
        a4Ref.current = a4;
    }, [a4]);

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
            analyser.fftSize = 8192; // High resolution required for HPS pitch tracking
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

        // Use frequency-domain data for Harmonic Product Spectrum (HPS)
        // Size is half of fftSize
        const buffer = new Float32Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getFloatFrequencyData(buffer);

        const frequency = detectPitchHPS(buffer, audioContextRef.current.sampleRate, analyserRef.current.fftSize);

        if (frequency && frequency > 70 && frequency < 1200) { // Practical human vocal range
            // Add to moving average buffer
            recentFrequenciesRef.current.push(frequency);
            if (recentFrequenciesRef.current.length > 5) { // Shorter buffer because HPS is inherently more stable than autocorrelation
                recentFrequenciesRef.current.shift();
            }

            // Calculate moving average
            const sum = recentFrequenciesRef.current.reduce((a, b) => a + b, 0);
            const avgFreq = sum / recentFrequenciesRef.current.length;

            const pitchData = getPitchData(avgFreq, a4Ref.current);
            setPitch(pitchData);
        } else {
            // If no valid frequency is found, clear the smoothing buffer
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
