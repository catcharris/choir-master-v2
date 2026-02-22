// src/components/Tuner.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { Mic, MicOff, AlertCircle, ArrowDown, ArrowUp, CheckCircle, Activity } from 'lucide-react';

export default function Tuner() {
    const { isListening, startListening, stopListening, pitch, error } = useAudioEngine();

    const [stableNote, setStableNote] = useState<string | null>(null);
    const [pitchStatus, setPitchStatus] = useState<'WAITING' | 'STABLE' | 'FLAT' | 'SHARP'>('WAITING');
    const [history, setHistory] = useState<{ note: string, cents: number }[]>([]);

    useEffect(() => {
        if (!pitch) {
            setPitchStatus('WAITING');
            setStableNote(null);
            setHistory([]);
            return;
        }

        setHistory(prev => {
            // Buffer the last 30 frames (~500ms at 60fps)
            const newHistory = [...prev, { note: pitch.note + pitch.octave, cents: pitch.cents }].slice(-30);

            if (newHistory.length >= 15) {
                // Find most frequent note in the buffer to ignore brief overtone jumps
                const counts: Record<string, number> = {};
                newHistory.forEach(h => {
                    counts[h.note] = (counts[h.note] || 0) + 1;
                });

                let dominantNote = '';
                let maxCount = 0;
                for (const [n, count] of Object.entries(counts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        dominantNote = n;
                    }
                }

                // If the dominant note is present for at least 70% of the recent frames, it is "stable"
                if (maxCount >= newHistory.length * 0.7) {
                    setStableNote(dominantNote);

                    // Calculate the average cents of ONLY the dominant note frames
                    const dominantFrames = newHistory.filter(h => h.note === dominantNote);
                    const avgCents = dominantFrames.reduce((sum, h) => sum + h.cents, 0) / dominantFrames.length;

                    // Tolerance for perfect pitch (±10 cents). 
                    // Crucial: Must clearly indicate if falling flat!
                    if (avgCents < -10) {
                        setPitchStatus('FLAT');
                    } else if (avgCents > 10) {
                        setPitchStatus('SHARP');
                    } else {
                        setPitchStatus('STABLE');
                    }
                } else {
                    setPitchStatus('WAITING');
                }
            } else {
                setPitchStatus('WAITING');
            }
            return newHistory;
        });

    }, [pitch]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800">
            {error && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2 border border-red-800">
                    <AlertCircle size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Stable Note Display */}
            <div className={`relative flex flex-col items-center justify-center w-72 h-72 mb-10 rounded-full border-4 transition-all duration-300 ${!isListening ? 'border-slate-800 bg-slate-800/50' :
                    pitchStatus === 'WAITING' ? 'border-indigo-500/30 bg-indigo-500/10' :
                        pitchStatus === 'STABLE' ? 'border-green-500 bg-green-500/10 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                            pitchStatus === 'FLAT' ? 'border-red-500 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                                'border-blue-500 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                }`}>
                {!isListening ? (
                    <MicOff className="text-slate-600 w-16 h-16" />
                ) : pitchStatus === 'WAITING' ? (
                    <>
                        <Activity className="text-indigo-400 w-12 h-12 mb-2 animate-bounce" />
                        <span className="text-indigo-300 font-medium tracking-widest text-sm text-center">
                            음정 분석 중...<br />
                            <span className="text-xs text-indigo-400/70 block mt-1">(단일 음을 지속해주세요)</span>
                        </span>
                        {/* Show raw transient note faintly to feel responsive */}
                        <div className="absolute bottom-6 text-slate-500 font-mono text-xs">
                            {pitch?.note}{pitch?.octave} ({(pitch?.frequency || 0).toFixed(0)}Hz)
                        </div>
                    </>
                ) : (
                    <>
                        {/* Big Note Text */}
                        <div className={`text-8xl font-black mb-2 tracking-tighter ${pitchStatus === 'STABLE' ? 'text-green-400' :
                                pitchStatus === 'FLAT' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                            {stableNote?.replace(/[0-9]/g, '')}
                            <span className="text-4xl opacity-50 ml-1">{stableNote?.replace(/[^0-9]/g, '')}</span>
                        </div>

                        {/* Status Label */}
                        <div className="flex items-center gap-2 font-bold text-xl mt-2">
                            {pitchStatus === 'STABLE' && (
                                <><CheckCircle className="text-green-400 w-6 h-6" /> <span className="text-green-400">정확함 (Perfect)</span></>
                            )}
                            {pitchStatus === 'FLAT' && (
                                <><ArrowDown className="text-red-400 w-6 h-6 animate-pulse" /> <span className="text-red-400">음 이탈 (Flat) ▼</span></>
                            )}
                            {pitchStatus === 'SHARP' && (
                                <><ArrowUp className="text-blue-400 w-6 h-6" /> <span className="text-blue-400">음 높음 (Sharp) ▲</span></>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg active:scale-95 ${isListening
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/30'
                    }`}
            >
                {isListening ? (
                    <>
                        <MicOff size={24} />
                        Stop Tracking
                    </>
                ) : (
                    <>
                        <Mic size={24} />
                        Start Tuning
                    </>
                )}
            </button>
            <p className="text-slate-500 text-sm mt-4 text-center max-w-xs">
                {isListening ? "음정이 안정될 때까지 일정한 소리를 내주세요." : "합창 단원 정밀 피치 트래커"}
            </p>
        </div>
    );
}
