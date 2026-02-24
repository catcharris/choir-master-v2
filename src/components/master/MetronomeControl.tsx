import React from 'react';
import { useMetronome } from '@/lib/audio/useMetronome';
import { Play, Square, Minus, Plus, Timer } from 'lucide-react';

export function MetronomeControl() {
    const { isPlaying, toggle, bpm, setBpm } = useMetronome();

    const handleBpmChange = (delta: number) => {
        setBpm(prev => {
            const newBpm = prev + delta;
            if (newBpm < 30) return 30;
            if (newBpm > 300) return 300;
            return newBpm;
        });
    };

    return (
        <div className={`flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all shadow-lg ${isPlaying ? 'bg-indigo-900/40 border border-indigo-500/30' : 'bg-slate-800 border border-slate-700'}`}>
            <button
                onClick={toggle}
                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg transition-colors ${isPlaying ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600'}`}
                title={isPlaying ? "메트로놈 정지" : "메트로놈 시작"}
            >
                {isPlaying ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
            </button>

            <div className="flex items-center bg-slate-900/50 rounded-lg overflow-hidden border border-white/5">
                <button
                    onClick={() => handleBpmChange(-5)}
                    className="px-1.5 py-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <Minus size={14} />
                </button>

                <div className="flex flex-col items-center justify-center min-w-[3rem] sm:min-w-[3.5rem] px-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums leading-none mb-0.5">{bpm}</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-500 font-medium tracking-widest leading-none">BPM</span>
                </div>

                <button
                    onClick={() => handleBpmChange(5)}
                    className="px-1.5 py-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
}
