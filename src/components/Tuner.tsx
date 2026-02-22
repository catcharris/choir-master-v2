// src/components/Tuner.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { Mic, MicOff, AlertCircle, ArrowDown, ArrowUp, CheckCircle, Activity, Info, X, Settings } from 'lucide-react';

export default function Tuner() {
    const [a4, setA4] = useState(440);
    const [tolerance, setTolerance] = useState(20); // Default to Amateur (±20 cents)
    const [showInfo, setShowInfo] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const { listenMode, startListening, stopListening, clearPitch, pitch, error } = useAudioEngine(a4);

    const isListening = listenMode === 'vocal';
    const isAutoTuning = listenMode === 'piano';

    // Auto-tuning logic for the piano 'A' note
    useEffect(() => {
        if (listenMode !== 'piano' || !pitch) return;

        // If we detect an A note (A3, A4, or A5)
        if (pitch.note === 'A') {
            let exactA4 = pitch.frequency;
            if (pitch.octave === 3) exactA4 *= 2;        // A3 is ~220Hz, double it
            else if (pitch.octave === 5) exactA4 /= 2;   // A5 is ~880Hz, halve it
            else if (pitch.octave !== 4) return;         // Ignore A2, A6 etc.

            // Constrain between 430 and 450 just in case
            const roundedA4 = Math.max(430, Math.min(450, Math.round(exactA4)));
            setA4(roundedA4);
            stopListening(); // Stop tuning once locked
        }
    }, [pitch, listenMode, stopListening]);

    const getStatus = () => {
        if (!pitch) return 'WAITING';
        // Dynamic tolerance based on user skill level
        if (pitch.cents < -tolerance) return 'FLAT';
        if (pitch.cents > tolerance) return 'SHARP';
        return 'STABLE';
    };

    const status = getStatus();

    return (
        <>
            <div className="relative flex-1 w-full flex flex-col items-center justify-center p-4 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
                {/* Action Buttons (Top Left / Right) */}
                <button
                    onClick={() => setShowInfo(true)}
                    className="absolute top-6 left-6 text-slate-500 hover:text-indigo-400 transition-colors"
                    title="튜너 작동 원리 안내"
                >
                    <Info size={24} />
                </button>
                <button
                    onClick={() => setShowSettings(true)}
                    className="absolute top-6 right-6 text-slate-500 hover:text-indigo-400 transition-colors"
                    title="튜너 설정"
                >
                    <Settings size={24} />
                </button>

                {error && (
                    <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mt-8 mb-4 flex items-center gap-2 border border-red-800">
                        <AlertCircle size={18} />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Instant Note Display */}
                <div className={`relative flex flex-col items-center justify-center w-72 h-72 ${error ? 'mb-6' : 'mt-8 mb-10'} rounded-full border-4 transition-all duration-150 ${listenMode === 'idle' ? 'border-slate-800 bg-slate-800/50' :
                    isAutoTuning ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.2)]' :
                        !pitch ? 'border-indigo-500/30 bg-indigo-500/10' :
                            status === 'STABLE' ? 'border-green-500 bg-green-500/10 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                                status === 'FLAT' ? 'border-red-500 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                                    'border-blue-500 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                    }`}>
                    {listenMode === 'idle' ? (
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
                    onClick={() => isListening ? stopListening() : startListening('vocal')}
                    className={`flex items-center gap-3 px-8 py-4 mt-6 rounded-full font-bold text-lg transition-all shadow-lg active:scale-95 ${isListening
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
                    {isListening ? "단원의 정확한 음정(음 이탈)을 즉시 확인합니다." : "보컬/합창 전용 정밀 피치 트래커"}
                </p>
            </div>

            {/* Settings Modal Overlay */}
            {
                showSettings && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-sm">
                        {/* Bottom Sheet style on mobile, centered modal on desktop */}
                        <div className="bg-slate-900 border border-slate-700 sm:rounded-3xl rounded-t-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                    <Settings className="text-indigo-400" size={20} />
                                    튜너 설정
                                </h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-6">
                                {/* 1. Difficulty Level (Tolerance) */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-slate-300 font-medium">
                                        판정 난이도 (허용 오차)
                                    </span>
                                    <div className="flex bg-slate-950 rounded-xl overflow-hidden border border-slate-700 w-full">
                                        <button
                                            onClick={() => setTolerance(25)}
                                            className={`flex-1 py-3 text-xs font-bold transition-colors ${tolerance === 25 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            초보<br /><span className="text-[10px] opacity-70 font-mono">±25</span>
                                        </button>
                                        <button
                                            onClick={() => setTolerance(20)}
                                            className={`flex-1 py-3 text-xs font-bold transition-colors border-l border-slate-700 ${tolerance === 20 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            아마추어<br /><span className="text-[10px] opacity-70 font-mono">±20</span>
                                        </button>
                                        <button
                                            onClick={() => setTolerance(15)}
                                            className={`flex-1 py-3 text-xs font-bold transition-colors border-l border-slate-700 ${tolerance === 15 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            합창단<br /><span className="text-[10px] opacity-70 font-mono">±15</span>
                                        </button>
                                        <button
                                            onClick={() => setTolerance(10)}
                                            className={`flex-1 py-3 text-xs font-bold transition-colors border-l border-slate-700 ${tolerance === 10 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            전문가<br /><span className="text-[10px] opacity-70 font-mono">±10</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-slate-800 my-2"></div>

                                {/* A4 Calibration Settings */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-slate-300 font-medium flex justify-between items-center">
                                        피아노 기준음 (A4) 교정
                                        {isAutoTuning && <span className="text-amber-400 text-xs animate-pulse font-bold">마이크로 감지 중...</span>}
                                    </span>

                                    <div className="flex items-center gap-4 w-full justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                        <button
                                            onClick={() => setA4(prev => Math.max(430, prev - 1))}
                                            disabled={isListening || isAutoTuning}
                                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-30"
                                        >
                                            -
                                        </button>
                                        <div className="flex-1 text-center">
                                            <span className="font-mono font-black text-3xl text-indigo-400">{a4}</span>
                                            <span className="text-slate-500 ml-1 text-sm">Hz</span>
                                        </div>
                                        <button
                                            onClick={() => setA4(prev => Math.min(450, prev + 1))}
                                            disabled={isListening || isAutoTuning}
                                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-30"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (isAutoTuning) {
                                                stopListening();
                                            } else {
                                                startListening('piano');
                                            }
                                        }}
                                        className={`w-full py-4 mt-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${isAutoTuning
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-pulse'
                                            : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                                            }`}
                                    >
                                        {isAutoTuning ? (
                                            <>
                                                <Activity size={18} />
                                                피아노 '라(A)' 건반을 길게 쳐주세요...
                                            </>
                                        ) : (
                                            "🎙️ 피아노 소리 듣고 자동 맞춤"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Info Modal Overlay */}
            {
                showInfo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                    <Info className="text-indigo-400" size={20} />
                                    보컬 전용 튜너 작동 원리
                                </h2>
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 text-sm text-slate-300">
                                <section>
                                    <h3 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                                        <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                        30cm 소음 방어막 (RMS Gate)
                                    </h3>
                                    <p className="leading-relaxed border-l-2 border-slate-700 pl-3">
                                        일반 튜너는 옆 사람의 소리까지 섞여서 고장납니다. 이 튜너는 물리적인 소리 에너지(RMS)를 계산하여 <strong>"스마트폰 20~30cm 앞의 목소리"</strong>만 수음하고, 거리가 조금이라도 먼 주변 단원들의 소리는 연산 전에 수학적으로 완전히 차단합니다.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                                        <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                        바이브레이션 완충기 (Vibrato Absorber)
                                    </h3>
                                    <p className="leading-relaxed border-l-2 border-slate-700 pl-3">
                                        기계는 1초에 60번씩 미세한 떨림을 감지합니다. 이 튜너는 성대의 자연스러운 바이브레이션(떨림) 주기를 400ms 완충 버퍼로 흡수하여 <strong>"가창자의 진짜 중심 음정"</strong>만 묵직하고 안정적으로 화면에 표시합니다.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                                        <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                        합창단 맞춤형 허용 오차 (Tolerance)
                                    </h3>
                                    <p className="leading-relaxed border-l-2 border-slate-700 pl-3">
                                        프로용 악기 튜너는 ±5 Cents를 벗어나면 에러를 띄우지만, 실제 합창단에서 사람 귀에 아름답게 화음이 섞이는(블렌딩) 범위는 <strong>±15 ~ ±20 Cents</strong> 입니다. 로봇 같은 튜너의 경고창에 겁내지 않고 본인의 실력에 맞는 난이도를 선택해 연습할 수 있습니다.
                                    </p>
                                </section>
                            </div>

                            <button
                                onClick={() => setShowInfo(false)}
                                className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                )}
        </>
    );
}
