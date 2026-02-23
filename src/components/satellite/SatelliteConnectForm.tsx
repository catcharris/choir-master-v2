import React from 'react';
import { RadioReceiver, AlertCircle } from 'lucide-react';

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

                <form onSubmit={onConnect} className="space-y-4">
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
                        disabled={isConnecting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl transition-colors mt-4"
                    >
                        {isConnecting ? '연결 중...' : '마스터에 연결하기'}
                    </button>
                </form>
            </div>
        </main>
    );
}
