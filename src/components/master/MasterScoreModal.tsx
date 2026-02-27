import React, { useState, useEffect } from 'react';
import { X, Presentation, Wand2, Type, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface MasterScoreModalProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    scoreUrls: string[];
    currentPage: number;
    onPageSync: (pageIndex: number) => void;
    onBroadcastLyrics: (lyrics: string) => void;
}

export function MasterScoreModal({
    roomId,
    isOpen,
    onClose,
    scoreUrls,
    currentPage,
    onPageSync,
    onBroadcastLyrics
}: MasterScoreModalProps) {
    const [currentIndex, setCurrentIndex] = useState(currentPage);

    // AI Lyrics States
    const [isExtracting, setIsExtracting] = useState(false);
    const [lyrics, setLyrics] = useState('');
    const [isEditingLyrics, setIsEditingLyrics] = useState(false);

    // Keyboard support for Bluetooth Pedals (PageTurners)
    useEffect(() => {
        if (!isOpen || scoreUrls.length === 0 || isEditingLyrics) return;

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
    }, [isOpen, currentIndex, scoreUrls.length, isEditingLyrics]);

    // Sync on open or when external currentPage changes from another Master
    useEffect(() => {
        if (isOpen && scoreUrls.length > 0) {
            if (currentPage >= scoreUrls.length) {
                const maxPageIndex = scoreUrls.length - 1;
                setCurrentIndex(maxPageIndex);
                if (currentPage !== maxPageIndex) {
                    onPageSync(maxPageIndex);
                }
            } else {
                setCurrentIndex(currentPage);
                // Trigger a sync broadast just to ensure satellites are completely aligned when opening
                onPageSync(currentPage);
            }
        }
    }, [isOpen, scoreUrls.length, currentPage]);

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

    const handleExtractLyrics = async () => {
        if (scoreUrls.length === 0) return;

        setIsExtracting(true);
        // Only extract from the first page for now, or the current page
        const targetUrl = scoreUrls[currentIndex];

        try {
            const res = await fetch('/api/extract/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: targetUrl })
            });

            const data = await res.json();

            if (res.ok && data.lyrics) {
                setLyrics(data.lyrics);
                setIsEditingLyrics(true);
                toast.success('AI가 가사를 성공적으로 추출했습니다.');
            } else {
                toast.error(`가사 추출 실패: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('AI 연결 중 오류가 발생했습니다.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSendLyrics = () => {
        onBroadcastLyrics(lyrics);
        toast.success('단원들에게 자막을 전송했습니다!');
        setIsEditingLyrics(false);
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

                {/* Right: Page Indicator & AI Actions */}
                <div className="flex flex-col items-end gap-2 text-right pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsEditingLyrics(!isEditingLyrics)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-xl transition-all font-bold text-sm backdrop-blur-md ${isEditingLyrics ? "bg-amber-500 text-black border-amber-400" : "bg-black/60 text-white/80 hover:text-white border-white/10 hover:bg-black/80"}`}
                        >
                            <Type size={16} />
                            자막 편집
                        </button>

                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full shadow-2xl flex items-center gap-3">
                            <span className="font-black text-xl tracking-wider text-emerald-400">
                                {scoreUrls.length === 0 ? "대기 중" : `${currentIndex + 1} / ${scoreUrls.length}`}
                            </span>
                            <Presentation size={20} className="text-emerald-400/80 animate-pulse" />
                        </div>
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

                    {/* AI Lyrics Editor Overlay */}
                    {isEditingLyrics && (
                        <div className="absolute right-4 sm:right-8 top-24 bottom-8 w-[90%] sm:w-[400px] max-w-sm bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right text-slate-100">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                                <h3 className="font-bold flex items-center gap-2 opacity-90">
                                    <Wand2 size={16} className="text-indigo-400" />
                                    AI 자막/가사 추출기
                                </h3>
                                <button onClick={() => setIsEditingLyrics(false)} className="text-slate-400 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-4 flex-1 flex flex-col gap-3">
                                <button
                                    onClick={handleExtractLyrics}
                                    disabled={isExtracting}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold transition-all active:scale-95 shadow-lg"
                                >
                                    {isExtracting ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Wand2 size={18} />
                                            현재 페이지에서 가사 추출
                                        </>
                                    )}
                                </button>

                                <div className="flex-1 relative">
                                    <textarea
                                        value={lyrics}
                                        onChange={(e) => setLyrics(e.target.value)}
                                        placeholder="AI가 추출한 가사가 이곳에 표시됩니다. 추출 버튼을 눌러보세요."
                                        className="w-full h-full bg-black/40 border border-white/10 rounded-xl p-4 text-base leading-relaxed font-mono focus:outline-none focus:border-indigo-500 resize-none placeholder:text-slate-600"
                                    />
                                    {lyrics && (
                                        <div className="absolute top-2 right-2 text-xs text-slate-500 bg-black/60 px-2 py-1 rounded-md">
                                            수정 가능
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/10 bg-slate-800/50">
                                <button
                                    onClick={handleSendLyrics}
                                    disabled={!lyrics.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-lg rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    <Send size={18} />
                                    위성으로 자막 쏘기!
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            ) : (
                <div className="text-slate-500 text-lg font-bold">
                    [악보 올리기] 버튼을 눌러 이미지 파일을 업로드하세요.
                </div>
            )}
        </div>
    );
}
