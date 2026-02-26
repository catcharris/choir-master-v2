"use client";
import Link from 'next/link';
import { Home } from 'lucide-react';
import Tuner from "@/components/Tuner";
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export default function TunerPage() {
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    return (
        <main className="h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Home Navigation */}
            {!isNative && (
                <div className="absolute top-6 left-6 z-20">
                    <Link href="/" className="flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl backdrop-blur-md transition-all border border-white/5 hover:border-white/20">
                        <Home size={20} />
                    </Link>
                </div>
            )}

            <div className="h-full w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col px-4 pb-8 pt-16 mt-2 md:pt-24">
                <header className="shrink-0 mb-6 text-center flex flex-col items-center">
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
                        Personal Tuner
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">개별 표적 발성 연습</p>
                </header>

                <Tuner />

            </div>
        </main>
    );
}
