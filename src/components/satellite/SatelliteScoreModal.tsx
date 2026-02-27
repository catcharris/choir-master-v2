import React, { useState, useEffect } from 'react';
import { FileImage, Presentation, Link as LinkIcon, X, Type, Image as ImageIcon } from 'lucide-react';

interface SatelliteScoreModalProps {
    roomId: string;
    isOpen: boolean;
    scoreUrls: string[];
    currentPage: number;
    onClose: () => void;
    lyrics?: string | null;
}

export function SatelliteScoreModal({
    roomId,
    isOpen,
    scoreUrls,
    currentPage: masterPage,
    onClose,
    lyrics
}: SatelliteScoreModalProps) {
    const [localPage, setLocalPage] = useState(masterPage);
    const [prevMasterPage, setPrevMasterPage] = useState(masterPage);
    const [viewMode, setViewMode] = useState<'score' | 'lyrics'>('score');

    // Render-phase state update: Auto-snap to master page immediately without DOM flickering
    if (masterPage !== prevMasterPage) {
        setPrevMasterPage(masterPage);
        setLocalPage(masterPage);
    }

    // Auto-switch to lyrics view if lyrics arrive while modal is open
    useEffect(() => {
        if (lyrics && isOpen && viewMode !== 'lyrics') {
            setViewMode('lyrics');
        }
    }, [lyrics, isOpen]);

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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black backdrop-blur-md pb-safe">

            {/* Top Navigation & Toggles */}
            <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-[120] bg-gradient-to-b from-black/80 to-transparent flex items-start justify-between pointer-events-none">
                {/* Left: Close Button */}
                <button
                    onClick={onClose}
                    className="pointer-events-auto flex items-center gap-2 pl-2 pr-4 py-2 bg-black/40 hover:bg-black/80 border border-white/10 text-white/80 hover:text-white rounded-full backdrop-blur-md shadow-2xl transition-all active:scale-95 group"
                >
                    <div className="p-1 bg-white/10 rounded-full group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors">
                        <X size={18} />
                    </div>
                    <span className="font-bold text-sm">닫기</span>
                </button>

                {/* Center: View Toggle (Only show if lyrics exist) */}
                {lyrics && (
                    <div className="pointer-events-auto flex items-center bg-black/60 p-1 rounded-full border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setViewMode('score')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${viewMode === 'score' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ImageIcon size={16} />
                            악보 보기
                        </button>
                        <button
                            onClick={() => setViewMode('lyrics')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${viewMode === 'lyrics' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Type size={16} />
                            가사 보기
                        </button>
                    </div>
                )}

                {/* Right: Empty spacer to balance header */}
                <div className="w-[100px]" />
            </div>

            {/* Sync Indicator */}
            {!isSynced && viewMode === 'score' && (
                <button
                    onClick={() => setLocalPage(masterPage)}
                    className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-rose-500/90 hover:bg-rose-600 border border-white/20 rounded-full text-white font-bold shadow-2xl z-[120] w-max max-w-[90vw] transition-all active:scale-95 shadow-rose-500/40 animate-bounce cursor-pointer pointer-events-auto"
                >
                    <LinkIcon size={18} className="flex-shrink-0" />
                    <span className="text-sm truncate">마스터 화면으로 복귀 (Page {masterPage + 1})</span>
                </button>
            )}

            {/* Fullscreen Content Area */}
            <div className="relative w-full h-full flex items-center justify-center p-0 m-0 z-0 bg-black pt-20">
                {viewMode === 'lyrics' && lyrics ? (
                    <div className="w-full h-full overflow-y-auto px-6 sm:px-12 py-8 flex flex-col items-center custom-scrollbar">
                        <div className="w-full max-w-3xl text-center space-y-6">
                            {lyrics.split('\n').map((line, idx) => (
                                <p key={idx} className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight sm:leading-snug break-keep tracking-tight text-shadow-xl hover:text-amber-400 transition-colors cursor-default">
                                    {line}
                                </p>
                            ))}
                        </div>
                        {/* Bottom safe space for scrolling */}
                        <div className="h-40" />
                    </div>
                ) : scoreUrls.length > 0 ? (
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
        </div>
    );
}
