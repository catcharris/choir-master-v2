"use client";
import React, { useState, useEffect } from 'react';
import { useMasterSubscriber } from '@/lib/useMasterSubscriber';
import { LayoutGrid } from 'lucide-react';
import { fetchRoomTracks, PracticeTrack } from '@/lib/storageUtils';
import { uploadBackingTrack, fetchLatestBackingTrack } from '@/lib/backingTrackUtils';

import { MasterHeader } from '@/components/master/MasterHeader';
import { SatelliteGrid, SatelliteData } from '@/components/master/SatelliteGrid';
import { RecordingsDrawer } from '@/components/master/RecordingsDrawer';

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
                broadcastCommand('PRELOAD_MR', url);
                alert('MR 반주 전송이 완료되었습니다. 단원들의 기기에 버퍼링이 1~2초 소요될 수 있습니다.');
            } else {
                alert('MR 업로드에 실패했습니다.');
            }
        } catch (err) {
            console.error("MR Upload failed:", err);
            alert('MR 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploadingMR(false);
            // Reset input so the same file can be uploaded again if needed
            e.target.value = '';
        }
    };

    const handleToggleRecord = () => {
        if (isRecordingMaster) {
            broadcastCommand('STOP_RECORD');
            setIsRecordingMaster(false);
        } else {
            broadcastCommand('START_RECORD');
            setIsRecordingMaster(true);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col pt-safe-top pb-safe-bottom">
            <MasterHeader
                roomId={roomId}
                satelliteCount={satelliteArray.length}
                isRecordingMaster={isRecordingMaster}
                isUploadingMR={isUploadingMR}
                mrUrl={mrUrl}
                onToggleRecord={handleToggleRecord}
                onMRUpload={handleMRUpload}
                onOpenDrawer={() => setIsDrawerOpen(true)}
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
        </main>
    );
}
