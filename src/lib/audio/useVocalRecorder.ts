import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeWav } from './wavEncoder';
import toast from 'react-hot-toast';

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

    // Tracks the exact physical delay between "Record Command" and "Microphone Data Received"
    const warmupOffsetRef = useRef<number>(0);

    const startRecording = useCallback((onStart?: () => void, delaySeconds: number = 0) => {
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
            const targetWebAudioTime = audioCtx.currentTime + delaySeconds;
            warmupOffsetRef.current = 0;

            processor.onaudioprocess = (e) => {
                // Phase 17/18: V2.0 Sample-Accurate T=0 Native Sync
                // The buffer size is 4096. At 48kHz, this chunk represents ~85.3ms of audio.
                // We must precisely splice the very first chunk so the resulting array begins
                // at the EXACT nanosecond of `targetWebAudioTime`.
                const inputData = e.inputBuffer.getChannelData(0);

                if (audioCtx.currentTime < targetWebAudioTime) {
                    // This entire chunk happened before our target start time. Drop it.
                    return;
                }

                if (isFirstFrame) {
                    isFirstFrame = false;

                    // The currentTime points to the END of the audio chunk that just finished processing.
                    const exactChunkDuration = inputData.length / audioCtx.sampleRate;
                    const chunkStartTime = audioCtx.currentTime - exactChunkDuration;

                    // If the chunk started before our target time, it contains some garbage audio we need to trim.
                    if (chunkStartTime < targetWebAudioTime) {
                        const discardSeconds = targetWebAudioTime - chunkStartTime;
                        const discardSamples = Math.floor(discardSeconds * audioCtx.sampleRate);

                        console.log(`[SYNC T=0] Cutting ${discardSamples} samples (${(discardSeconds * 1000).toFixed(2)}ms) from initial hardware buffer to achieve sample-accurate T=0 alignment.`);

                        if (discardSamples < inputData.length) {
                            const trimmedData = inputData.slice(discardSamples);
                            pcmDataRef.current.push(new Float32Array(trimmedData));
                        }
                    } else {
                        // Rare case: The chunk started EXACTLY at or after the target time.
                        pcmDataRef.current.push(new Float32Array(inputData));
                    }

                    // Hardware Latency Detection (Checking how late this chunk actually arrived vs when it was scheduled)
                    const hardwareDelay = audioCtx.currentTime - targetWebAudioTime;
                    if (hardwareDelay > 0.25) {
                        toast.error(
                            "오디오 엔진 초기화가 매우 지연되었습니다. 백그라운드 앱을 종료해 주세요.",
                            { duration: 6000 }
                        );
                    }

                    if (onStart) onStart();
                } else {
                    // Subsequent chunks are kept 100%
                    pcmDataRef.current.push(new Float32Array(inputData));
                }
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

            // Apply the T=0 Native Sync warmup offset by shifting the PCM data array
            // We trim off the silence/delay at the beginning of the buffer exactly matching the hardware wakeup gap
            const trimSamples = Math.floor(warmupOffsetRef.current * sampleRate);
            let finalPcmData = flatData;

            if (trimSamples > 0 && trimSamples < flatData.length) {
                console.log(`[SYNC] Trimming ${trimSamples} hardware latency warmup samples from beginning of blob.`);
                finalPcmData = flatData.slice(trimSamples);
            }

            // encodeWav outputs standard 16-bit PCM WAV which is universally supported
            const wavBlob = encodeWav(finalPcmData, sampleRate, 1);

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
