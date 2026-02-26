"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useMasterSubscriber } from '@/lib/useMasterSubscriber';
import { LayoutGrid, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMaestroCamMaster } from '@/lib/webrtc/useMaestroCamMaster';
import { fetchRoomTracks, PracticeTrack } from '@/lib/storageUtils';
import { uploadBackingTrack, fetchLatestBackingTrack, fetchAllRoomBackingTracks } from '@/lib/backingTrackUtils';
import { uploadScoreImages, fetchLatestScores } from '@/lib/scoreUtils';
import { detectChord } from '@/lib/chordDetector';
import { clearRoomData } from '@/lib/clearRoomData';
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

    // WebAudio context for perfectly synced MR playback
    const audioContextRef = useRef<AudioContext | null>(null);
    const { preloadBackingTrack, playBackingTrack, stopBackingTrack, setBackingTrackVolume } = useBackingTrack(audioContextRef);

    const [masterPage, setMasterPage] = useState(0);
    const handleMasterCommand = useCallback((action: string, payload: any) => {
        if (action === 'SCORE_SYNC' && payload?.urls) {
            setScoreUrls(payload.urls);
            toast.success(`다른 마스터 기기에서 악보 ${payload.urls.length}장을 업로드했습니다.`, { duration: 4000 });
        } else if (action === 'PRELOAD_MR' && payload?.url) {
            setMrUrl(payload.url);
            toast.success('다른 마스터 기기에서 MR을 업로드했습니다.', { duration: 3000 });
        } else if (action === 'SET_STUDIO_MODE' && payload?.enabled !== undefined) {
            setIsStudioMode(payload.enabled);
        } else if (action === 'START_RECORD') {
            const targetTime = payload?.targetTime || Date.now();
            // Store the scheduled start time in a ref or state if needed, or just set it
            setIsRecordingMaster(true);
            setTimeout(() => {
                if (mrUrl) playBackingTrack(isMrMutedRef.current ? 0 : 1);
            }, Math.max(0, targetTime - Date.now()));
            toast('다른 마스터 기기에서 전체 녹음을 시작했습니다.', { icon: '🔴' });
        } else if (action === 'STOP_RECORD') {
            setIsRecordingMaster(false);
            toast.success('다른 마스터 기기에서 전체 녹음을 종료했습니다.', { duration: 3000 });
        } else if (action === 'PAGE_SYNC' && payload?.page !== undefined) {
            setMasterPage(payload.page);
        } else if (action === 'CLEAR_ROOM') {
            setScoreUrls([]);
            setMrUrl(null);
            setIsStudioMode(false);
            setIsRecordingMaster(false);
            setIsScoreModalOpen(false);
            setMasterPage(0);
            toast("다른 관리자가 방 데이터를 초기화했습니다.", { icon: "🧹", duration: 4000 });
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
    const [mrUrl, setMrUrl] = useState<string | null>(null);
    const [mrHistory, setMrHistory] = useState<{ url: string, timestamp: number }[]>([]);

    // Phase 10: Score Sync Sync
    const [isUploadingScore, setIsUploadingScore] = useState(false);
    const [scoreUrls, setScoreUrls] = useState<string[]>([]);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

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

    const handleClearRoom = async () => {
        // Broadcast to satellites to clear their screens unconditionally
        broadcastCommand('CLEAR_ROOM');
        // Clear all stored data from Supabase
        await clearRoomData(roomId);

        // Clear local UI state so it doesn't linger or bleed
        setMrUrl(null);
        setScoreUrls([]);
        setIsStudioMode(false);
        setIsRecordingMaster(false);
        setIsScoreModalOpen(false);
        if (isCamActive) stopCamera();

        setIsDisconnectModalOpen(false);
        disconnect();
    };

    const handleJustDisconnect = () => {
        // Clear local UI state to prevent cross-room bleed
        setMrUrl(null);
        setScoreUrls([]);
        setIsStudioMode(false);
        setIsRecordingMaster(false);
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

        // Initialize AudioContext on user gesture
        if (!audioContextRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
        }

        connect();
    };

    // Phase 14-D: WebAudio MR Preloader
    useEffect(() => {
        if (mrUrl && isConnected) {
            preloadBackingTrack(mrUrl);
        }
    }, [mrUrl, isConnected, preloadBackingTrack]);

    // Phase 14-B: Master MR Playback Sync (WebAudio 0-latency)
    useEffect(() => {
        if (!isRecordingMaster) {
            stopBackingTrack();
        }
    }, [isRecordingMaster, stopBackingTrack]);

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
            }, 500);
        }
        prevSatelliteCountRef.current = currentCount;
    }, [satellites, wsStatus, isStudioMode, isRecordingMaster, mrUrl, scoreUrls, broadcastCommand]);

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
        if (isRecordingMaster) {
            broadcastCommand('STOP_RECORD');
            toast.success('전체 녹음이 종료되었습니다.\n수 초 내에 단원들의 파일이 업로드됩니다.', { duration: 5000 });
            setIsRecordingMaster(false);
        } else {
            // Tell satellites to start their recorders immediately.
            // Satellites will tie MR playback perfectly to their microphone activation time.
            broadcastCommand('START_RECORD');

            setIsRecordingMaster(true);
            toast('합창단 전체 동기화 녹음 시작', { icon: '🔴', duration: 3000 });

            // For the Conductor/Master who clicked the button: play the MR instantly for them
            if (mrUrl) playBackingTrack(isMrMutedRef.current ? 0 : 1);
        }
    };

    const handleToggleStudioMode = () => {
        const nextState = !isStudioMode;
        setIsStudioMode(nextState);
        broadcastCommand('SET_STUDIO_MODE', { enabled: nextState });
        if (nextState) {
            toast.success('스튜디오 모드 활성화됨.\n위성들의 녹음이 WAV 무손실 포맷으로 전환됩니다.', { duration: 4000 });
        } else {
            toast('스튜디오 모드 해제됨.\n일반 압축 포맷(Opus)으로 복귀합니다.', { icon: 'ℹ️' });
        }
    };

    const handleToggleCam = async () => {
        if (isCamActive) {
            stopCamera();
            toast('라이브 지휘 카메라를 종료했습니다.', { icon: '🛑' });
        } else {
            try {
                await startCamera();
                toast.success('라이브 지휘 방송이 시작되었습니다.\n위성들의 악보 화면에서 지휘자님의 모습이 보입니다!', { duration: 5000 });
            } catch (error) {
                toast.error('카메라 권한을 얻을 수 없습니다.\n브라우저 설정에서 카메라 권한을 허용해주세요.');
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

            {/* Disconnect Warning Modal */}
            {isDisconnectModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsDisconnectModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-[2rem] shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner">
                                <LogOut size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">방에서 나가시겠습니까?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed break-keep">
                                    지휘자나 다른 관리자가 아직 이 방에 남아있다면 <br className="hidden sm:block" />
                                    <strong className="text-slate-200">그냥 나가기</strong>를 선택해 주세요.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                onClick={handleJustDisconnect}
                                className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                <LogOut size={20} className="text-slate-400" />
                                <span>그냥 나가기 (데이터 남을 수 있음)</span>
                            </button>
                            <button
                                onClick={handleClearRoom}
                                className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                <Trash2 size={20} />
                                <span>연습데이터 초기화 하고 나가기</span>
                            </button>
                            <button
                                onClick={() => setIsDisconnectModalOpen(false)}
                                className="w-full py-4 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors mt-2"
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
