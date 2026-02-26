import React from 'react';
import { useMetronome, TimeSignature } from '@/lib/audio/useMetronome';
import { Play, Square, Minus, Plus } from 'lucide-react';

export function MetronomeControl({ className = '' }: { className?: string }) {
    const { isPlaying, toggle, bpm, setBpm, timeSignature, setTimeSignature } = useMetronome();

    const handleBpmChange = (delta: number) => {
        setBpm(prev => {
            const newBpm = prev + delta;
            if (newBpm < 30) return 30;
            if (newBpm > 300) return 300;
            return newBpm;
        });
    };

    const cycleTimeSignature = () => {
        const list: TimeSignature[] = ['2/4', '3/4', '4/4', '6/8'];
        const idx = list.indexOf(timeSignature);
        setTimeSignature(list[(idx + 1) % list.length]);
    };

    return (
        <div className={`flex items-center justify-between sm:justify-center h-[36px] px-1 sm:px-1.5 rounded-xl transition-all shadow-lg ${isPlaying ? 'bg-indigo-900/40 border border-indigo-500/30' : 'bg-slate-800 border border-slate-700'} ${className}`}>

            {/* Time Signature Button */}
            <button
                onClick={cycleTimeSignature}
                className="flex items-center justify-center w-8 sm:w-10 h-[28px] rounded-lg text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors tabular-nums tracking-widest"
                title="박자표 변경 (클릭)"
            >
                {timeSignature}
            </button>

            {/* BPM Controls */}
            <div className="flex items-center bg-slate-900/50 rounded-lg overflow-hidden border border-white/5 mx-0.5 sm:mx-1 h-[28px]">
                <button
                    onClick={() => handleBpmChange(-5)}
                    className="px-1.5 h-full flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <Minus size={13} />
                </button>

                <div className="flex flex-col items-center justify-center min-w-[2.5rem] sm:min-w-[3rem] px-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums leading-none">{bpm}</span>
                </div>

                <button
                    onClick={() => handleBpmChange(5)}
                    className="px-1.5 h-full flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* Play/Stop Button */}
            <button
                onClick={toggle}
                className={`flex items-center justify-center w-7 h-[28px] rounded-lg transition-colors ml-0.5 ${isPlaying ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600'}`}
                title={isPlaying ? "메트로놈 정지" : "메트로놈 시작"}
            >
                {isPlaying ? <Square size={12} className="fill-current" /> : <Play size={12} className="fill-current ml-0.5" />}
            </button>

        </div>
    );
}
