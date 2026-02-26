import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeWav } from './wavEncoder';

export function useVocalRecorder(streamRef: React.MutableRefObject<MediaStream | null>, isStudioMode: boolean = false) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordError, setRecordError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const finalBlobRef = useRef<Blob | null>(null);

    // WAV Recording state
    const audioContextRef = useRef<AudioContext | null>(null);
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

            if (isStudioMode) {
                // --- WAV (Uncompressed PCM) Recording Pipeline ---
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
                audioContextRef.current = audioCtx;

                const source = audioCtx.createMediaStreamSource(streamRef.current);
                mediaStreamSourceRef.current = source;

                // 4096 buffer, 1 input channel, 1 output channel
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = processor;

                pcmDataRef.current = [];
                let hasStarted = false;

                processor.onaudioprocess = (e) => {
                    if (!hasStarted) {
                        hasStarted = true;
                        if (onStart) onStart();
                    }
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Copy data because the buffer is reused
                    pcmDataRef.current.push(new Float32Array(inputData));
                };

                // Connect to start processing (must connect destination for some browsers to trigger inaudioprocess)
                source.connect(processor);
                processor.connect(audioCtx.destination);

                setIsRecording(true);
                return;
            }

            // --- Normal Mode (Opus Compressed MediaRecorder) Pipeline ---
            audioChunksRef.current = [];
            let recorder: MediaRecorder | null = null;
            let finalMimeType = '';

            const typesToTry = ['audio/webm;codecs=opus', 'audio/mp4', ''];
            for (const t of typesToTry) {
                try {
                    const options = t ? { mimeType: t } : undefined;
                    recorder = new MediaRecorder(streamRef.current, options);
                    finalMimeType = t;
                    break;
                } catch (e) {
                    // Try next format
                }
            }

            if (!recorder) {
                throw new Error("No supported recording format found.");
            }

            recorder.onstart = () => {
                if (onStart) onStart();
            };

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, finalMimeType ? { type: finalMimeType } : undefined);
                finalBlobRef.current = audioBlob;
                setIsRecording(false);
                console.log("Recording stopped. Final Blob size:", audioBlob.size, "Type:", finalMimeType);
            };

            recorder.start(1000); // 1s chunks
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err: any) {
            console.error("Failed to start MediaRecorder:", err);
            setRecordError(`녹음 시작 실패: ${err.message || "지원되지 않는 환경입니다."}`);
        }
    }, [streamRef, isStudioMode]);

    const stopRecording = useCallback(() => {
        if (isStudioMode) {
            if (audioContextRef.current && scriptProcessorRef.current && mediaStreamSourceRef.current) {
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

                const sampleRate = audioContextRef.current.sampleRate;
                const wavBlob = encodeWav(flatData, sampleRate, 1);

                finalBlobRef.current = wavBlob;
                console.log("WAV Recording stopped. Final Blob size:", wavBlob.size, "SampleRate:", sampleRate);

                audioContextRef.current.close();
                audioContextRef.current = null;
                scriptProcessorRef.current = null;
                mediaStreamSourceRef.current = null;
                pcmDataRef.current = [];
            }
            setIsRecording(false);
        } else {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
    }, [isStudioMode]);

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
