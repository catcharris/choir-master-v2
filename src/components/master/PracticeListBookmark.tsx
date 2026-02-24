import React, { useState } from 'react';
import { Bookmark, X, ListMusic } from 'lucide-react';

export function PracticeListBookmark() {
    const [isOpen, setIsOpen] = useState(false);
    const [songs, setSongs] = useState([
        "1. 영광의 주님 찬양",
        "2. 내 영혼이 은총 입어",
        "3. 아 하나님의 은혜로",
        "4. 주께 영광 돌아가리라"
    ]);

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 group border border-indigo-400/50"
            >
                <Bookmark size={24} className="group-hover:animate-bounce" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sliding Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full bg-gradient-to-br from-indigo-900/20 to-transparent">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3 text-indigo-300">
                            <ListMusic size={24} />
                            <h2 className="text-xl font-bold tracking-tight text-white">오늘의 연습곡</h2>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content (Textarea for simple editing, or simple list) */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                        <p className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            연습할 스코어나 곡 리스트를 메모할 수 있습니다. 각 항목은 클릭해서 직접 편집해 보세요.
                        </p>

                        <div className="flex flex-col gap-2 mt-4">
                            {songs.map((song, i) => (
                                <div key={i} className="group flex items-center bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold mr-3 border border-indigo-500/30 shrink-0">
                                        {i + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={song.replace(/^\d+\.\s*/, '')} // Strip the number for raw edit
                                        onChange={(e) => {
                                            const newSongs = [...songs];
                                            newSongs[i] = `${i + 1}. ${e.target.value}`;
                                            setSongs(newSongs);
                                        }}
                                        className="bg-transparent border-none text-white focus:outline-none focus:ring-0 w-full text-sm font-medium"
                                        placeholder="곡 제목 입력..."
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setSongs([...songs, `${songs.length + 1}. 새로운 연습곡`])}
                            className="mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700 text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <span>+ 곡 추가하기</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
