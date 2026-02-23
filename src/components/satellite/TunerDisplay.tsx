import React from 'react';
import { PitchData } from '@/lib/pitch';
import { Activity } from 'lucide-react';

interface TunerDisplayProps {
    pitch: PitchData | null;
    isRecording: boolean;
}

export function TunerDisplay({ pitch, isRecording }: TunerDisplayProps) {
    return (
        <div className={`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center mb-16 relative transition-colors duration-500 ${isRecording ? 'border-red-900' : 'border-slate-800'}`}>
            <div className={`absolute inset-0 border-4 rounded-full animate-ping opacity-20 ${isRecording ? 'border-red-500' : 'border-indigo-500'}`}></div>
            {pitch ? (
                <>
                    <span className="text-5xl font-black">{pitch.note}</span>
                    <span className="text-slate-400 mt-2">{Math.round(pitch.frequency)} Hz</span>
                </>
            ) : (
                <span className="text-slate-500 font-medium">수음 대기 중...</span>
            )}
        </div>
    );
}
