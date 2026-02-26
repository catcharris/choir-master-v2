import React from 'react';
import { Music, FileImage, FolderOpen, RadioReceiver } from 'lucide-react';

interface ManagerConsoleProps {
    roomId: string;
    satelliteCount: number;
    isRecordingMaster: boolean;
    isUploadingMR: boolean;
    mrUrl: string | null;
    onToggleRecord: () => void;
    onMRUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onScoreUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingScore: boolean;
    onOpenDrawer: () => void;
    isStudioMode: boolean;
    onToggleStudioMode: () => void;
}

export function ManagerConsole({
    roomId,
    satelliteCount,
    isRecordingMaster,
    isUploadingMR,
    mrUrl,
    onToggleRecord,
    onMRUpload,
    onScoreUpload,
    isUploadingScore,
    onOpenDrawer,
    isStudioMode,
    onToggleStudioMode
}: ManagerConsoleProps) {
    return (
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
            <h2 className="text-lg sm:text-xl font-black text-slate-200 mb-4 flex items-center gap-2">
                <RadioReceiver className="text-indigo-400" size={20} />
                테크니컬 스튜디오 콘솔
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">

                {/* 1. Studio Mode */}
                <button
                    onClick={onToggleStudioMode}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all shadow-md hover:-translate-y-0.5 ${isStudioMode ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'}`}
                >
                    <div className="relative flex h-6 w-6 items-center justify-center mb-2">
                        {isStudioMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isStudioMode ? 'bg-white' : 'bg-slate-500'}`}></span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">스튜디오 모드</span>
                </button>

                {/* 2. Upload MR */}
                <label className={`flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all shadow-md cursor-pointer hover:-translate-y-0.5 ${mrUrl ? 'bg-green-600 text-white shadow-green-500/30 hover:bg-green-500' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'} ${isUploadingMR ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Music size={24} className="mb-2" />
                    <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                        {isUploadingMR ? '업로드 중...' : mrUrl ? 'MR 완료' : 'MR 올리기'}
                    </span>
                    <input
                        type="file"
                        accept="audio/*,video/*,.mp3,.m4a,.wav,.aac,.mp4,.mov,*/*"
                        onChange={onMRUpload}
                        disabled={isUploadingMR}
                        className="hidden"
                    />
                </label>

                {/* 3. Upload Score */}
                <label className={`flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all shadow-md cursor-pointer bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 ${isUploadingScore ? 'opacity-50 pointer-events-none' : ''}`}>
                    <FileImage size={24} className="mb-2" />
                    <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                        {isUploadingScore ? '업로드 중...' : '악보 송출'}
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

                {/* 4. Audio Drawer */}
                <button
                    onClick={onOpenDrawer}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all shadow-md hover:-translate-y-0.5 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                >
                    <FolderOpen size={24} className="mb-2" />
                    <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">음원함</span>
                </button>

                {/* 5. Master Record */}
                <button
                    onClick={onToggleRecord}
                    disabled={satelliteCount === 0}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 ${isRecordingMaster ? 'bg-red-600 text-white animate-pulse shadow-red-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'}`}
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-white/20 mb-2 ${isRecordingMaster ? 'bg-white/20' : ''}`}>
                        <div className={`w-3 h-3 rounded-full ${isRecordingMaster ? 'bg-white' : 'bg-red-500'}`} />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                        {isRecordingMaster ? '녹음 종료' : '전체 녹음'}
                    </span>
                </button>

            </div>
        </div>
    );
}
