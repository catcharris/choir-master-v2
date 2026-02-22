// src/components/Tuner.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { Mic, MicOff, AlertCircle, ArrowDown, ArrowUp, CheckCircle, Activity } from 'lucide-react';

export default function Tuner() {
    const [a4, setA4] = useState(440);
    const [isAutoTuning, setIsAutoTuning] = useState(false);
    const { isListening, startListening, stopListening, pitch, error } = useAudioEngine(a4);

    // Auto-tuning logic for the piano 'A' note
    useEffect(() => {
        if (!isAutoTuning || !pitch) return;

        // If we detect an A note (A3, A4, or A5)
        if (pitch.note === 'A') {
            let exactA4 = pitch.frequency;
            if (pitch.octave === 3) exactA4 *= 2;        // A3 is ~220Hz, double it
            else if (pitch.octave === 5) exactA4 /= 2;   // A5 is ~880Hz, halve it
            else if (pitch.octave !== 4) return;         // Ignore A2, A6 etc.

            // Constrain between 430 and 450 just in case
            const roundedA4 = Math.max(430, Math.min(450, Math.round(exactA4)));
            setA4(roundedA4);
            setIsAutoTuning(false); // Stop tuning once locked
        }
    }, [pitch, isAutoTuning]);

    const getStatus = () => {
        if (!pitch) return 'WAITING';
        // Widened tolerance for amateur choir singers
        if (pitch.cents < -15) return 'FLAT';
        if (pitch.cents > 15) return 'SHARP';
        return 'STABLE';
    };

    const status = getStatus();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800">
            {error && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2 border border-red-800">
                    <AlertCircle size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Instant Note Display */}
            <div className={`relative flex flex-col items-center justify-center w-72 h-72 mb-10 rounded-full border-4 transition-all duration-150 ${!isListening ? 'border-slate-800 bg-slate-800/50' :
                    isAutoTuning ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.2)]' :
                        !pitch ? 'border-indigo-500/30 bg-indigo-500/10' :
                            status === 'STABLE' ? 'border-green-500 bg-green-500/10 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                                status === 'FLAT' ? 'border-red-500 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                                    'border-blue-500 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                }`}>
                {!isListening ? (
                    <MicOff className="text-slate-600 w-16 h-16" />
                ) : isAutoTuning ? (
                    <>
                        <Activity className="text-amber-400 w-16 h-16 mb-4 animate-pulse" />
                        <span className="text-amber-300 font-bold text-lg text-center leading-tight">
                            피아노 소리 듣는 중...<br />
                            <span className="text-sm font-normal text-amber-400/80 mt-2 block">
                                '라(A)' 건반을 길게 쳐주세요
                            </span>
                        </span>
                        {/* Faint readout so user knows it's hearing at least something */}
                        {pitch && (
                            <div className="absolute bottom-6 text-amber-500/50 font-mono text-xs">
                                감지 중: {pitch.note}{pitch.octave}
                            </div>
                        )}
                    </>
                ) : !pitch ? (
                    <>
                        <Activity className="text-indigo-400 w-12 h-12 mb-2 animate-bounce" />
                        <span className="text-indigo-300 font-medium tracking-widest text-sm text-center">
                            소리를 내주세요<br />
                            <span className="text-xs text-indigo-400/70 block mt-1">(단원의 소리만 수음되도록 20cm 내 유지)</span>
                        </span>
                    </>
                ) : (
                    <>
                        {/* Big Note Text (Instant) */}
                        <div className={`text-8xl font-black mb-1 tracking-tighter ${status === 'STABLE' ? 'text-green-400' :
                            status === 'FLAT' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                            {pitch.note?.replace(/[0-9]/g, '')}
                            <span className="text-4xl opacity-50 ml-1">{pitch.octave}</span>
                        </div>

                        <div className="text-slate-500 font-mono text-sm mb-4 bg-slate-800/50 px-3 py-1 rounded-full">
                            {Math.round(pitch.frequency)} Hz | {Math.round(pitch.cents)} cents
                        </div>

                        {/* Status Label */}
                        <div className="flex items-center gap-2 font-bold text-xl">
                            {status === 'STABLE' && (
                                <><CheckCircle className="text-green-400 w-6 h-6" /> <span className="text-green-400">정확함 (Perfect)</span></>
                            )}
                            {status === 'FLAT' && (
                                <><ArrowDown className="text-red-400 w-6 h-6 animate-pulse" /> <span className="text-red-400">음 이탈 (Flat) ▼</span></>
                            )}
                            {status === 'SHARP' && (
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
            <p className="text-slate-500 text-sm mt-4 text-center max-w-xs mb-6">
                {isListening ? "단원의 정확한 음정(음 이탈)을 즉시 확인합니다." : "합창 단원 정밀 피치 트래커"}
            </p>

            {/* A4 Calibration Settings */}
            <div className={`w-full max-w-[280px] bg-slate-800/40 px-6 py-4 rounded-3xl border flex flex-col items-center gap-3 transition-colors ${isAutoTuning ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-slate-700/50'
                }`}>
                <span className="text-slate-400 text-sm font-medium">
                    피아노 기준음 (A4) 교정
                </span>

                <div className="flex items-center gap-4 w-full justify-center">
                    <button
                        onClick={() => setA4(prev => Math.max(430, prev - 1))}
                        disabled={isListening || isAutoTuning}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-slate-700"
                    >
                        -
                    </button>
                    <div className="w-24 text-center">
                        <span className="font-mono font-bold text-2xl text-indigo-300">{a4}</span>
                        <span className="text-slate-500 ml-1 text-sm">Hz</span>
                    </div>
                    <button
                        onClick={() => setA4(prev => Math.min(450, prev + 1))}
                        disabled={isListening || isAutoTuning}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-slate-700"
                    >
                        +
                    </button>
                </div>

                <div className="w-full h-px bg-slate-700/50 my-1"></div>

                <button
                    onClick={() => {
                        if (isAutoTuning) {
                            setIsAutoTuning(false);
                            stopListening();
                        } else {
                            setIsAutoTuning(true);
                            if (!isListening) startListening();
                        }
                    }}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${isAutoTuning
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                        : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                        }`}
                >
                    {isAutoTuning ? (
                        <>
                            <Activity size={16} />
                            피아노 '라(A)' 음을 쳐주세요...
                        </>
                    ) : (
                        "🎙️ 피아노 소리 듣고 자동 맞춤"
                    )}
                </button>
            </div>
        </div>
    );
}
