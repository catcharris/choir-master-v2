import React from 'react';
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
    if (satellites.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                <Activity size={48} className="opacity-20" />
                <p className="text-lg font-medium">단원들의 연결을 기다리고 있습니다...</p>
                <p className="text-sm">단원들은 위성 앱에서 Room {roomId}를 입력해야 합니다.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
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
                    <div key={sat.part} className={`relative overflow-hidden rounded-3xl p-6 flex flex-col transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98] ${sat.connected ? 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/10' : 'bg-slate-900/40 backdrop-blur-md border border-slate-800/50 opacity-70'}`}>
                        {/* Elegant Background Glow */}
                        {sat.connected && <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full opacity-30 pointer-events-none transition-colors duration-500 ${isStable ? 'bg-green-500' : p?.cents && p.cents > 0 ? 'bg-rose-500' : p?.cents && p.cents < 0 ? 'bg-blue-500' : 'bg-indigo-500'}`} />}

                        <div className="flex justify-between items-start mb-6 z-10">
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">{sat.part}</h2>
                            {p ? (
                                <span className={`text-[10px] font-black tracking-wider px-3 py-1.5 rounded-full text-center transition-colors duration-300 shadow-inner border ${isStable ? 'bg-green-500/20 text-green-400 border-green-500/30 shadow-green-500/10' : 'bg-slate-800/80 text-slate-300 border-slate-700 shadow-black/20'}`}>
                                    {isStable ? 'PERFECT' : 'ADJUST'}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-500">
                                    {sat.connected ? 'LISTENING' : 'WAITING'}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center mb-6 z-10">
                            {p ? (
                                <>
                                    <div className="text-[5.5rem] leading-none font-black tracking-tighter tabular-nums flex items-end drop-shadow-xl">
                                        {p.note}
                                        <span className={`text-2xl font-bold mb-4 ml-1 transition-colors duration-300 ${isStable ? 'text-green-400' : 'text-slate-400'}`}>
                                            {p.cents > 0 ? '+' : ''}{p.cents}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 font-mono mt-2">
                                        {p.frequency.toFixed(1)} Hz
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-500 font-medium flex flex-col items-center gap-2">
                                    <Activity size={24} className={sat.connected ? 'animate-pulse text-indigo-400/50' : 'opacity-20'} />
                                    {sat.connected ? '수음 중...' : '신호 대기 중'}
                                </div>
                            )}
                        </div>

                        {/* Visual Pitch Bar */}
                        <div className={`h-2.5 w-full rounded-full overflow-hidden relative transition-colors duration-500 shadow-inner z-10 ${sat.connected ? 'bg-black/40 border border-white/5' : 'bg-slate-800/30'}`}>
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
                        <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-2 opacity-60 tracking-widest z-10">
                            <span>FLAT</span>
                            <span>PERFECT</span>
                            <span>SHARP</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
