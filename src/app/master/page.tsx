"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMasterSubscriber } from '@/lib/useMasterSubscriber';
import { LayoutGrid, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMaestroCamMaster } from '@/lib/webrtc/useMaestroCamMaster';
import { fetchRoomTracks, PracticeTrack } from '@/lib/storageUtils';
import { uploadBackingTrack, fetchLatestBackingTrack } from '@/lib/backingTrackUtils';
import { uploadScoreImages } from '@/lib/scoreUtils';

import { MasterHeader } from '@/components/master/MasterHeader';
import { SatelliteGrid, SatelliteData } from '@/components/master/SatelliteGrid';
import { RecordingsDrawer } from '@/components/master/RecordingsDrawer';
import { MasterScoreModal } from '@/components/master/MasterScoreModal';

export default function MasterPage() {
    const [roomId, setRoomId] = useState('');
    const [isRecordingMaster, setIsRecordingMaster] = useState(false);
    const { status: wsStatus, satellites, connect, disconnect, broadcastCommand } = useMasterSubscriber(roomId);

    // Phase 4: Recordings Explorer States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [tracks, setTracks] = useState<PracticeTrack[]>([]);
    const [isLoadingTracks, setIsLoadingTracks] = useState(false);

    // Phase 8: Backing Track (MR) Sync
    const [isUploadingMR, setIsUploadingMR] = useState(false);
    const [mrUrl, setMrUrl] = useState<string | null>(null);

    // Phase 10: Score Sync Sync
    const [isUploadingScore, setIsUploadingScore] = useState(false);
    const [scoreUrls, setScoreUrls] = useState<string[]>([]);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

    // Phase 13: Maestro Cam 1:N WebRTC Master
    const { isCamActive, startCamera, stopCamera, stream } = useMaestroCamMaster(roomId);

    const isConnected = wsStatus === 'connected';

    useEffect(() => {
        if (isConnected && roomId) {
            // Restore MR track if the page was refreshed
            fetchLatestBackingTrack(roomId).then(url => {
                if (url) setMrUrl(url);
            });
        }
    }, [isConnected, roomId]);

    useEffect(() => {
        if (isDrawerOpen) {
            loadTracks();
        }
    }, [isDrawerOpen]);

    const loadTracks = async () => {
        setIsLoadingTracks(true);
        const fetched = await fetchRoomTracks(roomId);
        setTracks(fetched);
        setIsLoadingTracks(false);
    };

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim()) return;
        connect();
    };

    if (!isConnected) {
        return (
            <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex items-center justify-center p-4">
                {/* Home Navigation */}
                <div className="absolute top-6 left-6 z-20">
                    <Link href="/" className="flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl backdrop-blur-md transition-all border border-white/5 hover:border-white/20">
                        <Home size={20} />
                    </Link>
                </div>

                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                            <LayoutGrid size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2">지휘자 마스터 뷰</h1>
                    <p className="text-slate-400 text-sm text-center mb-8">
                        합창단원(위성)들의 스마트폰에서 송신하는 실시간 음정 데이터를 모니터링합니다.
                    </p>

                    <form onSubmit={handleConnect} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Room 코드를 입력하세요</label>
                            <input
                                type="text"
                                placeholder="예: 9876"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center tracking-widest"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={wsStatus === 'connecting'}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl transition-colors mt-4"
                        >
                            {wsStatus === 'connecting' ? '방 생성 중...' : '마스터 뷰 열람하기'}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    const satelliteArray: SatelliteData[] = Object.values(satellites).sort((a, b) => a.part.localeCompare(b.part));

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
            broadcastCommand('START_RECORD');
            toast('전달 완료: 전체 동기화 녹음 시작', { icon: '🔴' });
            setIsRecordingMaster(true);
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
                onDisconnect={disconnect}
            />

            <div className="flex-1 p-6 overflow-y-auto w-full">
                <SatelliteGrid
                    roomId={roomId}
                    satellites={satelliteArray}
                />
            </div>

            <RecordingsDrawer
                roomId={roomId}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                mrUrl={mrUrl}
                tracks={tracks}
                isLoadingTracks={isLoadingTracks}
                onLoadTracks={loadTracks}
            />

            <MasterScoreModal
                roomId={roomId}
                isOpen={isScoreModalOpen}
                onClose={() => setIsScoreModalOpen(false)}
                scoreUrls={scoreUrls}
                onPageSync={(pageIndex) => broadcastCommand('PAGE_SYNC', { page: pageIndex })}
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
        </main>
    );
}
