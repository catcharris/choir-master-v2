import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeWav } from './wavEncoder';

export function useVocalRecorder(streamRef: React.MutableRefObject<MediaStream | null>, isStudioMode: boolean = false) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordError, setRecordError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const finalBlobRef = useRef<Blob | null>(null);

    const startRecording = useCallback((onStart?: () => void) => {
        if (!streamRef.current) {
            console.error("Cannot start recording: No active microphone stream.");
            setRecordError("마이크 스트림이 활성화되지 않았습니다.");
            return;
        }

        try {
            finalBlobRef.current = null;
            setRecordError(null);

            // --- Unified Recording Pipeline ---
            audioChunksRef.current = [];
            let recorder: MediaRecorder | null = null;
            let finalMimeType = '';

            // Prioritize uncompressed/lossless formats for Studio Mode, otherwise Opus
            const typesToTry = isStudioMode
                ? ['audio/wav', 'audio/webm;codecs=pcm', 'audio/ogg;codecs=flac', 'audio/webm;codecs=opus', 'audio/mp4', '']
                : ['audio/webm;codecs=opus', 'audio/mp4', ''];

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

            let hasStartedCallback = false;

            recorder.onstart = () => {
                // We do NOT fire onStart here anymore.
                // Safari and some browsers fire onstart instantly before the encoder actually warms up,
                // causing the MR to play 100~300ms too early relative to the actual recorded audio bytes.
            };

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    if (!hasStartedCallback && onStart) {
                        // T=0 Absolute Sync:
                        // This is the VERY FIRST frame of actual audio data leaving the microphone encoder.
                        // Firing onStart() here triggers the Backing Track to play at the exact same physical millisecond.
                        hasStartedCallback = true;
                        onStart();
                    }
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, finalMimeType ? { type: finalMimeType } : undefined);
                finalBlobRef.current = audioBlob;
                setIsRecording(false);
                console.log(`[${isStudioMode ? 'STUDIO' : 'NORMAL'}] Recording stopped. Final Blob size:`, audioBlob.size, "Type:", finalMimeType);
            };

            // 50ms chunks to ensure we catch the very first frame of audio as fast as possible for T=0 sync,
            // instead of waiting 200ms for the first buffer flush.
            recorder.start(50);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err: any) {
            console.error("Failed to start MediaRecorder:", err);
            setRecordError(`녹음 시작 실패: ${err.message || "지원되지 않는 환경입니다."}`);
        }
    }, [streamRef, isStudioMode]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

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
