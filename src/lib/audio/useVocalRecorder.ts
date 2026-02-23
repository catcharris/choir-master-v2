import { useState, useRef, useCallback, useEffect } from 'react';

export function useVocalRecorder(streamRef: React.MutableRefObject<MediaStream | null>) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordError, setRecordError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const finalBlobRef = useRef<Blob | null>(null);

    const startRecording = useCallback(() => {
        if (!streamRef.current) {
            console.error("Cannot start recording: No active microphone stream.");
            setRecordError("마이크 스트림이 활성화되지 않았습니다.");
            return;
        }

        try {
            audioChunksRef.current = [];
            finalBlobRef.current = null;
            setRecordError(null);

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
                    // Try next
                }
            }

            if (!recorder) {
                throw new Error("No supported recording format found.");
            }

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
    }, [streamRef]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const getRecordedBlob = useCallback(() => {
        return finalBlobRef.current;
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
        recordError
    };
}
