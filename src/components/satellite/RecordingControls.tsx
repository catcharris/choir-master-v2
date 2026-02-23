import React from 'react';
import { LogOut, Mic, UploadCloud } from 'lucide-react';

interface RecordingControlsProps {
    isRecording: boolean;
    isMrReady: boolean;
    isSoloRecording: boolean;
    onDisconnect: () => void;
    onSoloRecordToggle: () => void;
    hasScores: boolean;
    onOpenScore: () => void;
}

export function RecordingControls({
    isRecording,
    isMrReady,
    isSoloRecording,
    onDisconnect,
    onSoloRecordToggle,
    hasScores,
    onOpenScore
}: RecordingControlsProps) {
    return (
        <div className="w-full flex-shrink-0 pt-4 flex flex-col gap-3 relative z-20">
            {/* 3. Open Score Button */}
            {hasScores && (
                <button
                    onClick={onOpenScore}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-600/40 text-indigo-400 font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/10 active:scale-[0.98]"
                >
                    <UploadCloud size={24} className="rotate-180" />
                    <span className="text-lg">다시 악보 전체화면 보기</span>
                </button>
            )}

            {/* Solo Homework Recording Button */}
            {isMrReady && !isRecording && (
                <button
                    onClick={onSoloRecordToggle}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(5,150,105,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Mic size={22} className={isSoloRecording ? "" : "animate-bounce"} />
                    <span className="text-lg">혼자 연습 (MR 자동재생)</span>
                </button>
            )}

            {isSoloRecording && (
                <button
                    onClick={onSoloRecordToggle}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse hover:scale-[1.02] active:scale-[0.98] border border-red-400"
                >
                    <UploadCloud size={24} />
                    <span className="text-xl tracking-wide">숙제 제출 (녹음 종료)</span>
                </button>
            )}

            <button
                onClick={onDisconnect}
                disabled={isSoloRecording || isRecording}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800/80 backdrop-blur-xl border border-white/5 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 font-bold rounded-2xl transition-all active:scale-[0.98]"
            >
                <LogOut size={20} />
                연결 종료하고 나가기
            </button>
        </div>
    );
}
