"use client";
import React, { useState } from 'react';
import { useMasterSubscriber } from '@/lib/useMasterSubscriber';
import { LayoutGrid, LogOut, Users, Activity, SignalHigh } from 'lucide-react';

export default function MasterPage() {
    const [roomId, setRoomId] = useState('');
    const { status: wsStatus, satellites, connect, disconnect, broadcastCommand } = useMasterSubscriber(roomId);

    const isConnected = wsStatus === 'connected';

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim()) return;
        connect();
    };

    if (!isConnected) {
        return (
            <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                            <LayoutGrid size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2">지휘자 마스터 뷰</h1>
                    <p className="text-slate-400 text-sm text-center mb-8">
                        합창단원(위성)들의 스마트폰에서 송신하는 실시간 음정 데이터를 모니터링합니다.
                    </p>

                    <form onSubmit={handleConnect} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Room 코드를 입력하세요</label>
                            <input
                                type="text"
                                placeholder="예: 9876"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center tracking-widest"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={wsStatus === 'connecting'}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl transition-colors mt-4"
                        >
                            {wsStatus === 'connecting' ? '방 생성 중...' : '마스터 뷰 열람하기'}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    const satelliteArray = Object.values(satellites).sort((a, b) => a.part.localeCompare(b.part));
    const [isRecordingMaster, setIsRecordingMaster] = useState(false);

    const handleToggleRecord = () => {
        if (isRecordingMaster) {
            broadcastCommand('STOP_RECORD');
            setIsRecordingMaster(false);
        } else {
            broadcastCommand('START_RECORD');
            setIsRecordingMaster(true);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col pt-safe-top pb-safe-bottom">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 transition-colors duration-500">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-colors duration-500 ${isRecordingMaster ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        <SignalHigh size={18} className="animate-pulse" />
                        ROOM {roomId} {isRecordingMaster && "• REC"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <Users size={16} />
                        {satelliteArray.length}개의 위성 연결됨
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToggleRecord}
                        disabled={satelliteArray.length === 0}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${isRecordingMaster ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'}`}
                    >
                        <div className={`w-3 h-3 rounded-full ${isRecordingMaster ? 'bg-white' : 'bg-red-500'}`} />
                        {isRecordingMaster ? '녹음 종료' : '전체 위성 동시 녹음'}
                    </button>
                    <button
                        onClick={disconnect}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <LogOut size={16} />
                        방 종료
                    </button>
                </div>
            </header>

            {/* Dynamic Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
                {satelliteArray.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <Activity size={48} className="opacity-20" />
                        <p className="text-lg font-medium">단원들의 연결을 기다리고 있습니다...</p>
                        <p className="text-sm">단원들은 위성 앱에서 Room {roomId}를 입력해야 합니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                        {satelliteArray.map((sat) => {
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
                                <div key={sat.part} className={`bg-slate-900 border ${sat.connected ? 'border-indigo-500/30' : 'border-slate-800 opacity-60'} rounded-3xl p-6 flex flex-col relative overflow-hidden transition-all duration-300 shadow-none`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <h2 className="text-2xl font-black text-white">{sat.part}</h2>
                                        {p ? (
                                            <span className={`text-xs font-bold px-2 py-1 rounded w-16 text-center ${isStable ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                                {isStable ? 'STABLE' : 'ADJUST'}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-500">
                                                {sat.connected ? 'LISTENING' : 'WAITING'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center mb-6">
                                        {p ? (
                                            <>
                                                <div className="text-[5rem] leading-none font-black tracking-tighter tabular-nums flex items-end">
                                                    {p.note}
                                                    <span className="text-2xl font-medium text-slate-500 mb-4 ml-1">
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
                                    <div className={`h-2 w-full rounded-full overflow-hidden relative transition-colors duration-500 ${sat.connected ? 'bg-slate-800' : 'bg-slate-800/30'}`}>
                                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 z-10" />
                                        {p && (
                                            <div
                                                className={`h-full transition-all duration-100 ease-linear ${barColor}`}
                                                style={{
                                                    width: '50%',
                                                    transform: `translateX(${p.cents > 0 ? 100 : 0}%) scaleX(${Math.abs(p.cents) / 50})`,
                                                    transformOrigin: p.cents > 0 ? 'left' : 'right'
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-2 opacity-50">
                                        <span>FLAT</span>
                                        <span>PERFECT</span>
                                        <span>SHARP</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
