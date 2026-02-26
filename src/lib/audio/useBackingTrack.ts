import { useRef, useCallback, useEffect } from 'react';

export function useBackingTrack(audioContextRef: React.MutableRefObject<AudioContext | null>) {
    const mrBufferRef = useRef<AudioBuffer | null>(null);
    const mrSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const mrGainRef = useRef<GainNode | null>(null);

    const setBackingTrackVolume = useCallback((volume: number) => {
        if (mrGainRef.current && audioContextRef.current) {
            mrGainRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.05);
        }
    }, [audioContextRef]);

    const preloadBackingTrack = useCallback(async (url: string): Promise<{ success: boolean; error?: string }> => {
        if (!audioContextRef.current) {
            console.log("AudioContext not ready for MR preload. Self-hydrating now...");
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioCtx;
            } catch (e) {
                console.warn("Failed to self-hydrate AudioContext:", e);
                return { success: false, error: "AudioContext 셋업 실패" };
            }
        }
        try {
            console.log("Fetching MR track for Web Audio playback:", url);
            const response = await fetch(url);
            if (!response.ok) {
                return { success: false, error: `네트워크 응답 오류: ${response.status} ${response.statusText}` };
            }
            const arrayBuffer = await response.arrayBuffer();

            // Use the fallback Promise approach for older Safari iOS compatibility
            return new Promise((resolve) => {
                audioContextRef.current!.decodeAudioData(
                    arrayBuffer,
                    (buffer) => {
                        mrBufferRef.current = buffer;
                        console.log("MR track successfully decoded to AudioBuffer!");
                        resolve({ success: true });
                    },
                    (err) => {
                        console.error("decodeAudioData failed:", err);
                        resolve({ success: false, error: `디코딩 에러: ${err?.message || '지원하지 않는 포맷'}` });
                    }
                );
            });
        } catch (err: any) {
            console.error("Failed to fetch MR track:", err);
            return { success: false, error: `CORS 또는 네트워크 에러: ${err.message}` };
        }
    }, [audioContextRef]);

    const playBackingTrack = useCallback(() => {
        if (!audioContextRef.current || !mrBufferRef.current) return false;

        try {
            // Safari workaround: If context was auto-created in a useEffect, it will be suspended.
            // We must resume it during this user-initiated playback event.
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }

            if (mrSourceRef.current) {
                try { mrSourceRef.current.stop(); } catch (e) { }
                mrSourceRef.current.disconnect();
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = mrBufferRef.current;

            const gainNode = audioContextRef.current.createGain();
            mrGainRef.current = gainNode;

            source.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);
            source.start(0);

            mrSourceRef.current = source;
            return true;
        } catch (err) {
            console.error("Failed to play backing track:", err);
            return false;
        }
    }, [audioContextRef]);

    const stopBackingTrack = useCallback(() => {
        if (mrSourceRef.current) {
            try { mrSourceRef.current.stop(); } catch (e) { }
            mrSourceRef.current.disconnect();
            mrSourceRef.current = null;
        }
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopBackingTrack();
        };
    }, [stopBackingTrack]);

    return {
        preloadBackingTrack,
        playBackingTrack,
        stopBackingTrack,
        setBackingTrackVolume
    };
}
