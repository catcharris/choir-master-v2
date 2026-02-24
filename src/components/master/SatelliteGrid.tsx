import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { PitchData } from '@/lib/pitch';

export interface SatelliteData {
    part: string;
    connected: boolean;
    pitch: PitchData | null;
}

interface SatelliteGridProps {
    roomId: string;
    satellites: SatelliteData[];
}

export function SatelliteGrid({ roomId, satellites }: SatelliteGridProps) {
    const [selectedPart, setSelectedPart] = useState<string | null>(null);

    // Derived state so it stays perfectly synced with real-time prop updates
    const activeSatellite = selectedPart ? satellites.find(s => s.part === selectedPart) || null : null;

    if (satellites.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                <Activity size={48} className="opacity-20" />
                <p className="text-lg font-medium">단원들의 연결을 기다리고 있습니다...</p>
                <p className="text-sm">단원들은 위성 앱에서 Room {roomId}를 입력해야 합니다.</p>
            </div>
        );
    }

    // Dynamic grid scaling based on number of connected satellites
    const count = satellites.length;
    let gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"; // Default for small groups
    let cardPadding = "p-3 sm:p-5";
    let titleSize = "text-lg sm:text-xl";
    let pitchSize = "text-[2rem] sm:text-[3rem]";

    if (count > 24) {
        // Massive choir mode (25~50+)
        gridCols = "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-3";
        cardPadding = "p-2 sm:p-3";
        titleSize = "text-sm sm:text-base";
        pitchSize = "text-2xl sm:text-3xl font-bold";
    } else if (count > 12) {
        // Medium choir mode (13~24)
        gridCols = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 gap-3 sm:gap-4";
        cardPadding = "p-3 sm:p-4";
        titleSize = "text-base sm:text-lg";
        pitchSize = "text-4xl sm:text-5xl";
    } else {
        gridCols += " gap-4 sm:gap-6";
    }

    return (
        <>
            {/* Main Grid View */}
            <div className={`grid ${gridCols} auto-rows-fr`}>
                {satellites.map((sat) => {
                    const p = sat.pitch;
                    const isStable = p ? Math.abs(p.cents) <= 20 : false;

                    // Dynamic color based on cents deviation
                    let barColor = 'bg-slate-700';
                    if (p) {
                        if (isStable) barColor = 'bg-green-500';
                        else if (p.cents > 0) barColor = 'bg-rose-500'; // Sharp
                        else barColor = 'bg-blue-500'; // Flat
                    }

                    return (
                        <div
                            key={sat.part}
                            onClick={() => setSelectedPart(sat.part)}
                            className={`relative overflow-hidden rounded-[1.5rem] flex flex-col justify-between transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer aspect-square ${cardPadding} ${sat.connected ? 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/10 hover:border-indigo-500/50 hover:bg-white/10' : 'bg-slate-900/40 backdrop-blur-md border border-slate-800/50 opacity-70 hover:opacity-100'}`}
                        >
                            {/* Elegant Background Glow */}
                            {sat.connected && <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full opacity-30 pointer-events-none transition-colors duration-500 ${isStable ? 'bg-green-500' : p?.cents && p.cents > 0 ? 'bg-rose-500' : p?.cents && p.cents < 0 ? 'bg-blue-500' : 'bg-indigo-500'}`} />}

                            <div className={`flex justify-start items-start z-10 w-full ${count > 24 ? 'mb-1' : 'mb-2'}`}>
                                <div className="flex-1 min-w-0 pr-16">
                                    <h2 className={`${titleSize} font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 leading-tight truncate`}>{sat.part}</h2>
                                </div>
                                {p ? (
                                    <span className={`absolute top-3 right-3 sm:top-4 sm:right-4 flex-shrink-0 text-[8px] sm:text-[9px] font-black tracking-wider px-2 py-1 rounded-full text-center transition-colors duration-300 shadow-inner border max-w-min whitespace-nowrap ${isStable ? 'bg-green-500/20 text-green-400 border-green-500/30 shadow-green-500/10' : 'bg-slate-800/80 text-slate-300 border-slate-700 shadow-black/20'}`}>
                                        {isStable ? 'PERFECT' : 'ADJUST'}
                                    </span>
                                ) : (
                                    <span className="absolute top-3 right-3 sm:top-4 sm:right-4 flex-shrink-0 text-[8px] sm:text-[9px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">
                                        {sat.connected ? 'LISTENING' : 'WAITING'}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center z-10 w-full min-h-0 overflow-hidden">
                                {p ? (
                                    <>
                                        <div className="flex items-end justify-center w-full">
                                            <div className={`${pitchSize} leading-none tracking-tighter tabular-nums drop-shadow-xl truncate`}>
                                                {p.note}
                                            </div>
                                            <span className={`${count > 24 ? 'text-xs' : 'text-lg sm:text-2xl'} font-bold mb-1 ml-1 transition-colors duration-300 ${isStable ? 'text-green-400' : 'text-slate-400'}`}>
                                                {p.cents > 0 ? '+' : ''}{p.cents}
                                            </span>
                                        </div>
                                        {count <= 24 && (
                                            <div className="text-slate-400 font-mono mt-1 text-[10px] sm:text-sm">
                                                {p.frequency.toFixed(1)} Hz
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className={`text-slate-500 font-medium flex flex-col items-center justify-center h-full ${count > 24 ? 'gap-1' : 'gap-2'}`}>
                                        <Activity size={count > 24 ? 16 : 24} className={sat.connected ? 'animate-pulse text-indigo-400/50' : 'opacity-20'} />
                                        <span className={`${count > 24 ? 'text-[9px]' : 'text-[11px] sm:text-xs'}`}>
                                            {count <= 24 && (sat.connected ? '수음 중...' : '신호 대기')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Visual Pitch Bar */}
                            <div className={`w-full rounded-full overflow-hidden relative transition-colors duration-500 shadow-inner z-10 ${count > 24 ? 'h-1.5' : 'h-2 sm:h-2.5'} ${sat.connected ? 'bg-black/40 border border-white/5' : 'bg-slate-800/30'}`}>
                                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                                {p && (
                                    <div
                                        className={`h-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${barColor}`}
                                        style={{
                                            width: '50%',
                                            transform: `translateX(${p.cents > 0 ? 100 : 0}%) scaleX(${Math.abs(p.cents) / 50})`,
                                            transformOrigin: p.cents > 0 ? 'left' : 'right'
                                        }}
                                    />
                                )}
                            </div>
                            {count <= 24 && (
                                <div className="flex justify-between text-[8px] sm:text-[9px] text-slate-500 font-bold mt-2 opacity-60 tracking-widest z-10">
                                    <span>FLAT</span>
                                    <span>PERFECT</span>
                                    <span>SHARP</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Detailed Fullscreen Modal */}
            {activeSatellite && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300 cursor-pointer"
                    onClick={() => setSelectedPart(null)}
                >
                    <div
                        className={`relative w-full max-w-4xl aspect-video rounded-[3rem] p-8 sm:p-16 flex flex-col items-center justify-center overflow-hidden shadow-2xl transform transition-transform animate-in zoom-in-95 duration-300 border border-white/20 ${activeSatellite.connected ? 'bg-slate-900/80' : 'bg-slate-950/90'}`}
                    >
                        {/* Huge Background Glow */}
                        {activeSatellite.connected && (() => {
                            const sp = activeSatellite.pitch;
                            const isStable = sp ? Math.abs(sp.cents) <= 20 : false;
                            let glowColor = 'bg-indigo-500';
                            if (sp) {
                                if (isStable) glowColor = 'bg-green-500';
                                else if (sp.cents > 0) glowColor = 'bg-rose-500';
                                else glowColor = 'bg-blue-500';
                            }
                            return <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 blur-[120px] rounded-full opacity-20 pointer-events-none transition-colors duration-500 ${glowColor}`} />;
                        })()}

                        {/* Top Label */}
                        <div className="absolute top-8 left-8 sm:top-12 sm:left-12 z-10">
                            <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                                {activeSatellite.part}
                            </h2>
                            <div className="mt-2">
                                <span className={`text-sm sm:text-lg font-bold px-4 py-2 rounded-full ${activeSatellite.connected ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
                                    {activeSatellite.connected ? 'Live Feed Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>

                        {/* Giant Center Display */}
                        <div className="flex-1 flex flex-col items-center justify-center z-10 w-full pointer-events-none">
                            {activeSatellite.pitch ? (() => {
                                const sp = activeSatellite.pitch;
                                const isStable = Math.abs(sp.cents) <= 20;
                                let barColor = 'bg-slate-700';
                                if (isStable) barColor = 'bg-green-500';
                                else if (sp.cents > 0) barColor = 'bg-rose-500';
                                else barColor = 'bg-blue-500';

                                return (
                                    <>
                                        <div className="flex items-end tabular-nums drop-shadow-2xl">
                                            <span className="text-[10rem] sm:text-[16rem] leading-none font-black tracking-tighter text-white">
                                                {sp.note}
                                            </span>
                                            <span className={`text-5xl sm:text-7xl font-bold mb-8 sm:mb-12 ml-4 transition-colors duration-300 ${isStable ? 'text-green-400' : 'text-slate-400'}`}>
                                                {sp.cents > 0 ? '+' : ''}{sp.cents}
                                            </span>
                                        </div>
                                        <div className="text-3xl sm:text-5xl text-slate-400 font-mono mt-4">
                                            {sp.frequency.toFixed(1)} Hz
                                        </div>

                                        {/* Giant Visual Pitch Bar */}
                                        <div className="w-3/4 max-w-2xl h-4 sm:h-6 rounded-full overflow-hidden relative shadow-inner mt-16 sm:mt-24 bg-black/50 border border-white/10">
                                            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/40 z-10" />
                                            <div
                                                className={`h-full transition-all duration-150 ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)] ${barColor}`}
                                                style={{
                                                    width: '50%',
                                                    transform: `translateX(${sp.cents > 0 ? 100 : 0}%) scaleX(${Math.abs(sp.cents) / 50})`,
                                                    transformOrigin: sp.cents > 0 ? 'left' : 'right'
                                                }}
                                            />
                                        </div>
                                        <div className="w-3/4 max-w-2xl flex justify-between text-xs sm:text-base text-slate-500 font-bold mt-4 opacity-70 tracking-[0.3em]">
                                            <span>FLAT</span>
                                            <span>PERFECT</span>
                                            <span>SHARP</span>
                                        </div>
                                    </>
                                );
                            })() : (
                                <div className="text-slate-500 flex flex-col items-center gap-6">
                                    <Activity size={80} className={activeSatellite.connected ? 'animate-pulse text-indigo-400/50' : 'opacity-20'} />
                                    <span className="text-2xl sm:text-4xl font-medium">
                                        {activeSatellite.connected ? '음향 신호 대기 중...' : '연결이 끊어졌습니다.'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
