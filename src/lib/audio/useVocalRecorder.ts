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
                console.log(`[${isStudioMode ? 'STUDIO' : 'NORMAL'}] Recording stopped. Final Blob size:`, audioBlob.size, "Type:", finalMimeType);
            };

            recorder.start(200); // 200ms chunks to prevent massive memory spikes at the end of long recordings
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
