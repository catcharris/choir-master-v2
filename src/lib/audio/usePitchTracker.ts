import { useState, useEffect, useRef, useCallback } from 'react';
import { autoCorrelate, getPitchData, PitchData } from '../pitch';

export type ListenMode = 'idle' | 'vocal' | 'piano';
export type RecordingProfile = 'part' | 'quartet' | 'solo';

export function usePitchTracker(
    a4: number = 440,
    onPitchUpdate?: (pitch: PitchData | null) => void,
    customRmsThreshold?: number,
    recordingProfile: RecordingProfile = 'part'
) {
    const [listenMode, setListenMode] = useState<ListenMode>('idle');
    const [pitch, setPitch] = useState<PitchData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processedStreamRef = useRef<MediaStream | null>(null); // State for the amplified recording stream
    const gainNodeRef = useRef<GainNode | null>(null); // To dynamically adjust gain
    const requestRef = useRef<number | null>(null);
    const a4Ref = useRef(a4);
    const modeRef = useRef<ListenMode>('idle');
    const onPitchUpdateRef = useRef(onPitchUpdate);
    const customRmsThresholdRef = useRef(customRmsThreshold);
    const recordingProfileRef = useRef<RecordingProfile>(recordingProfile);

    useEffect(() => {
        onPitchUpdateRef.current = onPitchUpdate;
    }, [onPitchUpdate]);

    useEffect(() => {
        customRmsThresholdRef.current = customRmsThreshold;
        recordingProfileRef.current = recordingProfile;

        // Dynamically adjust hardware gain if the engine is already running
        if (gainNodeRef.current && audioContextRef.current) {
            let targetGain = 3.0; // default for 'part'

            if (customRmsThreshold !== undefined) {
                // Tuner Close-Mic Mode strictly overrides all profiles
                targetGain = 0.6;
            } else {
                if (recordingProfile === 'part') targetGain = 3.0;
                if (recordingProfile === 'quartet') targetGain = 1.5;
                if (recordingProfile === 'solo') targetGain = 0.7;
            }

            gainNodeRef.current.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.1);
        }
    }, [customRmsThreshold, recordingProfile]);

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

            let initialGain = 3.0;
            if (customRmsThresholdRef.current !== undefined) {
                initialGain = 0.6; // Tuner tight close-mic
            } else {
                if (recordingProfileRef.current === 'part') initialGain = 3.0;
                if (recordingProfileRef.current === 'quartet') initialGain = 1.5;
                if (recordingProfileRef.current === 'solo') initialGain = 0.7;
            }

            gainNode.gain.value = initialGain;
            gainNodeRef.current = gainNode;

            // Compressor to prevent distortion on fff (loud singing)
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -24; // start compressing at -24dB
            compressor.knee.value = 30; // smooth compression onset
            compressor.ratio.value = 12; // hard squeeze (12:1) when above threshold
            compressor.attack.value = 0.003; // clamp loud noises almost instantly
            compressor.release.value = 0.25; // release smoothly

            const destinationNode = audioCtx.createMediaStreamDestination();
            destinationNode.channelCount = 1; // Force true Mono output instead of Stereo with left-only signal

            // Clean, straightforward routing to avoid Safari WebAudio crashes
            source.connect(gainNode);
            gainNode.connect(compressor);
            compressor.connect(analyser); // Analyser gets compressed, pitch-stable signal
            compressor.connect(destinationNode); // Recorder gets clean, compressed audio

            processedStreamRef.current = destinationNode.stream;

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

        if (processedStreamRef.current) {
            processedStreamRef.current.getTracks().forEach(track => track.stop());
            processedStreamRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        gainNodeRef.current = null;
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

        let actualThreshold = customRmsThresholdRef.current;
        if (actualThreshold === undefined) {
            if (recordingProfileRef.current === 'solo') actualThreshold = 0.01;
            if (recordingProfileRef.current === 'quartet') actualThreshold = 0.005;
        }

        const result = autoCorrelate(buffer, audioContextRef.current.sampleRate, modeRef.current as 'vocal' | 'piano', actualThreshold);

        if (result && result.frequency) {
            const { frequency, rms } = result;

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

                const pitchData = getPitchData(avgFreq, rms, a4Ref.current);
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
        streamRef,
        processedStreamRef
    };
}
