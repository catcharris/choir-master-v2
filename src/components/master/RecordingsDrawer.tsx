import React, { useState } from 'react';
import { FolderOpen, X, Trash2 } from 'lucide-react';
import { PracticeTrack, deleteAllVocalTracks } from '@/lib/storageUtils';
import { TakeMixer } from '@/components/TakeMixer';
import toast from 'react-hot-toast';

interface RecordingsDrawerProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    mrHistory: { url: string, timestamp: number }[];
    liveMrUrl: string | null;
    tracks: PracticeTrack[];
    isLoadingTracks: boolean;
    onLoadTracks: (deletedNames?: string[]) => void;
}

export function RecordingsDrawer({
    roomId,
    isOpen,
    onClose,
    mrHistory,
    liveMrUrl,
    tracks,
    isLoadingTracks,
    onLoadTracks
}: RecordingsDrawerProps) {
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const groupedTakes = React.useMemo(() => {
        const takes: { timestamp: number, tracks: PracticeTrack[] }[] = [];
        tracks.forEach(t => {
            // Bulletproof regex to extract the timestamp right before '_offset' or before the file extension if offset is missing.
            // Note: -? added to optionally allow negative offset values like _offset_-100
            const match = t.name.match(/_(\d+)(?:_offset_-?\d+)?\.\w+$/);
            if (!match) return;
            const ts = parseInt(match[1], 10);

            const existingGroup = takes.find(g => Math.abs(g.timestamp - ts) < 3000);
            if (existingGroup) {
                existingGroup.tracks.push(t);
            } else {
                takes.push({ timestamp: ts, tracks: [t] });
            }
        });

        // Sort newest groups first
        takes.sort((a, b) => b.timestamp - a.timestamp);
        return takes;
    }, [tracks]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 translate-x-0">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <FolderOpen className="text-indigo-400" size={24} />
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">음원 보관함</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center gap-2">
                    <span className="text-sm text-slate-400">Room: {roomId}</span>
                    <div className="flex items-center gap-2">
                        {tracks.length > 0 && (
                            confirmDelete ? (
                                <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2">
                                    <button
                                        onClick={async () => {
                                            setIsDeletingAll(true);
                                            const success = await deleteAllVocalTracks(roomId);
                                            setIsDeletingAll(false);
                                            setConfirmDelete(false);
                                            if (success) {
                                                toast.success("모든 녹음 파일이 삭제되었습니다.");
                                                onLoadTracks();
                                            } else {
                                                toast.error("일괄 삭제 중 오류가 발생했습니다.");
                                            }
                                        }}
                                        disabled={isDeletingAll}
                                        className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-1 shadow-lg shadow-red-500/20"
                                    >
                                        {isDeletingAll ? '삭제중...' : '진짜 삭제'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(false)}
                                        disabled={isDeletingAll}
                                        className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                    >
                                        취소
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    disabled={isLoadingTracks || isDeletingAll}
                                    className="text-xs text-red-400 hover:text-white border border-red-500/30 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5"
                                    title="이 방의 모든 단원 녹음 파일을 영구 삭제합니다."
                                >
                                    <Trash2 size={12} />
                                    전체 일괄 삭제
                                </button>
                            )
                        )}
                        <button
                            onClick={() => onLoadTracks()}
                            disabled={isLoadingTracks || isDeletingAll}
                            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                            {isLoadingTracks ? '새로고침 중...' : '새로고침'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingTracks ? (
                        <div className="text-center py-12 text-slate-500 animate-pulse">데이터를 가져오는 중입니다...</div>
                    ) : tracks.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p>아직 녹음된 파일이 없습니다.</p>
                            <p className="text-sm mt-2">위성 단원을 연결하고 녹음을 진행해주세요.</p>
                        </div>
                    ) : (
                        groupedTakes.map(group => {
                            // Find the chronologically correct MR:
                            // The MR must have been uploaded *before* or *at* the time this vocal take was recorded.
                            // Since mrHistory is sorted newest to oldest, we find the *first* one that is older than the take.
                            const correctMr = mrHistory.find(mr => mr.timestamp <= group.timestamp);
                            const resolvedMrUrl = correctMr ? correctMr.url : (mrHistory.length > 0 ? mrHistory[mrHistory.length - 1].url : liveMrUrl);

                            return (
                                <TakeMixer
                                    key={group.timestamp}
                                    roomId={roomId}
                                    tracks={group.tracks}
                                    timestamp={group.timestamp}
                                    mrUrl={resolvedMrUrl}
                                    mrOffsetMs={correctMr ? Math.max(0, group.timestamp - correctMr.timestamp) : 0}
                                    onDeleteComplete={onLoadTracks}
                                />
                            );
                        })
                    )}
                </div>
            </div>
            {/* Backdrop for drawer */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />
        </>
    );
}
