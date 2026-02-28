import React, { useState, useEffect } from 'react';
import { X, Presentation, Wand2, Type, Send, Share, Copy, Download, CloudUpload, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadLyrics } from '@/lib/lyricsUtils';

interface MasterScoreModalProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    scoreUrls: string[];
    currentPage: number;
    onPageSync: (pageIndex: number) => void;
    allLyrics: string[];
    onUpdateAllLyrics: (lyrics: string[]) => void;
    onForceSyncCurrentLyrics: (lyrics: string) => void;
}

export function MasterScoreModal({
    roomId,
    isOpen,
    onClose,
    scoreUrls,
    currentPage,
    onPageSync,
    allLyrics,
    onUpdateAllLyrics,
    onForceSyncCurrentLyrics
}: MasterScoreModalProps) {
    const [currentIndex, setCurrentIndex] = useState(currentPage);

    // AI Lyrics States (V2 - Auto extract)
    const [isExtractingAll, setIsExtractingAll] = useState(false);
    const [extractProgress, setExtractProgress] = useState(0);
    const [lyrics, setLyrics] = useState('');
    const [isEditingLyrics, setIsEditingLyrics] = useState(false);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [exportTitle, setExportTitle] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Sync current page lyrics when page changes
    useEffect(() => {
        if (allLyrics && allLyrics[currentIndex] !== undefined) {
            setLyrics(allLyrics[currentIndex]);
        } else {
            setLyrics('');
        }
    }, [currentIndex, allLyrics]);

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

    const handleExtractAllLyrics = async () => {
        if (scoreUrls.length === 0) return;

        setIsExtractingAll(true);
        setExtractProgress(0);

        const newAllLyrics = [...allLyrics];
        // Ensure array is size of scoreUrls
        while (newAllLyrics.length < scoreUrls.length) newAllLyrics.push('');

        for (let i = 0; i < scoreUrls.length; i++) {
            // Skip if already extracted
            if (newAllLyrics[i].trim() !== '') {
                setExtractProgress((prev) => prev + 1);
                continue;
            }

            try {
                const targetUrl = scoreUrls[i];
                const res = await fetch('/api/extract/lyrics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: targetUrl })
                });

                const data = await res.json();

                if (res.ok && data.lyrics) {
                    newAllLyrics[i] = data.lyrics;
                    // Provide real-time local feedback to Conductor if on the same page
                    if (currentIndex === i) {
                        setLyrics(data.lyrics);
                    }
                } else {
                    toast.error(`${i + 1}번째 페이지 추출 실패`);
                }
            } catch (error) {
                console.error(error);
                toast.error(`${i + 1}번째 페이지 AI 연결 오류`);
            }
            setExtractProgress((prev) => prev + 1);
        }

        // Now broadcast the complete array to satellites and update master state
        onUpdateAllLyrics(newAllLyrics);
        toast.success('전곡 가사 자동 추출이 완료되었습니다!');
        setIsExtractingAll(false);
    };

    const handleSaveLyrics = () => {
        const newAllLyrics = [...allLyrics];
        newAllLyrics[currentIndex] = lyrics;
        onUpdateAllLyrics(newAllLyrics);
        onForceSyncCurrentLyrics(lyrics); // Manual override: wake satellites
        toast.success(`${currentIndex + 1}페이지 자막을 저장 & 연동했습니다!`);
        setIsEditingLyrics(false);
    };

    const getCompiledLyrics = () => allLyrics.filter(l => l.trim() !== '').join('\n\n');

    const handleCopyLyrics = async () => {
        const text = getCompiledLyrics();
        if (!text) return toast.error("추출된 가사가 없습니다.");
        try {
            await navigator.clipboard.writeText(text);
            toast.success("전체 가사가 클립보드에 복사되었습니다!");
        } catch (e) {
            toast.error("복사 실패");
        }
    };

    const handleDownloadLyrics = () => {
        const text = getCompiledLyrics();
        if (!text) return toast.error("추출된 가사가 없습니다.");
        const title = exportTitle.trim() || 'Untitled_Lyrics';
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("텍스트 파일이 다운로드되었습니다.");
    };

    const handleSaveToCloud = async () => {
        const text = getCompiledLyrics();
        if (!text) return toast.error("추출된 가사가 없습니다.");
        const title = exportTitle.trim();
        if (!title) return toast.error("곡명-작곡가를 입력해주세요.");

        setIsExporting(true);
        const path = await uploadLyrics(roomId, title, text);
        setIsExporting(false);

        if (path) {
            toast.success("클라우드 서버에 안전하게 가사가 저장되었습니다!");
            setShowExportPanel(false);
            setIsEditingLyrics(false);
        } else {
            toast.error("업로드에 실패했습니다.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            {/* Unified Top Navigation Header */}
            <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-between pointer-events-none">
                {/* Left: Close Button */}
                <button
                    onClick={onClose}
                    className="pointer-events-auto flex items-center gap-2 pl-2 pr-4 py-2 bg-black/40 hover:bg-black/80 border border-white/10 text-white/80 hover:text-white rounded-full backdrop-blur-md shadow-2xl transition-all active:scale-95 group shrink-0"
                >
                    <div className="p-1 bg-white/10 rounded-full group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors shrink-0">
                        <X size={18} />
                    </div>
                    <span className="font-bold text-sm whitespace-nowrap">악보 닫기</span>
                </button>

                {/* Right: Page Indicator & AI Actions */}
                <div className="flex flex-col items-end gap-2 text-right pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsEditingLyrics(!isEditingLyrics)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border shadow-xl transition-all font-bold text-sm backdrop-blur-md shrink-0 whitespace-nowrap ${isEditingLyrics ? "bg-amber-500 text-black border-amber-400" : "bg-black/60 text-white/80 hover:text-white border-white/10 hover:bg-black/80"}`}
                        >
                            <Type size={16} className="shrink-0" />
                            <span>자막 편집</span>
                        </button>

                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full shadow-2xl flex items-center justify-center gap-3 shrink-0 whitespace-nowrap">
                            <span className="font-black text-xl tracking-wider text-emerald-400">
                                {scoreUrls.length === 0 ? "대기 중" : `${currentIndex + 1} / ${scoreUrls.length}`}
                            </span>
                            <Presentation size={20} className="text-emerald-400/80 animate-pulse shrink-0" />
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
                        <div className="absolute right-4 sm:right-8 top-24 bottom-8 w-[90%] sm:w-[500px] max-w-lg bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right text-slate-100">
                            {showExportPanel ? (
                                <>
                                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50 shrink-0">
                                        <button onClick={() => setShowExportPanel(false)} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-sm">
                                            <ChevronLeft size={18} /> 뒤로
                                        </button>
                                        <h3 className="font-bold flex items-center gap-2 opacity-90 text-sm">
                                            <Share size={16} className="text-emerald-400" />
                                            가사 편집 완료 & 공유
                                        </h3>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                                        <div className="space-y-2 shrink-0">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">파일 이름 지정</label>
                                            <input
                                                type="text"
                                                value={exportTitle}
                                                onChange={(e) => setExportTitle(e.target.value)}
                                                placeholder="예: 내 영혼 바람되어 - 김효근"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 font-bold"
                                            />
                                            <p className="text-[11px] text-slate-500">.txt 파일의 이름표로 사용됩니다.</p>
                                        </div>

                                        <div className="bg-black/20 rounded-xl p-2 sm:p-4 border border-white/5 space-y-2 shrink-0">
                                            <button onClick={handleCopyLyrics} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-4"><Copy size={20} className="text-indigo-400" /><div className="text-left"><p className="font-bold text-[15px]">텍스트 복사</p><p className="text-[11px] text-slate-400">클립보드에 복사하여 카톡/슬랙 전송</p></div></div>
                                            </button>
                                            <div className="h-px w-full bg-white/5" />
                                            <button onClick={handleDownloadLyrics} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-4"><Download size={20} className="text-sky-400" /><div className="text-left"><p className="font-bold text-[15px]">기기에 다운로드</p><p className="text-[11px] text-slate-400">스마트폰이나 PC에 .txt 문서 포맷으로 즉시 다운로드합니다.</p></div></div>
                                            </button>
                                            <div className="h-px w-full bg-white/5" />
                                            <button onClick={handleSaveToCloud} disabled={isExporting} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors disabled:opacity-50">
                                                <div className="flex items-center gap-4"><CloudUpload size={20} className="text-emerald-400" /><div className="text-left"><p className="font-bold text-[15px]">서버에 보관</p><p className="text-[11px] text-slate-400">연습실 스토리지 데이터베이스에 안전하게 가사를 영구 저장합니다.</p></div></div>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50 shrink-0">
                                        <h3 className="font-bold flex items-center gap-2 opacity-90 text-sm">
                                            <Wand2 size={16} className="text-indigo-400" />
                                            AI 자막 추출기
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowExportPanel(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-full text-xs font-bold transition-colors">
                                                <Share size={12} />
                                                에디팅 완료 & 내보내기
                                            </button>
                                            <button onClick={() => setIsEditingLyrics(false)} className="text-slate-400 hover:text-white p-1 xl:ml-2">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col gap-3 min-h-0">
                                        <div className="shrink-0 flex items-center gap-2">
                                            <button
                                                onClick={handleExtractAllLyrics}
                                                disabled={isExtractingAll}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold transition-all active:scale-95 shadow-lg"
                                            >
                                                {isExtractingAll ? (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        ({extractProgress}/{scoreUrls.length})
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Wand2 size={18} />
                                                        전체 자동 추출
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="flex-1 relative mt-1">
                                            <textarea
                                                value={lyrics}
                                                onChange={(e) => setLyrics(e.target.value)}
                                                placeholder="AI가 추출한 가사가 이곳에 표시됩니다. 추출 버튼을 눌러보세요. (현재 페이지: ${currentIndex + 1})"
                                                className="w-full h-full bg-black/40 border border-white/10 rounded-xl p-4 text-base sm:text-lg leading-relaxed font-bold focus:outline-none focus:border-indigo-500 resize-none placeholder:text-slate-600 text-white"
                                            />
                                            {lyrics && (
                                                <div className="absolute top-2 right-2 text-xs text-slate-500 bg-black/60 px-2 py-1 rounded-md">
                                                    수정 가능
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-white/10 bg-slate-800/50 shrink-0">
                                        <button
                                            onClick={handleSaveLyrics}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-sm lg:text-base rounded-xl transition-all shadow-lg active:scale-95"
                                        >
                                            <Send size={18} />
                                            현재 페이지 자막 연동
                                        </button>
                                    </div>
                                </>
                            )}
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
