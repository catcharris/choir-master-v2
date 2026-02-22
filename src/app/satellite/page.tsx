"use client";
import React, { useState } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { useSatelliteStreamer } from '@/lib/useSatelliteStreamer';
import { RadioReceiver, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

export default function SatellitePage() {
    const [roomId, setRoomId] = useState('');
    const [partName, setPartName] = useState('');

    const { status: wsStatus, connect, disconnect, broadcastPitch } = useSatelliteStreamer(roomId, partName);

    // We pass our broadcast function directly into the Pitch Engine callback
    const { listenMode, startListening, stopListening, pitch, error } = useAudioEngine(440, broadcastPitch);

    const isConnected = wsStatus === 'connected';

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim() || !partName.trim()) return;
        connect();
        startListening('vocal');
    };

    const handleDisconnect = () => {
        disconnect();
        stopListening();
    };

    if (!isConnected) {
        return (
            <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                            <RadioReceiver size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2">위성 송신기 (Satellite)</h1>
                    <p className="text-slate-400 text-sm text-center mb-8">
                        이 스마트폰의 마이크로 수음한 음정 데이터를 지휘자의 마스터 뷰로 실시간 전송합니다.
                    </p>

                    <form onSubmit={handleConnect} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Room 코드를 입력하세요</label>
                            <input
                                type="text"
                                placeholder="예: 9876"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">담당 파트 이름</label>
                            <input
                                type="text"
                                placeholder="예: 소프라노, 테너 1, 플루트"
                                value={partName}
                                onChange={(e) => setPartName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm border border-red-800 flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={wsStatus === 'connecting'}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl transition-colors mt-4"
                        >
                            {wsStatus === 'connecting' ? '연결 중...' : '마스터에 연결하기'}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center">
            <div className="w-full max-w-sm flex flex-col items-center">
                {/* Active Status Badge */}
                <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold mb-12 animate-pulse">
                    <RadioReceiver size={16} />
                    데이터 실시간 전송 중
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-xl text-slate-400 mb-1">Room {roomId}</h2>
                    <h1 className="text-4xl font-black text-white">{partName}</h1>
                </div>

                {/* Minimal Pitch Display (To save battery/screen distraction) */}
                <div className="w-48 h-48 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center mb-16 relative">
                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-ping opacity-20"></div>
                    {pitch ? (
                        <>
                            <span className="text-5xl font-black">{pitch.note}</span>
                            <span className="text-slate-400 mt-2">{Math.round(pitch.frequency)} Hz</span>
                        </>
                    ) : (
                        <span className="text-slate-500 font-medium">수음 대기 중...</span>
                    )}
                </div>

                <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                >
                    <LogOut size={20} />
                    전송 종료 및 나가기
                </button>
            </div>
        </main>
    );
}
