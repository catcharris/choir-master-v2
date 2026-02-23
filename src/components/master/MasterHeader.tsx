import React from 'react';
import { SignalHigh, Users, FolderOpen, LogOut, Music } from 'lucide-react';

interface MasterHeaderProps {
    roomId: string;
    satelliteCount: number;
    isRecordingMaster: boolean;
    isUploadingMR: boolean;
    mrUrl: string | null;
    onToggleRecord: () => void;
    onMRUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onOpenDrawer: () => void;
    onDisconnect: () => void;
}

export function MasterHeader({
    roomId,
    satelliteCount,
    isRecordingMaster,
    isUploadingMR,
    mrUrl,
    onToggleRecord,
    onMRUpload,
    onOpenDrawer,
    onDisconnect
}: MasterHeaderProps) {
    return (
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 transition-colors duration-500">
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-colors duration-500 ${isRecordingMaster ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    <SignalHigh size={18} className="animate-pulse" />
                    ROOM {roomId} {isRecordingMaster && "• REC"}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Users size={16} />
                    {satelliteCount}개의 위성 연결됨
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-end">
                {/* MR Upload Button */}
                <label className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg cursor-pointer ${mrUrl ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-black/20'} ${isUploadingMR ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Music size={16} />
                    <span className="hidden sm:inline">
                        {isUploadingMR ? '업로드 중...' : mrUrl ? 'MR 전송 완료' : 'MR 반주 올리기'}
                    </span>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={onMRUpload}
                        disabled={isUploadingMR}
                        className="hidden"
                    />
                </label>

                <button
                    onClick={onOpenDrawer}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <FolderOpen size={16} />
                    <span className="hidden sm:inline">음원 보관함</span>
                </button>
                <button
                    onClick={onToggleRecord}
                    disabled={satelliteCount === 0}
                    className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${isRecordingMaster ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'}`}
                >
                    <div className={`w-3 h-3 rounded-full ${isRecordingMaster ? 'bg-white' : 'bg-red-500'}`} />
                    {isRecordingMaster ? '녹음 종료' : '전체 위성 동시 녹음'}
                </button>
                <button
                    onClick={onDisconnect}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold rounded-xl transition-colors"
                >
                    <LogOut size={16} />
                    방 종료
                </button>
            </div>
        </header>
    );
}
