// src/components/Tuner.tsx
"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { Mic, MicOff, AlertCircle, ArrowDown, ArrowUp, CheckCircle, Activity, Info, X, Settings, Lock, Crown, MonitorUp } from 'lucide-react';
import { registerPlugin } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

const WatchBridge = registerPlugin<any>('WatchBridge');

export default function Tuner() {
    const [isPro, setIsPro] = useState(false);
    const [showProModal, setShowProModal] = useState(false);
    const [showMirrorModal, setShowMirrorModal] = useState(false);
    const [a4, setA4] = useState(440);
    const [tolerance, setTolerance] = useState(20); // Default to Amateur (±20 cents)
    const [isCloseMic, setIsCloseMic] = useState(false); // Toggle for ~30cm noise rejection
    const [showInfo, setShowInfo] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const { listenMode, startListening, stopListening, clearPitch, pitch, error } = useAudioEngine(a4, undefined, false, isCloseMic);

    const isListening = listenMode === 'vocal';
    const isAutoTuning = listenMode === 'piano';

    // Mutable ref to access latest state inside the motion event listener
    const isListeningRef = useRef(isListening);
    const lastShakeRef = useRef(0);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // Watch remote control logic
    useEffect(() => {
        let isMounted = true;
        const setupWatchListener = async () => {
            try {
                await WatchBridge.addListener('onWatchCommand', (info: any) => {
                    if (!isMounted) return;
                    console.log("Received Watch Command:", info.command);
                    if (info.command === 'start') {
                        startListening('vocal');
                    } else if (info.command === 'stop') {
                        stopListening();
                    }
                });
            } catch (e) {
                console.log("WatchBridge addListener error:", e);
            }
        };
        setupWatchListener();

        return () => {
            isMounted = false;
        };
    }, [startListening, stopListening]);

    // Shake to toggle logic
    useEffect(() => {
        let isMounted = true;

        const setupMotion = async () => {
            try {
                await Motion.addListener('accel', (event) => {
                    if (!isMounted) return;

                    const accel = event.acceleration;
                    if (!accel || accel.x === undefined || accel.y === undefined || accel.z === undefined) return;

                    // Calculate total magnitude of acceleration
                    const magnitude = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);

                    // Threshold for a "shake" (typically around 15-20 m/s^2 on iOS)
                    if (magnitude > 18) {
                        const now = Date.now();
                        // Debounce shakes to prevent multiple triggers (1 second timeout)
                        if (now - lastShakeRef.current > 1000) {
                            lastShakeRef.current = now;
                            if (isListeningRef.current) {
                                stopListening();
                            } else {
                                startListening('vocal');
                            }
                        }
                    }
                });
            } catch (error) {
                console.log("Motion API not supported or permission denied", error);
            }
        };

        setupMotion();

        return () => {
            isMounted = false;
            Motion.removeAllListeners();
        };
    }, [startListening, stopListening]);

    const handleProAction = (action: () => void) => {
        if (isPro) {
            action();
        } else {
            setShowProModal(true);
        }
    };

    // Bridge pitch data to Apple Watch Extension
    useEffect(() => {
        try {
            if (isListening) {
                if (pitch) {
                    WatchBridge.sendPitchData({
                        pitch: (pitch.note?.replace(/[0-9]/g, '') || 'A') + pitch.octave.toString(),
                        cents: pitch.cents,
                        isListening: true
                    }).catch((e: any) => console.log('WatchBridge wait/error:', e));
                } else {
                    WatchBridge.sendPitchData({
                        pitch: "--",
                        cents: 0.0,
                        isListening: true
                    }).catch((e: any) => console.log('WatchBridge wait/error:', e));
                }
            } else {
                WatchBridge.sendPitchData({
                    pitch: "A4",
                    cents: 0.0,
                    isListening: false
                }).catch((e: any) => console.log('WatchBridge wait/error:', e));
            }
        } catch (error) {
            console.log("Failed to call WatchBridge:", error);
        }
    }, [pitch, isListening]);

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
            <div className="relative flex-1 w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-4 md:p-10 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
                {/* Action Buttons (Top Left / Right) */}
                <button
                    onClick={() => setShowInfo(true)}
                    className="absolute top-4 left-4 md:top-6 md:left-6 text-slate-500 hover:text-indigo-400 transition-colors z-10"
                    title="튜너 작동 원리 안내"
                >
                    <Info size={24} />
                </button>
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-4 z-10">
                    <button
                        onClick={() => setShowMirrorModal(true)}
                        className="text-slate-500 hover:text-indigo-400 transition-colors"
                        title="화면 미러링 가이드"
                    >
                        <MonitorUp size={24} />
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="text-slate-500 hover:text-indigo-400 transition-colors"
                        title="튜너 설정"
                    >
                        <Settings size={24} />
                    </button>
                </div>

                {/* Left Side: Tuner Graphic */}
                <div className="flex flex-col items-center justify-center shrink-0">
                    {/* Instant Note Display */}
                    <div className={`shrink-0 relative flex flex-col items-center justify-center w-64 h-64 md:w-80 md:h-80 ${error ? 'mb-2' : 'mt-4 md:mt-0'} rounded-full border-4 transition-all duration-150 ${listenMode === 'idle' ? 'border-slate-800 bg-slate-800/50' :
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
                                <span className="text-indigo-300 font-medium tracking-widest text-sm text-center px-4">
                                    소리를 내주세요<br />
                                    <span className="text-xs text-indigo-400/70 block mt-1">(단원의 소리만 수음되도록 60cm 내 유지)</span>
                                </span>
                            </>
                        ) : (
                            <>
                                {/* Big Note Text (Instant) */}
                                <div className={`text-7xl md:text-8xl font-black mb-1 tracking-tighter ${status === 'STABLE' ? 'text-green-400' :
                                    status === 'FLAT' ? 'text-red-400' : 'text-blue-400'
                                    }`}>
                                    {pitch.note?.replace(/[0-9]/g, '')}
                                    <span className="text-3xl md:text-4xl opacity-50 ml-1">{pitch.octave}</span>
                                </div>

                                <div className="text-slate-500 font-mono text-xs md:text-sm mb-4 mt-4 md:mt-6 bg-slate-800/50 px-3 py-1 rounded-full">
                                    {Math.round(pitch.frequency)} Hz | {Math.round(pitch.cents)} cents
                                </div>

                                {/* Status Label */}
                                <div className="flex items-center gap-2 font-bold text-lg md:text-xl">
                                    {status === 'STABLE' && (
                                        <><CheckCircle className="text-green-400 w-5 h-5 md:w-6 md:h-6" /> <span className="text-green-400">정확함 (Perfect)</span></>
                                    )}
                                    {status === 'FLAT' && (
                                        <><ArrowDown className="text-red-400 w-5 h-5 md:w-6 md:h-6 animate-pulse" /> <span className="text-red-400">음 이탈 (Flat) ▼</span></>
                                    )}
                                    {status === 'SHARP' && (
                                        <><ArrowUp className="text-blue-400 w-5 h-5 md:w-6 md:h-6" /> <span className="text-blue-400">음 높음 (Sharp) ▲</span></>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side: Controls & Status */}
                <div className="flex flex-col items-center justify-center max-w-sm w-full">
                    {error && (
                        <div className="bg-red-900/50 text-red-200 p-3 rounded-lg w-full mb-4 flex items-center gap-2 border border-red-800">
                            <AlertCircle size={18} className="shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Main Toggle Button */}
                    <button
                        onClick={() => isListening ? stopListening() : startListening('vocal')}
                        className={`flex justify-center w-full items-center gap-3 px-8 py-5 md:py-6 rounded-2xl md:rounded-full font-bold text-xl md:text-2xl transition-all shadow-lg active:scale-95 ${isListening
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/30'
                            }`}
                    >
                        {isListening ? (
                            <>
                                <MicOff size={28} />
                                Stop Tracking
                            </>
                        ) : (
                            <>
                                <Mic size={28} />
                                Start Tuning
                            </>
                        )}
                    </button>
                    <p className="text-slate-500 text-sm md:text-base mt-6 text-center w-full leading-relaxed">
                        {isListening
                            ? (isCloseMic ? "주변 소음을 차단하고 가까운 소리만 집중 수음합니다." : "단원의 정확한 음정(음 이탈)을 즉시 확인합니다.")
                            : "버튼을 누르거나 기기를 살짝 흔들어 시작하세요"}
                    </p>
                </div>
            </div>

            {/* Settings Modal Overlay */}
            {
                showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-md md:max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                            <div className="flex justify-between items-center mb-6 md:mb-8">
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    <Settings className="text-indigo-400" size={24} />
                                    튜너 설정
                                    {!isPro && (
                                        <button onClick={() => setShowProModal(true)} className="ml-2 md:ml-3 bg-amber-500/20 text-amber-400 text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full uppercase tracking-wider font-bold hover:bg-amber-500/30 flex items-center gap-1 transition-colors">
                                            <Crown size={12} /> PRO
                                        </button>
                                    )}
                                </h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                                {/* Left Column: Difficulty & Proximity */}
                                <div className="flex-1 flex flex-col gap-6">
                                    {/* 1. Difficulty Level (Tolerance) */}
                                    <div className="flex flex-col gap-3">
                                        <span className="text-slate-300 font-medium text-sm md:text-base">
                                            판정 난이도 (허용 오차)
                                        </span>
                                        <div className="flex bg-slate-950 rounded-xl overflow-hidden border border-slate-700 w-full shadow-inner">
                                            <button
                                                onClick={() => setTolerance(25)}
                                                className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold transition-colors ${tolerance === 25 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                초보<br /><span className="text-[10px] md:text-xs opacity-70 font-mono font-normal mt-0.5 inline-block">±25</span>
                                            </button>
                                            <button
                                                onClick={() => setTolerance(20)}
                                                className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold transition-colors border-l border-slate-700/50 ${tolerance === 20 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                아마추어<br /><span className="text-[10px] md:text-xs opacity-70 font-mono font-normal mt-0.5 inline-block">±20</span>
                                            </button>
                                            <button
                                                onClick={() => setTolerance(15)}
                                                className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold transition-colors border-l border-slate-700/50 ${tolerance === 15 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                합창단<br /><span className="text-[10px] md:text-xs opacity-70 font-mono font-normal mt-0.5 inline-block">±15</span>
                                            </button>
                                            <button
                                                onClick={() => setTolerance(10)}
                                                className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold transition-colors border-l border-slate-700/50 ${tolerance === 10 ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                전문가<br /><span className="text-[10px] md:text-xs opacity-70 font-mono font-normal mt-0.5 inline-block">±10</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-slate-800 my-1 md:my-2"></div>

                                    {/* 1.5. Proximity Gate (Close-Mic Mode) */}
                                    <div className="flex flex-col gap-3">
                                        <span className="text-slate-300 font-medium text-sm md:text-base">
                                            마이크 수음 범위 (소음 차단)
                                        </span>
                                        <div className="flex bg-slate-950 rounded-xl overflow-hidden border border-slate-700 w-full shadow-inner">
                                            <button
                                                onClick={() => setIsCloseMic(false)}
                                                className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold transition-colors ${!isCloseMic ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                일반 모드<br /><span className="text-[10px] md:text-xs opacity-70 font-normal mt-0.5 inline-block">약 60cm</span>
                                            </button>
                                            <button
                                                onClick={() => handleProAction(() => setIsCloseMic(true))}
                                                className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold transition-colors border-l border-slate-700/50 ${isCloseMic ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                <div className="flex items-center justify-center gap-1 relative">
                                                    근접 모드 {!isPro && <Lock size={12} className="text-amber-500/70 ml-0.5" />}
                                                </div>
                                                <span className="text-[10px] md:text-xs opacity-70 font-normal mt-0.5 inline-block">약 30cm (합창 중)</span>
                                            </button>
                                        </div>
                                        <p className="text-xs md:text-sm text-slate-500 leading-relaxed px-1 mt-1">
                                            합창 연습 중에 내 목소리만 정확히 분리하고 싶다면 <strong>근접 모드</strong>를 켜고 스마트폰을 얼굴 가까이(30cm 이내) 대고 부르세요. 주변 단원들의 소리는 노이즈 게이트로 차단됩니다.
                                        </p>
                                    </div>
                                </div>

                                {/* Divider for Desktop, horizontal for Mobile */}
                                <div className="hidden md:block w-px bg-slate-800 my-2"></div>
                                <div className="w-full h-px bg-slate-800 my-2 md:hidden"></div>

                                {/* Right Column: Calibration */}
                                <div className="flex-1 flex flex-col gap-6">
                                    {/* 2. A4 Calibration Settings */}
                                    <div className="flex flex-col gap-3 h-full">
                                        <span className="text-slate-300 font-medium text-sm md:text-base flex justify-between items-center">
                                            피아노 기준음 (A4) 교정
                                            {isAutoTuning && <span className="text-amber-400 text-xs animate-pulse font-bold">마이크로 감지 중...</span>}
                                        </span>

                                        <div className="flex items-center gap-4 w-full justify-between bg-slate-950 p-4 md:p-6 rounded-2xl border border-slate-800 shadow-inner flex-1">
                                            <button
                                                onClick={() => handleProAction(() => setA4(prev => Math.max(430, prev - 1)))}
                                                disabled={isListening || isAutoTuning}
                                                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-30 relative shadow"
                                            >
                                                {!isPro && <Lock size={12} className="absolute top-2 right-2 text-amber-500/50" />}
                                                <span className="text-2xl font-light">-</span>
                                            </button>
                                            <div className="flex-1 text-center">
                                                <span className="font-mono font-black text-4xl md:text-5xl text-indigo-400 tracking-tighter">{a4}</span>
                                                <span className="text-slate-500 ml-1 md:ml-2 text-sm md:text-base font-medium">Hz</span>
                                            </div>
                                            <button
                                                onClick={() => handleProAction(() => setA4(prev => Math.min(450, prev + 1)))}
                                                disabled={isListening || isAutoTuning}
                                                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-30 relative shadow"
                                            >
                                                {!isPro && <Lock size={12} className="absolute top-2 right-2 text-amber-500/50" />}
                                                <span className="text-2xl font-light">+</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleProAction(() => {
                                                if (isAutoTuning) {
                                                    stopListening();
                                                } else {
                                                    startListening('piano');
                                                }
                                            })}
                                            className={`w-full py-4 md:py-5 mt-2 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-colors relative shadow-md ${isAutoTuning
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-pulse shadow-amber-500/10'
                                                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-indigo-500/10'
                                                }`}
                                        >
                                            {!isPro && <Lock size={14} className="absolute right-4 text-amber-500/50" />}
                                            {isAutoTuning ? (
                                                <>
                                                    <Activity size={20} className="shrink-0" />
                                                    <span className="truncate pr-6">피아노 '라(A)' 건반을 길게 쳐주세요...</span>
                                                </>
                                            ) : (
                                                "🎙️ 피아노 소리 듣고 자동 맞춤"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Paywall Modal Overlay */}
            {
                showProModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 max-w-sm md:max-w-3xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                            <div className="flex justify-between items-center mb-6 md:mb-8 relative z-10">
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    <Crown className="text-amber-400" size={24} />
                                    Tuner PRO
                                </h2>
                                <button
                                    onClick={() => setShowProModal(false)}
                                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-stretch">
                                <div className="relative z-10 text-center md:text-left md:flex-1 flex flex-col justify-center">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 md:mb-6 shadow-inner">
                                        <Crown size={36} />
                                    </div>
                                    <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4">프리미엄 기능 잠금 해제</h3>
                                    <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                                        A4 기준음 미세 교정과 합창단 근접 마이크 모드 등 전문가를 위한 튜닝을 제공합니다.
                                    </p>
                                </div>

                                <div className="w-full md:flex-[1.5] flex flex-col justify-between relative z-10">
                                    <div className="space-y-4 mb-8 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                                        <div className="flex items-start gap-3 text-sm md:text-base text-slate-300">
                                            <CheckCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                            <span><strong>A4 주파수 미세 조절</strong><br /><span className="text-slate-500 text-xs md:text-sm mt-1 block">430Hz~450Hz 사이의 디테일한 교정</span></span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm md:text-base text-slate-300">
                                            <CheckCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                            <span><strong>피아노 소리 자동 인식</strong><br /><span className="text-slate-500 text-xs md:text-sm mt-1 block">A음정을 들려주면 자동으로 튜닝</span></span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm md:text-base text-slate-300">
                                            <CheckCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                            <span><strong>합창단 근접 마이크 모드</strong><br /><span className="text-slate-500 text-xs md:text-sm mt-1 block">주변 소음을 완벽히 차단하는 게이트</span></span>
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => {
                                                // Test unlock implementation
                                                setIsPro(true);
                                                setShowProModal(false);
                                            }}
                                            className="w-full py-4 md:py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] text-lg relative z-10"
                                        >
                                            PRO 등급 해제 (₩12,000)
                                        </button>
                                        <p className="text-center text-xs md:text-sm text-slate-500 mt-4 md:mt-3 font-medium">한 번 결제로 평생 소장하세요.</p>
                                    </div>
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
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md md:max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="flex justify-between items-center mb-6 md:mb-8">
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    <Info className="text-indigo-400" size={24} />
                                    보컬 전용 튜너 작동 원리
                                </h2>
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 md:space-y-8 text-sm md:text-base text-slate-300">
                                <section>
                                    <h3 className="font-bold text-indigo-300 text-base md:text-lg mb-2 md:mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm">1</span>
                                        60cm 확장형 수음 (RMS Gate)
                                    </h3>
                                    <p className="leading-relaxed border-l-2 border-slate-700 pl-3 md:pl-4 ml-3 md:ml-4">
                                        일반 튜너는 백색소음까지 섞여서 고장납니다. 이 튜너는 물리적인 소리 에너지(RMS) 기준값을 조절하여 <strong>"스마트폰 60cm 내외의 목소리"</strong>를 악보를 보며 편안하게 수음하면서도, 거리가 너무 먼 주변 단원들의 소리는 연산 전에 수학적으로 완전히 차단합니다.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="font-bold text-indigo-300 text-base md:text-lg mb-2 md:mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm">2</span>
                                        바이브레이션 완충기 (Vibrato Absorber)
                                    </h3>
                                    <p className="leading-relaxed border-l-2 border-slate-700 pl-3 md:pl-4 ml-3 md:ml-4">
                                        기계는 1초에 60번씩 미세한 떨림을 감지합니다. 이 튜너는 성대의 자연스러운 바이브레이션(떨림) 주기를 400ms 완충 버퍼로 흡수하여 <strong>"가창자의 진짜 중심 음정"</strong>만 묵직하고 안정적으로 화면에 표시합니다.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="font-bold text-indigo-300 text-base md:text-lg mb-2 md:mb-3 flex items-center gap-2">
                                        <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm">3</span>
                                        합창단 맞춤형 허용 오차 (Tolerance)
                                    </h3>
                                    <p className="leading-relaxed border-l-2 border-slate-700 pl-3 md:pl-4 ml-3 md:ml-4">
                                        프로용 악기 튜너는 ±5 Cents를 벗어나면 에러를 띄우지만, 실제 합창단에서 사람 귀에 아름답게 화음이 섞이는(블렌딩) 범위는 <strong>±15 ~ ±20 Cents</strong> 입니다. 로봇 같은 튜너의 경고창에 겁내지 않고 본인의 실력에 맞는 난이도를 선택해 연습할 수 있습니다.
                                    </p>
                                </section>
                            </div>

                            <div className="mt-8 md:mt-10 flex justify-end">
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="w-full md:w-auto md:px-12 py-3 md:py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl transition-colors"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Mirroring Modal Overlay */}
            {
                showMirrorModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-sm md:max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6 md:mb-8">
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    <MonitorUp className="text-indigo-400" size={24} />
                                    화면 미러링
                                </h2>
                                <button
                                    onClick={() => setShowMirrorModal(false)}
                                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-stretch">
                                <div className="text-center md:text-left md:flex-1 flex flex-col justify-center">
                                    <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 md:mb-6">
                                        <MonitorUp size={32} />
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-4">대형 모니터로 화면 공유</h3>
                                    <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                                        지휘자나 파트장이 전체 화면을 띄워두고<br className="hidden md:block" />합창 단원들을 교육할 때 유용합니다.
                                    </p>
                                </div>

                                <div className="space-y-4 w-full md:flex-[1.5] relative z-10 bg-slate-950 p-4 md:p-6 rounded-2xl border border-slate-800">
                                    <div className="flex items-start gap-3 text-sm md:text-base text-slate-300">
                                        <div className="bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs text-indigo-400 font-bold">1</div>
                                        <span>iPhone의 우측 상단을 아래로 쓸어내려<br /><strong className="text-white">제어 센터</strong>를 엽니다.</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm md:text-base text-slate-300">
                                        <div className="bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs text-indigo-400 font-bold">2</div>
                                        <span><strong>화면 미러링</strong> (네모 두 개가 겹친 아이콘) 버튼을 탭합니다.</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm md:text-base text-slate-300">
                                        <div className="bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs text-indigo-400 font-bold">3</div>
                                        <span>연결할 <strong>스마트 TV나 모니터</strong> (Apple TV 등)를 선택하세요.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={() => setShowMirrorModal(false)}
                                    className="w-full md:w-auto md:px-10 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg rounded-xl transition-colors"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
