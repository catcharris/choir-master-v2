import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeWav } from './wavEncoder';

export function useVocalRecorder(
    streamRef: React.MutableRefObject<MediaStream | null>,
    globalAudioContextRef: React.MutableRefObject<AudioContext | null>,
    isStudioMode: boolean = false
) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordError, setRecordError] = useState<string | null>(null);

    const finalBlobRef = useRef<Blob | null>(null);

    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const pcmDataRef = useRef<Float32Array[]>([]);

    const startRecording = useCallback((onStart?: () => void) => {
        if (!streamRef.current) {
            console.error("Cannot start recording: No active microphone stream.");
            setRecordError("마이크 스트림이 활성화되지 않았습니다.");
            return;
        }

        try {
            finalBlobRef.current = null;
            setRecordError(null);

            if (!globalAudioContextRef.current) {
                console.error("No global AudioContext available.");
                setRecordError("오디오 엔진이 초기화되지 않았습니다.");
                return;
            }

            const audioCtx = globalAudioContextRef.current;

            // If the context is suspended (browser policy), wake it up
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const source = audioCtx.createMediaStreamSource(streamRef.current);
            mediaStreamSourceRef.current = source;

            // 4096 buffer, 1 input channel, 1 output channel
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            pcmDataRef.current = [];

            let isFirstFrame = true;

            processor.onaudioprocess = (e) => {
                if (isFirstFrame && onStart) {
                    isFirstFrame = false;
                    onStart(); // Trigger MR playback on the exact physical millisecond the mic yields data
                }
                const inputData = e.inputBuffer.getChannelData(0);
                // Copy data because the buffer is reused
                pcmDataRef.current.push(new Float32Array(inputData));
            };

            // Connect to start processing (must connect destination for some browsers to trigger inaudioprocess)
            source.connect(processor);
            processor.connect(audioCtx.destination);

            setIsRecording(true);
        } catch (err: any) {
            console.error("Failed to start WebAudio Recorder:", err);
            setRecordError(`녹음 시작 실패: ${err.message || "지원되지 않는 환경입니다."}`);
        }
    }, [streamRef, isStudioMode]);

    const stopRecording = useCallback(() => {
        if (scriptProcessorRef.current && mediaStreamSourceRef.current && globalAudioContextRef.current) {
            scriptProcessorRef.current.disconnect();
            mediaStreamSourceRef.current.disconnect();

            // Flatten PCM chunks
            const totalLength = pcmDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
            const flatData = new Float32Array(totalLength);
            let offset = 0;
            for (let chunk of pcmDataRef.current) {
                flatData.set(chunk, offset);
                offset += chunk.length;
            }

            const sampleRate = globalAudioContextRef.current.sampleRate;
            // encodeWav outputs standard 16-bit PCM WAV which is universally supported
            const wavBlob = encodeWav(flatData, sampleRate, 1);

            finalBlobRef.current = wavBlob;
            console.log(`[${isStudioMode ? 'STUDIO' : 'NORMAL'}] WAV Recording stopped. Final Blob size:`, wavBlob.size, "SampleRate:", sampleRate);

            // Do NOT close the context here anymore, as it's shared globally with the PitchTracker
            scriptProcessorRef.current = null;
            mediaStreamSourceRef.current = null;
            pcmDataRef.current = [];
        }
        setIsRecording(false);
    }, [isStudioMode, globalAudioContextRef]);

    const getRecordedBlob = useCallback(() => {
        return finalBlobRef.current;
    }, []);

    const clearRecordedBlob = useCallback(() => {
        finalBlobRef.current = null;
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, [stopRecording]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        getRecordedBlob,
        clearRecordedBlob,
        recordError
    };
}
