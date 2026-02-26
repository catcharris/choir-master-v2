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
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 transition-colors duration-500">
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0">
                    <Home size={18} />
                </Link>

                {/* 3-Tier Mode Switcher */}
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

                <div className={`items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-colors duration-500 hidden lg:flex ${isRecordingMaster ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    <SignalHigh size={18} className={isRecordingMaster ? "animate-pulse" : ""} />
                    ROOM {roomId} {isRecordingMaster && "• REC"}
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-sm font-medium whitespace-nowrap shrink-0">
                    <Users size={16} className="shrink-0" />
                    <span>{satelliteCount} 단원</span>
                </div>

                {/* Harmony Analysis Monitor */}
                <div className="hidden md:flex flex-col justify-center items-center px-4 py-1 rounded-xl bg-slate-950/50 border border-slate-800/80 shadow-inner min-w-[100px]">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Live Harmony</span>
                    {activeChord ? (
                        <span className="text-sm font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                            {activeChord.name}
                        </span>
                    ) : (
                        <span className="text-sm font-bold text-slate-700">
                            ---
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-end">
                {/* ---------- CONDUCTOR TAB ---------- */}
                {viewMode === 'conductor' && (
                    <>
                        <MetronomeControl />
                        {/* View Score Button (only if scores exist) */}
                        {hasScore && (
                            <button
                                onClick={onOpenScore}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                <Presentation size={16} />
                                <span className="hidden sm:inline">악보 열람</span>
                            </button>
                        )}

                        {/* Maestro Cam Toggle Button */}
                        <button
                            onClick={onToggleCam}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg shadow-black/20 ${isCamActive ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                        >
                            {isCamActive ? <Video size={16} className="animate-pulse" /> : <VideoOff size={16} />}
                            <span className="hidden sm:inline">
                                {isCamActive ? '지휘자 캠 송출 중' : '지휘자 캠 켜기'}
                            </span>
                        </button>
                    </>
                )}

                {/* ---------- MANAGER TAB ---------- */}
                {viewMode === 'manager' && (
                    <>
                        <button
                            onClick={onToggleStudioMode}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg shadow-black/20 ${isStudioMode ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                            title="위성 기기의 녹음을 고음질 비압축 WAV로 강제합니다."
                        >
                            <span className="relative flex h-2.5 w-2.5 mr-1">
                                {isStudioMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isStudioMode ? 'bg-indigo-300' : 'bg-slate-600'}`}></span>
                            </span>
                            <span className="hidden sm:inline">스튜디오 모드</span>
                        </button>

                        <label className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg cursor-pointer ${mrUrl ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-black/20'} ${isUploadingMR ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Music size={16} />
                            <span className="hidden sm:inline">
                                {isUploadingMR ? '업로드 중...' : mrUrl ? 'MR 전송 완료' : 'MR 반주 올리기'}
                            </span>
                            <input
                                type="file"
                                accept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.mp4,.mov,*/*"
                                onChange={onMRUpload}
                                disabled={isUploadingMR}
                                className="hidden"
                            />
                        </label>

                        <label className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-black/20 ${isUploadingScore ? 'opacity-50 pointer-events-none' : ''}`}>
                            <FileImage size={16} />
                            <span className="hidden sm:inline">
                                {isUploadingScore ? '업로드 중...' : '새 악보 송출'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={onScoreUpload}
                                disabled={isUploadingScore}
                                className="hidden"
                            />
                        </label>

                        <button
                            onClick={onOpenDrawer}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded-xl transition-colors shadow-lg shadow-black/20"
                        >
                            <FolderOpen size={16} />
                            <span className="hidden lg:inline">음원함</span>
                        </button>

                        <button
                            onClick={onToggleRecord}
                            disabled={satelliteCount === 0}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${isRecordingMaster ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${isRecordingMaster ? 'bg-white' : 'bg-red-500'}`} />
                            <span className="hidden sm:inline">
                                {isRecordingMaster ? '녹음 종료 (전송)' : '전체 위성 녹음'}
                            </span>
                            <span className="sm:hidden">
                                {isRecordingMaster ? '종료' : '전체 녹음'}
                            </span>
                        </button>
                    </>
                )}

                {/* Common Disconnect Button */}
                <button
                    onClick={onDisconnect}
                    className="flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold rounded-xl transition-colors"
                    title="방 종료"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline ml-2">종료</span>
                </button>
            </div>
        </header>
    );
}
