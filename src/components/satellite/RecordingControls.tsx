import { LogOut, UploadCloud, Play, Square } from 'lucide-react';
import { RecordingProfile } from '@/lib/audio/usePitchTracker';

interface RecordingControlsProps {
    isRecording: boolean;
    isMrReady: boolean;
    isSoloRecording: boolean;
    recordingProfile: RecordingProfile;
    setRecordingProfile: (profile: RecordingProfile) => void;
    onDisconnect: () => void;
    onSoloRecordToggle: () => void;
    hasScores: boolean;
    onOpenScore: () => void;
}

export function RecordingControls({
    isRecording,
    isMrReady,
    isSoloRecording,
    recordingProfile,
    setRecordingProfile,
    onDisconnect,
    onSoloRecordToggle,
    hasScores,
    onOpenScore
}: RecordingControlsProps) {
    return (
        <div className="w-full flex-shrink-0 pt-4 flex flex-col gap-3 relative z-20">
            {/* 1. Dynamic Recording Profile Toggle */}
            <div className="w-full space-y-2 mb-2 p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">마이크 수음 범위 실시간 변경 (Gain)</label>
                <div className="flex bg-black/40 rounded-2xl overflow-hidden border border-white/5 w-full p-1">
                    <button
                        type="button"
                        onClick={() => setRecordingProfile('part')}
                        className={`flex-1 py-3 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${recordingProfile === 'part' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        파트<br /><span className="text-[9px] sm:text-[10px] opacity-70 font-normal mt-0.5 block">전체 수음</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRecordingProfile('quartet')}
                        className={`flex-1 py-3 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${recordingProfile === 'quartet' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        중창<br /><span className="text-[9px] sm:text-[10px] opacity-70 font-normal mt-0.5 block">소그룹 수음</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRecordingProfile('solo')}
                        className={`flex-1 py-3 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${recordingProfile === 'solo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        솔로<br /><span className="text-[9px] sm:text-[10px] opacity-70 font-normal mt-0.5 block">원장/차단</span>
                    </button>
                </div>
            </div>
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

            {/* Solo Practice (Play/Stop MR) Button */}
            {(isMrReady && !isRecording) && (
                <button
                    onClick={onSoloRecordToggle}
                    className={`w-full flex items-center justify-center gap-3 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] ${isSoloRecording
                            ? "bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)] hover:scale-[1.02]"
                        }`}
                >
                    {isSoloRecording ? (
                        <>
                            <Square size={20} className="fill-white/80" />
                            <span className="text-xl tracking-wide">혼자 연습 중지</span>
                        </>
                    ) : (
                        <>
                            <Play size={20} className="fill-white/80 ml-1" />
                            <span className="text-lg">혼자 연습 (MR 재생)</span>
                        </>
                    )}
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
