import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import { PracticeTrack } from '@/lib/storageUtils';
import { TakeMixer } from '@/components/TakeMixer';

interface RecordingsDrawerProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    mrUrl: string | null;
    tracks: PracticeTrack[];
    isLoadingTracks: boolean;
    onLoadTracks: (deletedNames?: string[]) => void;
}

export function RecordingsDrawer({
    roomId,
    isOpen,
    onClose,
    mrUrl,
    tracks,
    isLoadingTracks,
    onLoadTracks
}: RecordingsDrawerProps) {
    const groupedTakes = React.useMemo(() => {
        const takes: { timestamp: number, tracks: PracticeTrack[] }[] = [];
        tracks.forEach(t => {
            const tsString = t.name.split('_')[1];
            if (!tsString) return;
            const ts = parseInt(tsString.split('.')[0]);

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

                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <span className="text-sm text-slate-400">Room: {roomId}</span>
                    <button
                        onClick={() => onLoadTracks()}
                        disabled={isLoadingTracks}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                        {isLoadingTracks ? '불러오는 중...' : '새로고침'}
                    </button>
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
                        groupedTakes.map(group => (
                            <TakeMixer
                                key={group.timestamp}
                                roomId={roomId}
                                tracks={group.tracks}
                                timestamp={group.timestamp}
                                mrUrl={mrUrl}
                                onDeleteComplete={onLoadTracks}
                            />
                        ))
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
