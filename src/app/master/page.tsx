"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useMasterSubscriber } from '@/lib/useMasterSubscriber';
import { LayoutGrid, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMaestroCamMaster } from '@/lib/webrtc/useMaestroCamMaster';
import { fetchRoomTracks, PracticeTrack } from '@/lib/storageUtils';
import { uploadBackingTrack, fetchLatestBackingTrack, fetchAllRoomBackingTracks, importYoutubeAsBackingTrack } from '@/lib/backingTrackUtils';
import { uploadScoreImages, fetchLatestScores } from '@/lib/scoreUtils';
import { detectChord } from '@/lib/chordDetector';
import { clearRoomData } from '@/lib/clearRoomData';
import { useServerTimeOffset } from '@/lib/useServerTimeOffset';
import { useBackingTrack } from '@/lib/audio/useBackingTrack';

import { MasterHeader } from '@/components/master/MasterHeader';
import { SatelliteGrid, SatelliteData } from '@/components/master/SatelliteGrid';
import { RecordingsDrawer } from '@/components/master/RecordingsDrawer';
import { MasterScoreModal } from '@/components/master/MasterScoreModal';
import { PracticeListBookmark } from '@/components/master/PracticeListBookmark';
import { ManagerConsole } from '@/components/master/ManagerConsole';
import { Presentation, LogOut, Trash2 } from 'lucide-react';

export default function MasterPage() {
    const [roomId, setRoomId] = useState('');
    const [isRecordingMaster, setIsRecordingMaster] = useState(false);

    // Phase 17: Scheduled Sync Playback
    const { offset, isSynced } = useServerTimeOffset();
    const [syncCountdownTarget, setSyncCountdownTarget] = useState<number | null>(null);
    const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

    // WebAudio context for perfectly synced MR playback
    const audioContextRef = useRef<AudioContext | null>(null);
    const {
        preloadBackingTrack,
        playBackingTrack,
        stopBackingTrack,
        setBackingTrackVolume
    } = useBackingTrack(audioContextRef);

    const [masterPage, setMasterPage] = useState(0);
    const handleMasterCommand = useCallback((action: string, payload: any) => {
        if (action === 'SCORE_SYNC' && payload?.urls) {
            setScoreUrls(payload.urls);
            toast.success(`다른 마스터 기기에서 악보 ${payload.urls.length}장을 업로드했습니다.`, { duration: 1500 });
        } else if (action === 'PRELOAD_MR' && payload?.url) {
            setMrUrl(payload.url);
            toast.success('다른 마스터 기기에서 MR을 업로드했습니다.', { duration: 1500 });
        } else if (action === 'SET_STUDIO_MODE' && payload?.enabled !== undefined) {
            setIsStudioMode(payload.enabled);
        } else if (action === 'START_RECORD') {
            setIsRecordingMaster(true);
            if (mrUrl) playBackingTrack(isMrMutedRef.current ? 0 : 1);
            toast('다른 마스터 기기에서 전체 녹음을 시작했습니다.', { icon: '🔴', duration: 1500 });
        } else if (action === 'START_RECORD_SCHEDULED' && payload?.targetTime) {
            setSyncCountdownTarget(payload.targetTime);
        } else if (action === 'STOP_RECORD') {
            setSyncCountdownTarget(null);
            setIsRecordingMaster(false);
            stopBackingTrack();
            toast.success('다른 마스터 기기에서 전체 녹음을 종료했습니다.', { duration: 1500 });
        } else if (action === 'PAGE_SYNC' && payload?.page !== undefined) {
            setMasterPage(payload.page);
        } else if (action === 'ALL_LYRICS_SYNC' && payload?.allLyrics !== undefined) {
            setAllLyrics(payload.allLyrics);
            toast.success('다른 기기에서 전체 자막을 전송했습니다.', { duration: 1500 });
        } else if (action === 'CLEAR_ROOM') {
            setScoreUrls([]);
            setMrUrl(null);
            setAllLyrics([]);
            setIsStudioMode(false);
            setIsRecordingMaster(false);
            setIsScoreModalOpen(false);
            setMasterPage(0);
            toast("다른 기기에서 데이터를 초기화했습니다.", { icon: "🧹", duration: 1500 });
        }
    }, []);

    const { status: wsStatus, satellites, connect, disconnect, broadcastCommand } = useMasterSubscriber(roomId, handleMasterCommand);

    // Phase 4: Recordings Explorer States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [tracks, setTracks] = useState<PracticeTrack[]>([]);
    const [isLoadingTracks, setIsLoadingTracks] = useState(false);

    // Phase 11: 3-Tier Mode (Conductor vs Manager)
    const [viewMode, setViewMode] = useState<'conductor' | 'manager'>('conductor');
    const [isStudioMode, setIsStudioMode] = useState(false);

    // Phase 8: Backing Track (MR) Sync
    const [isUploadingMR, setIsUploadingMR] = useState(false);
    const [isImportingYoutube, setIsImportingYoutube] = useState(false);
    const [mrUrl, setMrUrl] = useState<string | null>(null);
    const [mrHistory, setMrHistory] = useState<{ url: string, timestamp: number }[]>([]);

    // Phase 10: Score Sync Sync
    const [isUploadingScore, setIsUploadingScore] = useState(false);
    const [scoreUrls, setScoreUrls] = useState<string[]>([]);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

    const [allLyrics, setAllLyrics] = useState<string[]>([]);

    // Hardware Audio Sample Rate Display
    const [sampleRate, setSampleRate] = useState<number | undefined>(undefined);

    // Mute MR Toggle
    const [isMrMuted, setIsMrMuted] = useState(false);
    const isMrMutedRef = useRef(isMrMuted);
    useEffect(() => {
        isMrMutedRef.current = isMrMuted;
    }, [isMrMuted]);

    const handleToggleMrMute = () => {
        setIsMrMuted(prev => {
            const next = !prev;
            setBackingTrackVolume(next ? 0 : 1);
            return next;
        });
    };

    // Phase 13: Maestro Cam 1:N WebRTC Master
    const { isCamActive, startCamera, stopCamera, stream } = useMaestroCamMaster(roomId);

    // Phase 15: Room Cleanup on Disconnect
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const handleClearRoom = async () => {
        setIsClearing(true);
        toast.loading("방 데이터를 100% 지우는 중입니다...", { id: 'clear_room' });

        // Broadcast to satellites to clear their screens unconditionally
        broadcastCommand('CLEAR_ROOM');

        // Clear all stored data from Supabase
        await clearRoomData(roomId);

        // Clear local UI state so it doesn't linger or bleed
        stopBackingTrack();
        setMrUrl(null);
        setScoreUrls([]);
        setAllLyrics([]);
        setIsStudioMode(false);
        setIsRecordingMaster(false);
        setSyncCountdownTarget(null);
        setCountdownSeconds(null);
        setIsScoreModalOpen(false);
        if (isCamActive) stopCamera();

        toast.success("방 전체 초기화가 안전하게 완료되었습니다.", { id: 'clear_room', duration: 3000 });

        setIsClearing(false);
        setIsDisconnectModalOpen(false);
        disconnect();
    };

    const handleJustDisconnect = () => {
        if (isClearing) return;
        // Clear local UI state to prevent cross-room bleed
        stopBackingTrack();
        setMrUrl(null);
        setScoreUrls([]);
        setAllLyrics([]);
        setIsStudioMode(false);
        setIsRecordingMaster(false);
        setSyncCountdownTarget(null);
        setCountdownSeconds(null);
        setIsScoreModalOpen(false);
        if (isCamActive) stopCamera();

        setIsDisconnectModalOpen(false);
        disconnect();
    };

    const isConnected = wsStatus === 'connected';

    useEffect(() => {
        if (isConnected && roomId) {
            // Restore MR track if the page was refreshed
            fetchLatestBackingTrack(roomId).then(url => {
                if (url) setMrUrl(url);
            });

            // Restore Scores if the page was refreshed
            fetchLatestScores(roomId).then(urls => {
                if (urls.length > 0) setScoreUrls(urls);
            });
        }
    }, [isConnected, roomId]);

    useEffect(() => {
        if (isDrawerOpen) {
            loadTracks();
        }
    }, [isDrawerOpen]);

    const loadTracks = async (deletedNames?: string[]) => {
        if (deletedNames && deletedNames.length > 0) {
            setTracks(prev => prev.filter(t => !deletedNames.includes(t.name)));
            setTimeout(async () => {
                const fetchedTracks = await fetchRoomTracks(roomId);
                const fetchedMrs = await fetchAllRoomBackingTracks(roomId);
                setTracks(fetchedTracks);
                setMrHistory(fetchedMrs);
            }, 1500);
            return;
        }

        setIsLoadingTracks(true);
        const [fetchedTracks, fetchedMrs] = await Promise.all([
            fetchRoomTracks(roomId),
            fetchAllRoomBackingTracks(roomId)
        ]);
        setTracks(fetchedTracks);
        setMrHistory(fetchedMrs);
        setIsLoadingTracks(false);
    };

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim()) return;

        // Initialize AudioContext on user gesture and enforce iOS Unlock sequence
        if (!audioContextRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Standard iOS WebAudio Unlock Hack: Play a silent dummy buffer instantly
            const dummyBuffer = audioCtx.createBuffer(1, 1, 22050);
            const dummySource = audioCtx.createBufferSource();
            dummySource.buffer = dummyBuffer;
            dummySource.connect(audioCtx.destination);

            // Use try-catch in case older browsers throw
            try { dummySource.start(0); } catch (e) { }

            // Force resume
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => console.log('AudioContext forcefully resumed on connect'));
            }

            audioContextRef.current = audioCtx;
            setSampleRate(audioCtx.sampleRate);
        }

        connect();
    };

    // Phase 14-D: WebAudio MR Preloader
    useEffect(() => {
        if (mrUrl && isConnected) {
            preloadBackingTrack(mrUrl);
        }
    }, [mrUrl, isConnected, preloadBackingTrack]);

    // Phase 17: Scheduled Countdown UI Loop
    useEffect(() => {
        if (!syncCountdownTarget) {
            setCountdownSeconds(null);
            return;
        }

        const interval = setInterval(() => {
            const nowServerTime = Date.now() + offset;
            const remainingMs = syncCountdownTarget - nowServerTime;

            if (remainingMs <= 0) {
                // Phase 17: UI flips to recording state on 0.
                clearInterval(interval);
                setSyncCountdownTarget(null);
                setCountdownSeconds(null);
                setIsRecordingMaster(true);

                toast('합창단 동기화 녹음 중...', { icon: '🔴', duration: 2000 });
            } else {
                setCountdownSeconds(Math.ceil(remainingMs / 1000));
            }
        }, 10);

        return () => clearInterval(interval);
    }, [syncCountdownTarget, offset, mrUrl, playBackingTrack]);

    // Phase 14: Late Joiner State Synchronization
    // If a choir member connects AFTER the master has uploaded a score, turned on Studio Mode,
    // or loaded an MR, they need to receive the current state immediately upon joining.
    // Ensure this hook runs unconditionally BEFORE the early return.
    const prevSatelliteCountRef = useRef(0);

    useEffect(() => {
        const currentCount = Object.keys(satellites).length;
        if (currentCount > prevSatelliteCountRef.current && wsStatus === 'connected') {
            // A new satellite joined! Blast the current Master state to ensure they are synchronized.
            console.log("New satellite detected. Broadcasting current master state to late joiners...");

            // Wait a tiny bit (500ms) to ensure the newly joined satellite has fully subscribed to the channel
            setTimeout(() => {
                if (isStudioMode) broadcastCommand('SET_STUDIO_MODE', { enabled: true });
                if (isRecordingMaster) broadcastCommand('START_RECORD');
                if (mrUrl) broadcastCommand('PRELOAD_MR', { url: mrUrl });
                if (scoreUrls.length > 0) broadcastCommand('SCORE_SYNC', { urls: scoreUrls });
                if (allLyrics[masterPage]) broadcastCommand('LYRICS_SYNC', { lyrics: allLyrics[masterPage] });
                if (allLyrics.length > 0) broadcastCommand('ALL_LYRICS_SYNC', { allLyrics });
            }, 500);
        }
        prevSatelliteCountRef.current = currentCount;
    }, [satellites, wsStatus, isStudioMode, isRecordingMaster, mrUrl, scoreUrls, allLyrics, masterPage, broadcastCommand]);

    if (!isConnected) {
        return (
            <main className="h-[100dvh] w-full fixed inset-0 overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 sm:p-8">
                {/* Home Navigation */}
                <div className="absolute top-6 left-6 z-[9999] pointer-events-auto">
                    <Link href="/" className="flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl backdrop-blur-md transition-all border border-white/5 hover:border-white/20">
                        <Home size={20} />
                    </Link>
                </div>

                {/* Cinematic Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[60%] bg-indigo-600/15 blur-[100px] rounded-[100%] pointer-events-none" />

                {/* Side-by-side on md (tablet), stacked on mobile */}
                <div className="w-full max-w-4xl relative z-[9999] flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 pointer-events-auto">

                    {/* Left Side: Title and Icon */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="flex justify-center md:justify-start mb-6 relative">
                            <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse" />
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center relative shadow-lg">
                                <LayoutGrid size={32} />
                            </div>
                        </div>

                        <div className="mb-6 md:mb-0">
                            <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">지휘자 마스터 뷰</h1>
                            <p className="text-slate-400 text-base md:text-lg mt-4 leading-relaxed max-w-sm">
                                합창단원(위성)들의 스마트폰에서 송신하는<br className="hidden md:block" />실시간 음정 데이터를 모니터링합니다.
                            </p>
                        </div>
                    </div>

                    {/* Right Side: Form Box */}
                    <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
                        <form onSubmit={handleConnect} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Room Code</label>
                                <input
                                    type="text"
                                    placeholder="예: 9876"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xl font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 placeholder:font-normal"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={wsStatus === 'connecting'}
                                className="w-full mt-6 bg-white/10 hover:bg-indigo-600 text-white disabled:opacity-50 font-bold text-lg py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] relative overflow-hidden group border border-white/10 hover:border-indigo-400/50"
                            >
                                {/* Hover flare effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                                <span className="relative z-10">{wsStatus === 'connecting' ? '방 생성 중...' : '마스터 뷰 열람하기'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Safe area footer spacer */}
                <div className="h-6 shrink-0 w-full" />
            </main>
        );
    }

    const satelliteArray: SatelliteData[] = Object.values(satellites).sort((a, b) => a.part.localeCompare(b.part));

    const activeNotes = satelliteArray
        .filter(sat => sat.connected && sat.pitch)
        .map(sat => sat.pitch!.note);
    const activeChord = detectChord(activeNotes);

    const handleMRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingMR(true);
            const url = await uploadBackingTrack(file, roomId);
            if (url) {
                setMrUrl(url);
                // Broadcast the URL to all connected satellites so they can preload it
                broadcastCommand('PRELOAD_MR', { url });
                toast.success('MR 반주 전송이 완료되었습니다.\n단원 기기 버퍼링에 1~2초 소요됩니다.', { duration: 4000 });
            } else {
                toast.error('MR 업로드에 실패했습니다.\n파일 용량과 형식을 확인해 주세요.');
            }
        } catch (err) {
            console.error("MR Upload failed:", err);
            toast.error('반주 업로드 중 알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsUploadingMR(false);
            // Reset input so the same file can be uploaded again if needed
            e.target.value = '';
        }
    };

    const handleYoutubeImport = async (url: string) => {
        try {
            setIsImportingYoutube(true);
            toast.loading("유튜브에서 오디오를 추출하는 중입니다...\n(최대 15초 소요)", { id: "yt-import" });

            const extractedUrl = await importYoutubeAsBackingTrack(url, roomId);
            if (extractedUrl) {
                setMrUrl(extractedUrl);
                broadcastCommand('PRELOAD_MR', { url: extractedUrl });
                toast.success('유튜브 MR 추출 및 서버 전송이 완료되었습니다!\n단원 기기 버퍼링 대기 중...', { id: "yt-import", duration: 4000 });
            } else {
                toast.error('유튜브 노래 추출에 실패했습니다.\nURL이 올바른지, 로컬 파이썬 서버가 켜져 있는지 확인하세요.', { id: "yt-import", duration: 5000 });
            }
        } catch (err) {
            console.error("Youtube Import failed:", err);
            toast.error('유튜브 추출 중 네트워크 오류가 발생했습니다.', { id: "yt-import" });
        } finally {
            setIsImportingYoutube(false);
        }
    };

    const handleScoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setIsUploadingScore(true);
            const urls = await uploadScoreImages(files, roomId);
            if (urls.length > 0) {
                setScoreUrls(urls);
                // Broadcast SCORE_SYNC with the new image URLs to satellites
                broadcastCommand('SCORE_SYNC', { urls });
                toast.success(`악보 ${urls.length}장이 성공적으로 전송되었습니다!`);
                // Automatically open the master viewer
                setIsScoreModalOpen(true);
            } else {
                toast.error('악보 이미지 업로드에 실패했습니다.\n파일 용량과 형식을 확인해 주세요.');
            }
        } catch (err) {
            console.error("Score Upload failed:", err);
            toast.error('악보 업로드 중 알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsUploadingScore(false);
            e.target.value = '';
        }
    };

    const handleToggleRecord = () => {
        if (isRecordingMaster || syncCountdownTarget) {
            broadcastCommand('STOP_RECORD');
            toast.success('전체 녹음이 종료되었습니다.', { duration: 2500 });
            setIsRecordingMaster(false);
            setSyncCountdownTarget(null);
            setCountdownSeconds(null);
            stopBackingTrack();
        } else {
            // Phase 17: Setup 3.. 2.. 1.. GO scheduled playback 4 seconds into the future
            if (!isSynced) {
                toast.error("서버와 시계를 동기화 중입니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            const currentServerTime = Date.now() + offset;
            const targetTime = currentServerTime + 4000; // 4초 뒤 시작

            broadcastCommand('START_RECORD_SCHEDULED', { targetTime });

            // Trigger UI Countdown locally (which ultimately calls startRecording when remainingMs <= 0)
            setSyncCountdownTarget(targetTime);

            // Calculate exact remaining time until playback
            const exactCurrentServerTime = Date.now() + offset;
            const remainingMs = targetTime - exactCurrentServerTime;
            const remainingSeconds = Math.max(0, remainingMs / 1000);

            // Phase 17.5: Master Synthetic Delay Compensation Removed
            // Satellites now trigger their MR playback immediately via the WebAudio chronological timer,
            // identical to how the Master schedules it. They no longer wait for the `onaudioprocess` loop
            // to fetch the first microphone bytes. Both devices now play the MR perfectly in sync in real-time.

            if (mrUrl) {
                playBackingTrack(isMrMutedRef.current ? 0 : 1, remainingSeconds);
            }
        }
    };

    const handleToggleStudioMode = () => {
        const nextState = !isStudioMode;
        setIsStudioMode(nextState);
        broadcastCommand('SET_STUDIO_MODE', { enabled: nextState });
        if (nextState) {
            toast.success('스튜디오 모드(WAV) 켜짐', { duration: 2000 });
        } else {
            toast('스튜디오 모드 해제됨', { icon: 'ℹ️', duration: 1500 });
        }
    };

    const handleToggleCam = async () => {
        if (isCamActive) {
            stopCamera();
            toast('라이브 지휘 종료', { icon: '🛑', duration: 1500 });
        } else {
            try {
                await startCamera();
                toast.success('라이브 지휘 시작', { duration: 2000 });
            } catch (error) {
                toast.error('카메라 권한을 얻을 수 없습니다.', { duration: 2500 });
            }
        }
    };

    return (
        <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col pt-safe-top pb-safe-bottom relative">
            <MasterHeader
                roomId={roomId}
                satelliteCount={satelliteArray.length}
                isRecordingMaster={isRecordingMaster}
                isUploadingMR={isUploadingMR}
                mrUrl={mrUrl}
                onToggleRecord={handleToggleRecord}
                onMRUpload={handleMRUpload}
                onScoreUpload={handleScoreUpload}
                isUploadingScore={isUploadingScore}
                isCamActive={isCamActive}
                onToggleCam={handleToggleCam}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                hasScore={scoreUrls.length > 0}
                onOpenScore={() => setIsScoreModalOpen(true)}
                onDisconnect={() => setIsDisconnectModalOpen(true)}
                viewMode={viewMode}
                onSwitchMode={setViewMode}
                isStudioMode={isStudioMode}
                onToggleStudioMode={handleToggleStudioMode}
                activeChord={activeChord}
                sampleRate={sampleRate}
            />

            {/* Manager Console overlay (only visible in Manager tab) */}
            {viewMode === 'manager' && (
                <div className="px-6 pt-6 -mb-2 z-10">
                    <ManagerConsole
                        roomId={roomId}
                        satelliteCount={satelliteArray.length}
                        isRecordingMaster={isRecordingMaster}
                        isUploadingMR={isUploadingMR}
                        mrUrl={mrUrl}
                        onToggleRecord={handleToggleRecord}
                        onMRUpload={handleMRUpload}
                        onYoutubeImport={handleYoutubeImport}
                        isImportingYoutube={isImportingYoutube}
                        onScoreUpload={handleScoreUpload}
                        isUploadingScore={isUploadingScore}
                        onOpenDrawer={() => setIsDrawerOpen(true)}
                        isStudioMode={isStudioMode}
                        onToggleStudioMode={handleToggleStudioMode}
                        isMrMuted={isMrMuted}
                        onToggleMrMute={handleToggleMrMute}
                    />
                </div>
            )}

            <div className={`flex-1 overflow-y-auto w-full ${viewMode === 'manager' ? 'p-6 pt-2' : 'p-6'}`}>
                <SatelliteGrid
                    roomId={roomId}
                    satellites={satelliteArray}
                    viewMode={viewMode}
                />
            </div>

            <RecordingsDrawer
                roomId={roomId}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                mrHistory={mrHistory}
                liveMrUrl={mrUrl}
                tracks={tracks}
                isLoadingTracks={isLoadingTracks}
                onLoadTracks={loadTracks}
            />

            <MasterScoreModal
                roomId={roomId}
                isOpen={isScoreModalOpen}
                onClose={() => setIsScoreModalOpen(false)}
                scoreUrls={scoreUrls}
                currentPage={masterPage}
                onPageSync={(pageIndex) => {
                    setMasterPage(pageIndex);
                    broadcastCommand('PAGE_SYNC', { page: pageIndex });
                    // V2 Auto-Sync: Dispatch lyrics automatically when page turns
                    if (allLyrics[pageIndex]) {
                        broadcastCommand('LYRICS_SYNC', { lyrics: allLyrics[pageIndex] });
                    }
                }}
                allLyrics={allLyrics}
                onUpdateAllLyrics={(newAllLyrics) => {
                    setAllLyrics(newAllLyrics);
                    broadcastCommand('ALL_LYRICS_SYNC', { allLyrics: newAllLyrics });
                    // Explicitly NOT broadcasting LYRICS_SYNC here so we don't wake satellites
                    // during silent background batch extraction!
                }}
                onForceSyncCurrentLyrics={(lyrics) => {
                    broadcastCommand('LYRICS_SYNC', { lyrics });
                }}
            />

            {/* Maestro Cam Local Preview */}
            {isCamActive && stream && (
                <div className="absolute right-6 bottom-6 w-48 aspect-video bg-black rounded-lg shadow-2xl overflow-hidden border border-slate-700 z-50">
                    <video
                        autoPlay
                        playsInline
                        muted
                        ref={v => {
                            if (v && v.srcObject !== stream) v.srcObject = stream;
                        }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-red-600 rounded-full w-2 h-2 animate-pulse" />
                </div>
            )}

            {/* Floating View Score Button (Bottom Left) */}
            {scoreUrls.length > 0 && viewMode === 'conductor' && (
                <button
                    onClick={() => setIsScoreModalOpen(true)}
                    className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-16 h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 group border border-emerald-400/50 pointer-events-auto"
                    title="악보 열람"
                >
                    <Presentation size={24} className="group-hover:animate-pulse" />
                </button>
            )}

            {/* Floating Bookmark for Today's Songs */}
            <PracticeListBookmark />

            {/* Phase 17: Countdown Overlay UI */}
            {syncCountdownTarget && countdownSeconds !== null && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="text-emerald-400 font-extrabold text-[120px] md:text-[200px] leading-none animate-bounce shadow-emerald-500/50 drop-shadow-2xl">
                        {countdownSeconds}
                    </div>
                    <h2 className="text-white text-2xl md:text-3xl font-bold mt-8 tracking-tight animate-pulse">
                        합주 동기화 준비 중...
                    </h2>
                    <p className="text-slate-400 mt-4 text-center max-w-sm px-4">
                        모든 단원의 스피커와 마이크 바운스가 <br />
                        0.0초의 오차 없이 동시에 시작됩니다.
                    </p>
                </div>
            )}

            {/* Disconnect Warning Modal */}
            {isDisconnectModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !isClearing && setIsDisconnectModalOpen(false)}></div>
                    <div className="bg-slate-900 border border-slate-700/50 rounded-[2rem] p-8 max-w-sm w-full relative z-10 shadow-2xl flex flex-col pt-12 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-rose-500/20 backdrop-blur-xl rounded-full border-4 border-slate-900 flex items-center justify-center shadow-inner">
                            <LogOut className="w-8 h-8 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">방에서 나가시겠습니까?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed break-keep">
                                지휘자나 다른 관리자가 아직 이 방에 남아있다면 <br className="hidden sm:block" />
                                <strong className="text-slate-200">그냥 나가기</strong>를 선택해 주세요.
                            </p>
                        </div>

                        {/* Action buttons list */}
                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                onClick={handleJustDisconnect}
                                disabled={isClearing}
                                className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <LogOut size={20} className="text-slate-400" />
                                <span>그냥 나가기 (연습데이터보존)</span>
                            </button>
                            <button
                                onClick={handleClearRoom}
                                disabled={isClearing}
                                className={`w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isClearing ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
                            >
                                <Trash2 size={20} />
                                <span>{isClearing ? '데이터 초기화 중...' : '연습데이터 초기화 하고 나가기'}</span>
                            </button>
                            <button
                                onClick={() => setIsDisconnectModalOpen(false)}
                                disabled={isClearing}
                                className="w-full py-4 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors mt-2 disabled:opacity-30 disabled:pointer-events-none"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
