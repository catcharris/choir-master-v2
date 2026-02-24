import React from 'react';
import { PitchData } from '@/lib/pitch';
import { Activity } from 'lucide-react';

interface TunerDisplayProps {
    pitch: PitchData | null;
    isRecording: boolean;
}

export function TunerDisplay({ pitch, isRecording }: TunerDisplayProps) {
    const getDynamics = (rms: number) => {
        // Approximate mapping based on the 300% boosted signal
        if (rms < 0.005) return { text: 'pp', color: 'text-slate-500' };
        if (rms < 0.01) return { text: 'p', color: 'text-indigo-300' };
        if (rms < 0.02) return { text: 'mp', color: 'text-indigo-400' };
        if (rms < 0.05) return { text: 'mf', color: 'text-emerald-400' };
        if (rms < 0.12) return { text: 'f', color: 'text-amber-400' };
        if (rms < 0.25) return { text: 'ff', color: 'text-orange-500' };
        return { text: 'fff', color: 'text-red-500 font-extrabold' };
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative">
            <div className={`w-[60vmin] h-[60vmin] max-w-xs max-h-xs rounded-full flex flex-col items-center justify-center relative transition-all duration-700 ${isRecording ? 'bg-red-500/10 shadow-[0_0_80px_rgba(220,38,38,0.2)]' : 'bg-slate-900/40 shadow-[0_0_60px_rgba(99,102,241,0.1)]'}`}>

                {/* Orbital animated rings */}
                <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-[-10px] sm:inset-[-15px] rounded-full border border-white/5 border-t-white/20 animate-[spin_15s_linear_infinite_reverse]" />
                <div className="absolute inset-[-20px] sm:inset-[-30px] rounded-full border border-white/5 border-l-white/10 animate-[spin_20s_linear_infinite]" />

                {/* Pulse ring for recording */}
                <div className={`absolute inset-3 rounded-full border transition-colors duration-500 ${isRecording ? 'border-red-500/60 animate-ping opacity-70' : 'border-indigo-500/30'}`}></div>

                {/* Inner Glow Core */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/20 backdrop-blur-sm rounded-full shadow-inner border border-white/5 overflow-hidden">
                    {/* Dynamic height background behind text based on pitch variance could go here later */}

                    {pitch ? (
                        <>
                            <span className="text-[18vmin] sm:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 tracking-tighter leading-none">
                                {pitch.note}
                            </span>
                            <span className="text-slate-400 font-bold tracking-widest mt-2">{Math.round(pitch.frequency)} HZ</span>

                            {/* Dynamics Display */}
                            <span
                                key={getDynamics(pitch.rmsVolume).text}
                                className={`font-serif italic text-3xl mt-4 pr-2 ${getDynamics(pitch.rmsVolume).color}`}
                            >
                                {getDynamics(pitch.rmsVolume).text}
                            </span>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-slate-500 gap-3">
                            <Activity className={`animate-pulse opacity-50 ${isRecording ? 'text-red-400' : 'text-slate-400'}`} size={32} />
                            <span className="font-medium text-sm">수음 대기 중...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
