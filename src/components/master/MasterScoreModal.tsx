import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';

interface MasterScoreModalProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    scoreUrls: string[];
    onPageSync: (pageIndex: number) => void;
}

export function MasterScoreModal({
    roomId,
    isOpen,
    onClose,
    scoreUrls,
    onPageSync
}: MasterScoreModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Keyboard support for Bluetooth Pedals (PageTurners)
    useEffect(() => {
        if (!isOpen || scoreUrls.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                handlePrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, scoreUrls.length]); // Rebind when index changes so handleNext has latest state

    // Sync on open or when urls array changes length if currentIndex is out of bounds
    useEffect(() => {
        if (isOpen && scoreUrls.length > 0) {
            if (currentIndex >= scoreUrls.length) {
                setCurrentIndex(scoreUrls.length - 1);
                onPageSync(scoreUrls.length - 1);
            } else {
                // Ensure satellites catch up when it opens
                onPageSync(currentIndex);
            }
        }
    }, [isOpen, scoreUrls.length]);

    if (!isOpen) return null;

    const handlePrev = () => {
        if (currentIndex > 0) {
            const newIdx = currentIndex - 1;
            setCurrentIndex(newIdx);
            onPageSync(newIdx);
        }
    };

    const handleNext = () => {
        if (currentIndex < scoreUrls.length - 1) {
            const newIdx = currentIndex + 1;
            setCurrentIndex(newIdx);
            onPageSync(newIdx);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            {/* Unified Top Navigation Header */}
            <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-between pointer-events-none">
                {/* Left: Close Button */}
                <button
                    onClick={onClose}
                    className="pointer-events-auto flex items-center gap-2 pl-2 pr-4 py-2 bg-black/40 hover:bg-black/80 border border-white/10 text-white/80 hover:text-white rounded-full backdrop-blur-md shadow-2xl transition-all active:scale-95 group"
                >
                    <div className="p-1 bg-white/10 rounded-full group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors">
                        <X size={18} />
                    </div>
                    <span className="font-bold text-sm">악보 닫기</span>
                </button>

                {/* Right: Page Indicator & Instructions */}
                <div className="flex flex-col items-end gap-2 text-right">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full shadow-2xl flex items-center gap-3">
                        <span className="font-black text-xl tracking-wider text-emerald-400">
                            {scoreUrls.length === 0 ? "대기 중" : `${currentIndex + 1} / ${scoreUrls.length}`}
                        </span>
                        <Presentation size={20} className="text-emerald-400/80 animate-pulse" />
                    </div>
                    <div className="hidden sm:block text-white/40 text-xs font-bold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                        화면 좌/우측을 터치하여 페이지 이동
                    </div>
                </div>
            </div>

            {scoreUrls.length > 0 ? (
                <div className="relative w-full h-full flex items-center justify-center p-0 m-0">

                    {/* Fullscreen Image Container (Preloaded in DOM) */}
                    <div className="w-full h-full flex items-center justify-center bg-black relative p-0 m-0 overflow-hidden">
                        {scoreUrls.map((url, idx) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                key={url}
                                src={url}
                                alt={`Score Page ${idx + 1}`}
                                className={`absolute top-0 left-0 w-full h-full object-contain pointer-events-none ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                loading="eager"
                            />
                        ))}

                        {/* Massive Invisible Tap Zones for Analog Conductors! */}
                        <div
                            className="absolute top-0 left-0 w-[40%] h-full cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-start pl-8 group/left z-10"
                            onClick={handlePrev}
                        >
                            <span className="opacity-0 group-hover/left:opacity-100 transition-opacity text-white/50 text-2xl font-bold">〈 이전</span>
                        </div>
                        <div
                            className="absolute top-0 right-0 w-[40%] h-full cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-end pr-8 group/right z-10"
                            onClick={handleNext}
                        >
                            <span className="opacity-0 group-hover/right:opacity-100 transition-opacity text-white/50 text-2xl font-bold">다음 〉</span>
                        </div>
                    </div>

                    {/* Navigation Buttons Removed. Relying entirely on the invisible touch zones to maximize score view. */}

                </div>
            ) : (
                <div className="text-slate-500 text-lg font-bold">
                    [악보 올리기] 버튼을 눌러 이미지 파일을 업로드하세요.
                </div>
            )}
        </div>
    );
}
