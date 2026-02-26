import Link from 'next/link';
import { Home, SignalHigh, Users, FolderOpen, LogOut, Music, FileImage, Video, VideoOff, Presentation } from 'lucide-react';
import { MetronomeControl } from './MetronomeControl';
import { DetectedChord } from '@/lib/chordDetector';

interface MasterHeaderProps {
    roomId: string;
    satelliteCount: number;
    isRecordingMaster: boolean;
    isUploadingMR: boolean;
    mrUrl: string | null;
    onToggleRecord: () => void;
    onMRUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onScoreUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    isUploadingScore: boolean;
    isCamActive: boolean;
    onToggleCam: () => void;
    onOpenDrawer: () => void;
    hasScore: boolean;
    onOpenScore: () => void;
    onDisconnect: () => void;
    viewMode: 'conductor' | 'manager';
    onSwitchMode: (mode: 'conductor' | 'manager') => void;
    isStudioMode: boolean;
    onToggleStudioMode: () => void;
    activeChord: DetectedChord | null;
}

export function MasterHeader({
    roomId,
    satelliteCount,
    isRecordingMaster,
    isUploadingMR,
    mrUrl,
    onToggleRecord,
    onMRUpload,
    onScoreUpload,
    isUploadingScore,
    isCamActive,
    onToggleCam,
    onOpenDrawer,
    hasScore,
    onOpenScore,
    onDisconnect,
    viewMode,
    onSwitchMode,
    isStudioMode,
    onToggleStudioMode,
    activeChord
}: MasterHeaderProps) {
    return (
        <header className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 transition-colors duration-500">
            {/* Top Row on Mobile / Left Side on Desktop */}
            <div className="flex items-center justify-between xl:justify-start gap-2 sm:gap-4 w-full xl:w-auto overflow-x-auto hide-scrollbar shrink-0 pb-1 xl:pb-0">
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <Link href="/" className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0">
                        <Home size={18} />
                    </Link>

                    {/* Mode Switcher */}
                    <div className="bg-slate-950 p-1 rounded-xl flex items-center shadow-inner border border-slate-800 flex-shrink-0">
                        <button
                            onClick={() => onSwitchMode('conductor')}
                            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap break-keep ${viewMode === 'conductor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                            🎼 <span className="inline-block">지휘 탭</span>
                        </button>
                        <button
                            onClick={() => onSwitchMode('manager')}
                            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap break-keep ${viewMode === 'manager' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                            🎛️ <span className="inline-block">테크 탭</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className={`items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-colors duration-500 hidden lg:flex shrink-0 ${isRecordingMaster ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        <SignalHigh size={18} className={isRecordingMaster ? "animate-pulse" : ""} />
                        ROOM {roomId} {isRecordingMaster && "• REC"}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-sm font-medium whitespace-nowrap shrink-0">
                        <Users size={16} className="shrink-0" />
                        <span>{satelliteCount} 단원</span>
                    </div>

                    {/* Maestro Cam Toggle Button (Moved to top row) */}
                    {viewMode === 'conductor' && (
                        <button
                            onClick={onToggleCam}
                            className={`flex shrink-0 items-center justify-center w-10 h-10 sm:w-auto sm:px-3 sm:py-2 text-sm font-bold rounded-xl transition-colors shadow-lg shadow-black/20 ${isCamActive ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                            title="지휘자 캠 송출"
                        >
                            {isCamActive ? <Video size={16} className="animate-pulse" /> : <VideoOff size={16} />}
                            <span className="hidden sm:inline sm:ml-2">
                                {isCamActive ? '캠 송출 중' : '지휘자 캠'}
                            </span>
                        </button>
                    )}

                    {/* Common Disconnect Button (Moved to top row) */}
                    <button
                        onClick={onDisconnect}
                        className="flex shrink-0 items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold rounded-xl transition-colors"
                        title="방 종료"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline sm:ml-2">종료</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row on Mobile / Right Side on Desktop */}
            <div className="flex items-center gap-2 xl:gap-3 justify-start xl:justify-end w-full xl:w-auto overflow-x-auto hide-scrollbar pb-1 xl:pb-0 shrink-0">
                {/* ---------- CONDUCTOR TAB ---------- */}
                {viewMode === 'conductor' && (
                    <div className="flex items-center gap-2 xl:gap-3 w-full xl:w-auto overflow-x-auto hide-scrollbar pb-1 xl:pb-0 shrink-0">
                        {/* Harmony Analysis Monitor (Conductor only) */}
                        <div className={`flex items-center justify-center h-[36px] w-[calc(50%-0.25rem)] xl:max-w-none xl:w-auto shrink-0 gap-1 sm:gap-2 px-2 sm:px-3 rounded-xl font-bold transition-colors duration-500 border ${activeChord ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-inner' : 'bg-slate-800 text-slate-500 border-slate-700/50 shadow-sm'}`}>
                            <span className="text-[10px] md:text-xs uppercase tracking-widest opacity-80 mt-0.5">Harmony</span>
                            <span className="text-sm sm:text-base font-black whitespace-nowrap min-w-[30px] sm:min-w-[34px] text-center tracking-tighter">
                                {activeChord ? activeChord.name : '---'}
                            </span>
                        </div>

                        <div className="w-[calc(50%-0.25rem)] max-w-[180px] xl:max-w-none xl:w-auto shrink-0 flex items-center justify-center">
                            <MetronomeControl className="w-full" />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
