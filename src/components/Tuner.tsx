// src/components/Tuner.tsx
"use client"
import React from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function Tuner() {
    const { isListening, startListening, stopListening, pitch, error } = useAudioEngine();

    // Helper to calculate the rotation of the tuning needle (-90deg to +90deg based on -50 to +50 cents)
    const getRotation = (cents: number) => {
        // Clamp cents to -50 and 50 just in case
        const clamped = Math.max(-50, Math.min(50, cents));
        return (clamped / 50) * 90; // Map -50..50 to -90..90 degrees
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800">
            {error && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2 border border-red-800">
                    <AlertCircle size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Note Display */}
            <div className="relative mb-8 text-center">
                <div className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                    {pitch ? pitch.note : '--'}
                    <span className="text-3xl text-slate-500 ml-2">{pitch ? pitch.octave : ''}</span>
                </div>
                <div className="text-slate-500 font-mono mt-2 text-xl">
                    {pitch ? `${Math.round(pitch.frequency)} Hz` : '0 Hz'}
                </div>
            </div>

            {/* Tuning Gauge UI */}
            <div className="relative w-64 h-32 mb-10 overflow-hidden">
                {/* Arc Background */}
                <svg viewBox="0 0 200 100" className="w-full h-full">
                    <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                    <path d="M 80 100 A 90 90 0 0 1 120 100" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" /> {/* Perfect Zone */}
                    <line x1="100" y1="10" x2="100" y2="25" stroke="#94a3b8" strokeWidth="2" /> {/* Center mark */}
                    <line x1="15" y1="90" x2="30" y2="80" stroke="#ef4444" strokeWidth="2" /> {/* Flat mark */}
                    <line x1="185" y1="90" x2="170" y2="80" stroke="#3b82f6" strokeWidth="2" /> {/* Sharp mark */}
                </svg>

                {/* The Needle */}
                <div
                    className="absolute bottom-0 left-1/2 w-1 h-32 bg-amber-400 origin-bottom rounded-full transition-transform duration-75 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                    style={{
                        transform: `translateX(-50%) rotate(${pitch ? getRotation(pitch.cents) : 0}deg)`,
                        opacity: pitch || !isListening ? 1 : 0.3
                    }}
                >
                    <div className="absolute top-0 -left-1.5 w-4 h-4 rounded-full bg-amber-400" />
                </div>
            </div>

            {/* Cents Readout */}
            <div className={`text-2xl font-bold mb-10 transition-colors ${!pitch ? 'text-slate-600' :
                    Math.abs(pitch.cents) < 5 ? 'text-green-400' :
                        pitch.cents < 0 ? 'text-red-400' : 'text-blue-400'
                }`}>
                {!pitch ? 'Ready' :
                    Math.abs(pitch.cents) < 5 ? 'Perfect' :
                        pitch.cents < 0 ? `${Math.abs(pitch.cents)} Flat` :
                            `${pitch.cents} Sharp`}
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
                {isListening ? "단일 목소리 음정을 분석 중입니다." : "개별 파트 연습 시 정확한 음정을 확인하세요."}
            </p>
        </div>
    );
}
