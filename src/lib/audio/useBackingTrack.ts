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

    const playBackingTrack = useCallback((initialVolume: number = 1, delaySeconds: number = 0) => {
        if (!audioContextRef.current || !mrBufferRef.current) {
            console.error("Cannot play MR: AudioContext or mrBuffer is null");
            // @ts-ignore
            if (typeof window !== 'undefined' && window.toast) window.toast.error("MR Error: Buffer or Context is null");
            return false;
        }

        try {
            // Safari explicitly suspends context when not actively emitting sound.
            // Aggressively attempt to wake it up right before injecting the new node.
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(e => console.error("Context resume failed", e));
            }

            if (mrSourceRef.current) {
                try { mrSourceRef.current.stop(); } catch (e) { /* ignore */ }
                mrSourceRef.current.disconnect();
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = mrBufferRef.current;

            const gainNode = audioContextRef.current.createGain();
            console.log(`Setting MR Volume to: ${initialVolume}`);
            gainNode.gain.value = initialVolume;
            mrGainRef.current = gainNode;

            source.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);

            // Phase 17: Scheduled Sync Playback
            if (delaySeconds <= 0) {
                source.start(0); // Fire instantly and powerfully
                console.log("MR track PLAYING instantly.");
                if (typeof window !== 'undefined' && (window as any).toast) (window as any).toast(`MR 즉시 재생 (Vol:${initialVolume})`, { icon: '🔊', duration: 3000 });
            } else {
                const startTime = audioContextRef.current.currentTime + delaySeconds;
                source.start(startTime);
                console.log(`MR track SCHEDULED for ${delaySeconds}s in the future.`);
                if (typeof window !== 'undefined' && (window as any).toast) (window as any).toast(`MR 예약됨: ${delaySeconds.toFixed(1)}초 뒤 (Vol:${initialVolume})`, { icon: '⏱️', duration: 3000 });
            }

            mrSourceRef.current = source;
            return true;
        } catch (err: any) {
            console.error("Failed to play backing track:", err);
            if (typeof window !== 'undefined' && (window as any).toast) (window as any).toast.error(`MR AudioContext 에러: ${err.message}`, { duration: 5000 });
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
