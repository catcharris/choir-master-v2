import React, { useState, useEffect } from 'react';
import { FileImage, Presentation, Link as LinkIcon, X } from 'lucide-react';

interface SatelliteScoreModalProps {
    roomId: string;
    isOpen: boolean;
    scoreUrls: string[];
    currentPage: number;
    onClose: () => void;
}

export function SatelliteScoreModal({
    roomId,
    isOpen,
    scoreUrls,
    currentPage: masterPage,
    onClose
}: SatelliteScoreModalProps) {
    const [localPage, setLocalPage] = useState(masterPage);
    const [prevMasterPage, setPrevMasterPage] = useState(masterPage);

    // Render-phase state update: Auto-snap to master page immediately without DOM flickering
    if (masterPage !== prevMasterPage) {
        setPrevMasterPage(masterPage);
        setLocalPage(masterPage);
    }

    if (!isOpen) return null;

    const isSynced = localPage === masterPage;

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (localPage > 0) setLocalPage(localPage - 1);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (localPage < scoreUrls.length - 1) setLocalPage(localPage + 1);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md">

            {/* Top Indicator & Sync Button */}
            {isSynced ? (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-indigo-400 font-bold shadow-lg z-20 w-max max-w-full pointer-events-none">
                    <Presentation size={18} className="animate-pulse flex-shrink-0" />
                    <span className="text-sm">마스터 동기화 중 ({localPage + 1}/{scoreUrls.length})</span>
                </div>
            ) : (
                <button
                    onClick={() => setLocalPage(masterPage)}
                    className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-rose-500/90 hover:bg-rose-600 border border-white/20 rounded-full text-white font-bold shadow-2xl z-20 w-max max-w-full transition-all active:scale-95 shadow-rose-500/40 animate-bounce"
                >
                    <LinkIcon size={18} className="flex-shrink-0" />
                    <span className="text-sm">마스터 화면으로 복귀 (Page {masterPage + 1})</span>
                </button>
            )}

            {/* Fullscreen Score Content */}
            <div className="relative w-full h-full flex items-center justify-center p-0 m-0 z-0 bg-black">
                {scoreUrls.length > 0 ? (
                    <div className="w-full h-full relative overflow-hidden bg-black">
                        {scoreUrls.map((url, idx) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                key={url}
                                src={url}
                                alt={`Score Page ${idx + 1}`}
                                className={`absolute top-0 left-0 w-full h-full object-contain pointer-events-none ${idx === localPage ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                loading="eager"
                            />
                        ))}

                        {/* Invisible Tap Zones for Satellite Independent Navigation */}
                        <div
                            className="absolute top-0 left-0 w-[40%] h-full cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors z-10"
                            onClick={handlePrev}
                        />
                        <div
                            className="absolute top-0 right-0 w-[40%] h-full cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors z-10"
                            onClick={handleNext}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 gap-4">
                        <FileImage size={48} className="opacity-50" />
                        <span className="font-bold text-lg">아직 등록된 편곡 악보가 없습니다</span>
                    </div>
                )}
            </div>

            {/* Minimal Close Button in Top Right */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-black/40 hover:bg-black/80 text-white/70 hover:text-white rounded-full backdrop-blur-md border border-white/10 transition-colors shadow-2xl z-20 active:scale-95"
                title="튜너로 돌아가기"
            >
                <X size={24} />
            </button>
        </div>
    );
}
