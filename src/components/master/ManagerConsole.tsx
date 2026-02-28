import React from 'react';
import { Music, FileImage, FolderOpen, RadioReceiver, Volume2, VolumeX } from 'lucide-react';

interface ManagerConsoleProps {
    roomId: string;
    satelliteCount: number;
    isRecordingMaster: boolean;
    isUploadingMR: boolean;
    mrUrl: string | null;
    onToggleRecord: () => void;
    onMRUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onYoutubeImport: (url: string) => void;
    isImportingYoutube: boolean;
    onScoreUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingScore: boolean;
    onOpenDrawer: () => void;
    isStudioMode: boolean;
    onToggleStudioMode: () => void;
    isMrMuted: boolean;
    onToggleMrMute: () => void;
}

export function ManagerConsole({
    roomId,
    satelliteCount,
    isRecordingMaster,
    isUploadingMR,
    mrUrl,
    onToggleRecord,
    onMRUpload,
    onYoutubeImport,
    isImportingYoutube,
    onScoreUpload,
    isUploadingScore,
    onOpenDrawer,
    isStudioMode,
    onToggleStudioMode,
    isMrMuted,
    onToggleMrMute
}: ManagerConsoleProps) {
    return (
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
            <h2 className="text-lg sm:text-xl font-black text-slate-200 mb-4 flex items-center gap-2">
                <RadioReceiver className="text-indigo-400" size={20} />
                테크니컬 스튜디오 콘솔
            </h2>

            {/* YouTube Import Row */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="url"
                    id="youtube-url-input"
                    placeholder="https://youtube.com/watch?v=..."
                    disabled={isImportingYoutube}
                    className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (val) {
                                onYoutubeImport(val);
                                e.currentTarget.value = '';
                            }
                        }
                    }}
                />
                <button
                    disabled={isImportingYoutube}
                    onClick={() => {
                        const input = document.getElementById('youtube-url-input') as HTMLInputElement;
                        if (input && input.value) {
                            onYoutubeImport(input.value);
                            input.value = '';
                        }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                >
                    {isImportingYoutube ? '추출 중...' : '유튜브 MR 가져오기'}
                </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3 md:gap-4">

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

                {/* 4. MR Mute Toggle */}
                {mrUrl && (
                    <button
                        onClick={onToggleMrMute}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all shadow-md hover:-translate-y-0.5 ${isMrMuted ? 'bg-amber-600/20 text-amber-500 border border-amber-500/30 shadow-amber-500/10' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'}`}
                    >
                        {isMrMuted ? <VolumeX size={24} className="mb-2" /> : <Volume2 size={24} className="mb-2" />}
                        <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                            {isMrMuted ? 'MR 뮤트됨' : 'MR 소리 켬'}
                        </span>
                    </button>
                )}

                {/* 5. Audio Drawer */}
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
