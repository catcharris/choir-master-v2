// src/components/Tuner.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { Mic, MicOff, AlertCircle, ArrowDown, ArrowUp, CheckCircle, Activity } from 'lucide-react';

export default function Tuner() {
    const { isListening, startListening, stopListening, pitch, error } = useAudioEngine();

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
                !pitch ? 'border-indigo-500/30 bg-indigo-500/10' :
                    status === 'STABLE' ? 'border-green-500 bg-green-500/10 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                        status === 'FLAT' ? 'border-red-500 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                            'border-blue-500 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                }`}>
                {!isListening ? (
                    <MicOff className="text-slate-600 w-16 h-16" />
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
                            {Math.round(pitch.frequency)} Hz | {Math.round(smoothedCents)} cents
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
            <p className="text-slate-500 text-sm mt-4 text-center max-w-xs">
                {isListening ? "단원의 정확한 음정(음 이탈)을 즉시 확인합니다." : "합창 단원 정밀 피치 트래커"}
            </p>
        </div>
    );
}
