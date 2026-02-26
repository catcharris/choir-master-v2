import React from 'react';
import Link from 'next/link';
import { Home, RadioReceiver, AlertCircle } from 'lucide-react';

interface SatelliteConnectFormProps {
    roomId: string;
    setRoomId: (id: string) => void;
    partName: string;
    setPartName: (name: string) => void;
    onConnect: (e: React.FormEvent) => void;
    isConnecting: boolean;
    error: string | null;
}

export function SatelliteConnectForm({
    roomId,
    setRoomId,
    partName,
    setPartName,
    onConnect,
    isConnecting,
    error
}: SatelliteConnectFormProps) {
    return (
        <main className="h-[100dvh] w-full fixed inset-0 overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 sm:p-8">
            {/* Home Navigation */}
            <div className="absolute top-6 left-6 z-[9999] pointer-events-auto">
                <Link href="/" className="flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl backdrop-blur-md transition-all border border-white/5 hover:border-white/20">
                    <Home size={20} />
                </Link>
            </div>

            {/* Cinematic Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[60%] bg-indigo-600/15 blur-[100px] rounded-[100%] pointer-events-none" />

            <div className="w-full max-w-sm relative z-[9999] bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl pointer-events-auto">
                <div className="flex justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse" />
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center relative shadow-lg">
                        <RadioReceiver size={32} />
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">성가대원 전송기</h1>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                        아이폰이나 갤럭시의 마이크를 통해<br />지휘자님께 내 목소리를 직접 보냅니다.
                    </p>
                </div>

                <form onSubmit={onConnect} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Room Code</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            placeholder="전달받은 숫자 입력"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xl font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 placeholder:font-normal"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Part Name</label>
                        <input
                            type="text"
                            placeholder="예: 소프라노, 테너 1"
                            value={partName}
                            onChange={(e) => setPartName(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xl font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 placeholder:font-normal"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm border border-red-500/20 flex items-center gap-3 backdrop-blur-md">
                            <AlertCircle size={18} className="shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isConnecting}
                        className="w-full mt-6 bg-white/10 hover:bg-indigo-600 text-white disabled:opacity-50 font-bold text-lg py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] relative overflow-hidden group border border-white/10 hover:border-indigo-400/50"
                    >
                        {/* Hover flare effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                        <span className="relative z-10">{isConnecting ? '연결 중...' : '마스터에 연결하기'}</span>
                    </button>
                </form>
            </div>

            {/* Safe area footer spacer */}
            <div className="h-6 shrink-0 w-full" />
        </main>
    );
}
