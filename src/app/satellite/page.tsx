"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { useSatelliteStreamer } from '@/lib/useSatelliteStreamer';
import { PitchData } from '@/lib/pitch';
import { RecordingProfile } from '@/lib/audio/usePitchTracker';
import { uploadAudioBlob } from '@/lib/uploadAudio';
import { RadioReceiver, AlertCircle, Mic, Video } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useMaestroCamSatellite } from '@/lib/webrtc/useMaestroCamSatellite';
import { fetchLatestBackingTrack } from '@/lib/backingTrackUtils';
import { fetchLatestScores } from '@/lib/scoreUtils';

import { SatelliteConnectForm } from '@/components/satellite/SatelliteConnectForm';
import { TunerDisplay } from '@/components/satellite/TunerDisplay';
import { RecordingControls } from '@/components/satellite/RecordingControls';
import { SatelliteScoreModal } from '@/components/satellite/SatelliteScoreModal';
import { DraggableMaestroCam } from '@/components/satellite/DraggableMaestroCam';

export default function SatellitePage() {
    const [roomId, setRoomId] = useState('');
    const [partName, setPartName] = useState('');
    const [recordingProfile, setRecordingProfile] = useState<RecordingProfile>('part');

    // Phase 8: Backing Track Sync
    const [mrUrl, setMrUrl] = useState<string | null>(null);
    const [isMrReady, setIsMrReady] = useState(false);
    const [mrError, setMrError] = useState<string | null>(null);

    // Score states
    const [scoreUrls, setScoreUrls] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isScoreOpen, setIsScoreOpen] = useState(false);

    // Phase 9: Solo "Homework" Recording Mode
    const [isSoloRecording, setIsSoloRecording] = useState(false);

    // Phase 10: Studio Mode WAV Recording
    const [isStudioMode, setIsStudioMode] = useState(false);

    // --- Media Recorder setup for Phase 3 ---
    // The trick here is that we define our command handler BEFORE we pass it into the streamer hook,
    // but the streamer hook is what actually drives the AudioEngine via broadcastPitch.
    // To solve this cleanly, we extract references to the AudioEngine functions.
    const {
        listenMode, startListening, stopListening, pitch, error,
        isRecording, startRecording, stopRecording, getRecordedBlob,
        preloadBackingTrack, playBackingTrack, stopBackingTrack
    } = useAudioEngine(440, (p) => broadcastPitchRef.current(p), isStudioMode, false, recordingProfile);

    // We use a ref to bypass react cyclic dependency issues when passing broadcastPitch downwards
    const broadcastPitchRef = useRef<(p: PitchData | null) => void>(() => { });

    const handleMasterCommand = useCallback(async (action: string, payload: any) => {
        console.log("Satellite received command:", action, payload);

        if (action === 'PRELOAD_MR') {
            if (payload?.url) {
                setMrUrl(payload.url);
                setIsMrReady(false);
                setMrError(null);
                try {
                    const { success, error } = await preloadBackingTrack(payload.url);
                    if (success) {
                        setIsMrReady(true);
                    } else {
                        setMrError(error || "알 수 없는 다운로드 에러");
                    }
                } catch (e) {
                    console.error("MR Load error:", e);
                    setMrError("MR 다운로드 실패");
                }
            }
        } else if (action === 'START_RECORD') {
            if (isSoloRecording) return; // Prevent master from interrupting active solo take
            startRecording();
            if (isMrReady) {
                playBackingTrack();
            }
        } else if (action === 'STOP_RECORD') {
            if (isSoloRecording) return; // Don't stop if user is recording manually
            stopRecording();
            stopBackingTrack();

            // The recorder takes a few milliseconds to finalize the Blob after stop() is called.
            // We poll quickly for the blob to be ready, then upload.
            let attempts = 0;
            const checkBlobAndUpload = setInterval(async () => {
                attempts++;
                const blob = getRecordedBlob();
                if (blob) {
                    clearInterval(checkBlobAndUpload);
                    console.log("Blob ready! Uploading to Supabase...");
                    const path = await uploadAudioBlob(blob, roomId, partName);
                    if (path) {
                        console.log("Upload successful:", path);
                        toast.success("마스터 녹음이 파일 서버로 전송되었습니다.", { duration: 4000 });
                    }
                } else if (attempts > 50) { // Limit to ~2.5 seconds max wait
                    clearInterval(checkBlobAndUpload);
                    console.error("Timed out waiting for audio blob to finalize.");
                    toast.error("녹음 파일 생성 시간 초과. (네트워크/디바이스 성능 문제)");
                }
            }, 50);

        } else if (action === 'SCORE_SYNC') {
            if (payload?.urls) {
                setScoreUrls(payload.urls);
                setCurrentPage(0);
                setIsScoreOpen(true);
            }
        } else if (action === 'PAGE_SYNC') {
            if (payload?.page !== undefined) {
                setCurrentPage(payload.page);
                setIsScoreOpen(true);
            }
        } else if (action === 'SET_STUDIO_MODE') {
            if (payload?.enabled !== undefined) {
                setIsStudioMode(payload.enabled);
                if (payload.enabled) {
                    toast.success("스튜디오 모드(WAV)가 켜졌습니다.\n고음질 무손실 녹음을 준비합니다.", { duration: 2000 });
                } else {
                    toast("스튜디오 모드가 꺼졌습니다.", { icon: "ℹ️", duration: 2000 });
                }
            }
        } else if (action === 'CLEAR_ROOM') {
            setMrUrl(null);
            setIsMrReady(false);
            setScoreUrls([]);
            setIsScoreOpen(false);
            setIsStudioMode(false);
            toast("마스터가 방을 초기화했습니다.\n(새로운 악보와 반주를 기다립니다)", { icon: "🧹", duration: 3000 });
        }
    }, [startRecording, stopRecording, getRecordedBlob, roomId, partName, preloadBackingTrack, playBackingTrack, stopBackingTrack, isMrReady, isSoloRecording]);

    const { status: wsStatus, connect, disconnect, broadcastPitch } = useSatelliteStreamer(
        roomId,
        partName,
        handleMasterCommand
    );

    // Keep the audio engine's callback up to date with the latest broadcastPitch function
    useEffect(() => {
        broadcastPitchRef.current = broadcastPitch;
    }, [broadcastPitch]);

    const isConnected = wsStatus === 'connected';

    // Phase 14-C: Late Joiner / Offline Master Self-Hydration
    // If a satellite joins the room and the Master is closed/refreshed/offline,
    // the Master won't be able to broadcast PRELOAD_MR. Satellites must fetch it themselves.
    useEffect(() => {
        if (isConnected && roomId) {
            fetchLatestBackingTrack(roomId).then(async url => {
                if (url) {
                    setMrUrl(url);
                    try {
                        const { success, error } = await preloadBackingTrack(url);
                        if (success) {
                            setIsMrReady(true);
                        } else {
                            setMrError(error || "알 수 없는 다운로드 에러");
                        }
                    } catch (e) {
                        console.error("MR Load error on reconnect:", e);
                        setMrError("MR 다운로드 실패");
                    }
                }
            });

            fetchLatestScores(roomId).then(urls => {
                if (urls.length > 0) {
                    setScoreUrls(urls);
                    setCurrentPage(0);
                }
            });
        }
    }, [isConnected, roomId, preloadBackingTrack]);

    // Phase 13: Maestro Cam 1:N WebRTC Receiver (Global)
    // Passed `isConnected` to ensure we don't spam Supabase during Room ID typing
    // and only request the stream after the user has officially joined.
    const { maestroStream } = useMaestroCamSatellite(roomId, isConnected);
    const [isPipVisible, setIsPipVisible] = useState(true);

    // Auto-show PIP if a new stream comes in
    useEffect(() => {
        if (maestroStream) {
            setIsPipVisible(true);
        }
    }, [maestroStream]);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim() || !partName.trim()) return;

        // Safari/iOS Mobile Autoplay Hack:
        // We now unlock the AudioContext globally during this user gesture by starting the mic.
        // The Web Audio API (AudioBufferSourceNode) bypasses strict HTMLMediaElement muting.

        connect();
        startListening('vocal');
    };

    const handleDisconnect = () => {
        disconnect();
        stopListening();
    };

    const handleSoloPracticeToggle = () => {
        if (!isSoloRecording) {
            // Only start MR playback and visual pitch tracking. No actual recording blob is generated.
            if (isMrReady) {
                playBackingTrack();
            }
            setIsSoloRecording(true);
            toast.success("🎵 혼자 연습을 시작합니다. (서버 전송 안 됨)", { duration: 3000 });
        } else {
            stopBackingTrack();
            setIsSoloRecording(false);
            toast.success("혼자 연습을 종료했습니다.", { duration: 3000 });
        }
    };

    if (!isConnected) {
        return (
            <SatelliteConnectForm
                roomId={roomId}
                setRoomId={setRoomId}
                partName={partName}
                setPartName={setPartName}
                onConnect={handleConnect}
                isConnecting={wsStatus === 'connecting'}
                error={error}
            />
        );
    }

    return (
        <main className="no-swipe-back h-[100dvh] w-full fixed inset-0 overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center p-6 sm:p-8">
            {/* Cinematic Background Glows */}
            <div className="absolute top-0 right-0 w-[120vw] max-w-xl h-80 bg-emerald-600/10 blur-[100px] rounded-[100%] pointer-events-none -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[120vw] max-w-xl h-80 bg-indigo-600/15 blur-[100px] rounded-[100%] pointer-events-none translate-y-1/2 -translate-x-1/4" />

            {/* Container */}
            <div className="relative z-10 w-full h-full max-w-md md:max-w-2xl lg:max-w-4xl flex flex-col">

                {/* Header (Status & Room Info) */}
                <div className={`flex-shrink-0 flex flex-col items-center pb-6 min-h-[140px] transition-all duration-500 ${maestroStream ? 'pt-64 sm:pt-72' : 'pt-2'}`}>
                    <div key={isRecording ? 'rec' : 'idle'} className={`px-5 py-2.5 rounded-2xl flex items-center gap-2.5 text-sm font-bold shadow-lg shadow-black/20 border ${isRecording ? 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'}`}>
                        {isRecording ? <Mic size={18} className="animate-bounce" /> : <RadioReceiver size={18} />}
                        {isRecording ? '마스터 동기화 녹음 중' : '데이터 스트리밍 대기 중'}
                    </div>

                    <div className="text-center mt-6 flex-1 flex flex-col justify-end">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-slate-800 text-slate-400 uppercase">Room</span>
                            <span className="text-sm font-bold text-slate-300">{roomId}</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">{partName}</h1>
                    </div>

                    {!isRecording && mrUrl && !mrError && (
                        <div className={`mt-4 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs sm:text-sm shadow-lg whitespace-nowrap border ${isMrReady ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-blue-500/10' : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400 shadow-yellow-500/10 animate-pulse'}`}>
                            {isMrReady ? 'MR 반주 장전 완료 (자동 재생 지원)' : 'MR 반주 다운로드 중...'}
                        </div>
                    )}
                    {!isRecording && mrError && (
                        <div className="mt-4 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-red-500/10 whitespace-nowrap break-words text-center max-w-full">
                            <AlertCircle size={16} className="shrink-0" />
                            <span className="truncate">{mrError}</span>
                        </div>
                    )}
                </div>

                {/* Center (Tuner Component) */}
                <TunerDisplay pitch={pitch} isRecording={isRecording} />

                {/* Bottom (Action Buttons) */}
                <RecordingControls
                    isRecording={isRecording}
                    isMrReady={isMrReady}
                    isSoloRecording={isSoloRecording}
                    recordingProfile={recordingProfile}
                    setRecordingProfile={setRecordingProfile}
                    onDisconnect={handleDisconnect}
                    onSoloRecordToggle={handleSoloPracticeToggle}
                    hasScores={scoreUrls.length > 0}
                    onOpenScore={() => setIsScoreOpen(true)}
                />

            </div>

            <SatelliteScoreModal
                roomId={roomId}
                isOpen={isScoreOpen}
                scoreUrls={scoreUrls}
                currentPage={currentPage}
                onClose={() => setIsScoreOpen(false)}
            />

            {/* Maestro Cam PIP Widget (Draggable & Optional) */}
            {maestroStream && isPipVisible && (
                <DraggableMaestroCam
                    stream={maestroStream}
                    onClose={() => setIsPipVisible(false)}
                />
            )}

            {maestroStream && !isPipVisible && (
                <button
                    onClick={() => setIsPipVisible(true)}
                    className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-indigo-500/90 hover:bg-indigo-400 text-white font-bold rounded-full backdrop-blur-md shadow-xl border border-white/20 transition-all active:scale-95"
                >
                    <Video size={16} />
                    <span className="text-xs">지휘자 뷰 보기</span>
                </button>
            )}

            {/* iOS Bottom Navigation Bar Spacer for seamless scrolling feel */}
            <div className="h-6 shrink-0 w-full" />
        </main>
    );
}
