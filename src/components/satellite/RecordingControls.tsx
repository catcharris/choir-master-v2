import React from 'react';
import { LogOut, Mic } from 'lucide-react';

interface RecordingControlsProps {
    isRecording: boolean;
    isMrReady: boolean;
    isSoloRecording: boolean;
    onDisconnect: () => void;
    onSoloRecordToggle: () => void;
}

export function RecordingControls({
    isRecording,
    isMrReady,
    isSoloRecording,
    onDisconnect,
    onSoloRecordToggle
}: RecordingControlsProps) {
    return (
        <div className="flex flex-col items-center w-full">
            <button
                onClick={onDisconnect}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
            >
                <LogOut size={20} />
                전송 종료 및 나가기
            </button>

            {/* Solo Homework Recording Button */}
            {isMrReady && !isRecording && (
                <button
                    onClick={onSoloRecordToggle}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
                >
                    <Mic size={20} />
                    나 혼자 녹음하기 (MR 재생)
                </button>
            )}

            {isSoloRecording && (
                <button
                    onClick={onSoloRecordToggle}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20 animate-pulse"
                >
                    <LogOut size={20} />
                    숙제 제출 (녹음 끝내기)
                </button>
            )}
        </div>
    );
}
