import React, { useState, useEffect } from 'react';
import { X, Presentation, Wand2, Type, Send, Share, Copy, Download, CloudUpload, ChevronLeft, CloudDownload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadLyrics, fetchSavedLyrics, deleteSavedLyrics } from '@/lib/lyricsUtils';

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
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [isDeletingCloud, setIsDeletingCloud] = useState(false);

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
                    toast.error(`${i + 1}번째 페이지 추출 실패: ${data.error || 'Unknown Error'}`);
                }
            } catch (error: any) {
                console.error(error);
                toast.error(`${i + 1}번째 페이지 AI 연결 오류: ${error.message || 'Unknown Error'}`);
            }
            setExtractProgress((prev) => prev + 1);
        }

        // Now broadcast the complete array to satellites and update master state
        onUpdateAllLyrics(newAllLyrics);

        const successCount = newAllLyrics.filter((l, idx) => l.trim() !== '' && allLyrics[idx]?.trim() === '').length;
        if (successCount > 0) {
            toast.success(`전곡 가사 추출이 완료되었습니다! (${successCount}장 성공)`);
        } else {
            toast.error('모든 페이지의 가사 추출에 실패했습니다.');
        }

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
        const { path, errorMsg } = await uploadLyrics(roomId, title, text);
        setIsExporting(false);

        if (path) {
            toast.success("클라우드 서버에 안전하게 가사가 저장되었습니다!");
            setShowExportPanel(false);
            setIsEditingLyrics(false);
        } else {
            toast.error(`🚨 서버 보관 오류: ${errorMsg}`);
        }
    };

    const handleLoadFromCloud = async () => {
        setIsLoadingCloud(true);
        const { text, errorMsg, lastModified } = await fetchSavedLyrics(roomId);
        setIsLoadingCloud(false);

        if (text) {
            // Distribute the loaded text across pages.
            // A simple implementation: put everything on the first page, or split by \n\n if formatted that way.
            const newAllLyrics = [...allLyrics];
            newAllLyrics.fill(''); // Clear current

            // If the text has double newlines, try to map them to pages, otherwise dump on page 1
            const chunks = text.split('\n\n');
            for (let i = 0; i < chunks.length && i < scoreUrls.length; i++) {
                newAllLyrics[i] = chunks[i];
            }
            if (chunks.length > scoreUrls.length) {
                // If more chunks than pages, append the rest to the last page
                newAllLyrics[scoreUrls.length - 1] = chunks.slice(scoreUrls.length - 1).join('\n\n');
            }

            onUpdateAllLyrics(newAllLyrics);
            // Update local view if we are on a page that got text
            setLyrics(newAllLyrics[currentIndex] || '');

            toast.success(`마지막 백업 가사를 불러왔습니다!\n(저장 일시: ${lastModified || '알 수 없음'})`, { duration: 4000 });
            setShowExportPanel(false);
        } else {
            toast.error(`🚨 불러오기 오류: ${errorMsg}`);
        }
    };

    const handleDeleteFromCloud = async () => {
        if (!confirm("⚠️ 주의 ⚠️\n현재 방(Room)에 저장되어 있는 '모든 가사 백업본'을 완전히 삭제하시겠습니까?\n(가사 파일만 삭제되며 악보나 음원은 유지됩니다. 복구 불가)")) return;

        setIsDeletingCloud(true);
        const { success, errorMsg } = await deleteSavedLyrics(roomId);
        setIsDeletingCloud(false);

        if (success) {
            toast.success("현재 방에 저장된 모든 가사 백업본이 삭제되었습니다.");
        } else {
            toast.error(`🚨 삭제 오류: ${errorMsg}`);
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
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border shadow-xl transition-all font-bold text-sm backdrop-blur-md shrink-0 whitespace-nowrap ${isEditingLyrics ? "bg-amber-500 text-black border-amber-400" : "bg-black/60 text-white/80 hover:text-white border-white/10 hover:bg-black/80"} `}
                        >
                            <Type size={16} className="shrink-0" />
                            <span>자막 편집</span>
                        </button>

                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full shadow-2xl flex items-center justify-center gap-3 shrink-0 whitespace-nowrap">
                            <span className="font-black text-xl tracking-wider text-emerald-400">
                                {scoreUrls.length === 0 ? "대기 중" : `${currentIndex + 1} / ${scoreUrls.length}`}
                            </span >
                            <Presentation size={20} className="text-emerald-400/80 animate-pulse shrink-0" />
                        </div >
                    </div >

                    <div className="hidden sm:block text-white/40 text-xs font-bold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                        화면 좌/우측을 터치하여 페이지 이동
                    </div>
                </div >
            </div >

            {
                scoreUrls.length > 0 ? (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center p-0 m-0 z-0 bg-black">

                        {/* Fullscreen Image Container (Preloaded in DOM) */}
                        <div className="w-full h-full flex items-center justify-center relative p-0 m-0 overflow-hidden">
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
                            <div className="absolute right-4 sm:right-8 top-24 bottom-8 w-[90%] sm:w-[500px] max-w-lg bg-slate-900/40 backdrop-blur-[40px] border border-white/10 rounded-[2rem] shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right text-slate-100">
                                {showExportPanel ? (
                                    <>
                                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                                            <button onClick={() => setShowExportPanel(false)} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-sm">
                                                <ChevronLeft size={18} /> 뒤로
                                            </button>
                                            <h3 className="font-bold flex items-center gap-2 opacity-90 text-sm">
                                                <Share size={16} className="text-emerald-400" />
                                                가사 편집 완료 & 공유
                                            </h3>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-3 shrink-0">
                                                <label className="text-xs font-black text-white/50 uppercase tracking-widest pl-1">파일 이름 지정</label>
                                                <input
                                                    type="text"
                                                    value={exportTitle}
                                                    onChange={(e) => setExportTitle(e.target.value)}
                                                    placeholder="예: 내 영혼 바람되어 - 김효근"
                                                    className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-base focus:outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/50 placeholder:text-white/20 font-bold transition-all text-white/90 shadow-inner"
                                                />
                                                <p className="text-xs text-white/40 pl-1">.txt 파일의 이름표로 사용됩니다.</p>
                                            </div>

                                            <div className="bg-black/20 rounded-[1.5rem] p-2 sm:p-3 border border-white/10 space-y-1 shrink-0 backdrop-blur-md shadow-inner">
                                                <button onClick={handleCopyLyrics} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group">
                                                    <div className="flex items-center gap-5"><div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors border border-indigo-500/20"><Copy size={20} className="text-indigo-400" /></div><div className="text-left"><p className="font-bold text-[15px] text-white/90 group-hover:text-white transition-colors tracking-wide">텍스트 복사</p><p className="text-xs text-white/40 tracking-wide mt-0.5">클립보드에 복사하여 붙여넣기</p></div></div>
                                                </button>
                                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                <button onClick={handleDownloadLyrics} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group">
                                                    <div className="flex items-center gap-5"><div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/30 transition-colors border border-sky-500/20"><Download size={20} className="text-sky-400" /></div><div className="text-left"><p className="font-bold text-[15px] text-white/90 group-hover:text-white transition-colors tracking-wide">기기에 다운로드</p><p className="text-xs text-white/40 tracking-wide mt-0.5">.txt 문서 포맷으로 즉시 저장</p></div></div>
                                                </button>
                                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                <button onClick={handleSaveToCloud} disabled={isExporting || isLoadingCloud || isDeletingCloud} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors disabled:opacity-50">
                                                    <div className="flex items-center gap-4"><CloudUpload size={20} className="text-emerald-400" /><div className="text-left"><p className="font-bold text-[15px]">서버에 보관</p><p className="text-[11px] text-slate-400">데이터베이스에 현재 가사를 영구 백업합니다.</p></div></div>
                                                </button>
                                                <div className="h-px w-full bg-white/5" />
                                                <button onClick={handleLoadFromCloud} disabled={isExporting || isLoadingCloud || isDeletingCloud} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors disabled:opacity-50">
                                                    <div className="flex items-center gap-4"><CloudDownload size={20} className="text-amber-400" /><div className="text-left"><p className="font-bold text-[15px]">서버에서 불러오기</p><p className="text-[11px] text-slate-400">클라우드에 저장된 가장 마지막 백업 버전을 불러옵니다.</p></div></div>
                                                </button>
                                                <div className="h-px w-full bg-white/5" />
                                                <button onClick={handleDeleteFromCloud} disabled={isExporting || isLoadingCloud || isDeletingCloud} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-50 group">
                                                    <div className="flex items-center gap-4"><Trash2 size={20} className="text-red-400 group-hover:text-red-300" /><div className="text-left"><p className="font-bold text-[15px] text-red-400 group-hover:text-red-300">현재 방의 모든 백업 초기화 (일괄 삭제)</p><p className="text-[11px] text-red-400/70">이 방(Room)에 저장된 모든 가사 텍스트 파일들을 깔끔하게 지웁니다.</p></div></div>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0 rounded-t-[2rem]">
                                            <h3 className="font-black flex items-center gap-2 opacity-100 text-sm tracking-wide">
                                                <Wand2 size={18} className="text-indigo-400" />
                                                AI 자막 추출기 <span className="text-[10px] text-white/30 font-normal">v1.2</span>
                                            </h3>
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <button onClick={() => setShowExportPanel(true)} className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/5 text-white rounded-full text-xs font-bold transition-all backdrop-blur-md shadow-sm active:scale-95">
                                                    <Share size={14} />
                                                    <span className="hidden sm:inline">에디팅 완료 & 내보내기</span>
                                                    <span className="sm:hidden">공유</span>
                                                </button>
                                                <button onClick={() => setIsEditingLyrics(false)} className="flex items-center justify-center w-8 h-8 rounded-full bg-black/20 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col gap-3 min-h-0">
                                            <div className="shrink-0 flex items-center gap-2">
                                                <button
                                                    onClick={handleExtractAllLyrics}
                                                    disabled={isExtractingAll}
                                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-500/80 to-purple-600/80 hover:from-indigo-400 hover:to-purple-500 disabled:from-white/5 disabled:to-white/5 disabled:border-white/5 border border-white/10 text-white font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-md"
                                                >
                                                    {isExtractingAll ? (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            <span className="font-bold tracking-wider">추출 중... ({extractProgress}/{scoreUrls.length})</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Wand2 size={18} className="sm:w-5 sm:h-5" />
                                                            <span className="text-sm sm:text-base tracking-wide whitespace-nowrap">
                                                                <span className="hidden sm:inline">전체 페이지 </span>자동 추출
                                                            </span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="flex-1 relative mt-2 mb-2">
                                                <textarea
                                                    value={lyrics}
                                                    onChange={(e) => setLyrics(e.target.value)}
                                                    onBlur={() => {
                                                        if (allLyrics[currentIndex] !== lyrics) {
                                                            const newAllLyrics = [...allLyrics];
                                                            newAllLyrics[currentIndex] = lyrics;
                                                            onUpdateAllLyrics(newAllLyrics);
                                                        }
                                                    }}
                                                    placeholder={`AI가 추출한 가사가 이곳에 표시됩니다.\n추출 버튼을 눌러보세요.\n\n(현재 페이지: ${currentIndex + 1})`}
                                                    className="w-full h-full bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 text-base sm:text-lg tracking-wide leading-relaxed font-bold focus:outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/50 focus:bg-black/40 transition-all resize-none placeholder:text-white/20 text-white/90 shadow-inner custom-scrollbar"
                                                />
                                                {lyrics && (
                                                    <div className="absolute bottom-4 right-4 text-[10px] font-black tracking-widest uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                                                        EDITING
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile-Friendly Page Turners within the Editor Box */}
                                            <div className="shrink-0 flex items-center justify-between gap-4 mt-1 mb-2">
                                                <button
                                                    onClick={handlePrev}
                                                    disabled={currentIndex === 0}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm font-bold text-white/80"
                                                >
                                                    〈 이전 장
                                                </button>
                                                <span className="text-xs font-black tracking-widest text-white/50 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                                                    {currentIndex + 1} / {scoreUrls.length}
                                                </span>
                                                <button
                                                    onClick={handleNext}
                                                    disabled={currentIndex >= scoreUrls.length - 1}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm font-bold text-white/80"
                                                >
                                                    다음 장 〉
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5 border-t border-slate-700 bg-slate-800 shrink-0 rounded-b-[2rem]">
                                            <button
                                                onClick={handleSaveLyrics}
                                                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 hover:border-indigo-400 border border-transparent disabled:bg-slate-700 disabled:text-white/30 text-white font-black text-base rounded-2xl transition-all shadow-lg active:scale-95 relative overflow-hidden group"
                                            >
                                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                                                <Send size={18} className="relative z-10" />
                                                <span className="relative z-10 tracking-wide">현재 페이지 자막 연동 및 저장</span>
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
                )
            }
        </div >
    );
}
