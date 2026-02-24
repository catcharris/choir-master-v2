'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export function PortraitLockOverlay() {
    const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Check if the device is in landscape mode AND is a mobile-sized device (width <= 900px)
            // We use 900px to avoid catching standard iPad Mini/iPad in landscape (which are usually 1024px+ wide in landscape)
            // Or specifically check orientation angle and user agent if needed, but innerWidth vs innerHeight is robust
            const isLandscape = window.innerWidth > window.innerHeight;
            // A typical phone in landscape has height < 450px. iPads in landscape have height > 700px.
            const isMobile = window.innerHeight < 500;

            if (isLandscape && isMobile) {
                setIsLandscapeMobile(true);
            } else {
                setIsLandscapeMobile(false);
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (!isLandscapeMobile) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 pointer-events-auto sm:hidden landscape:flex">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center animate-bounce shadow-2xl shadow-indigo-500/20 mb-8">
                <RotateCcw size={40} className="text-indigo-400" />
            </div>

            <h2 className="text-2xl font-black text-white text-center mb-3">
                기기를 세로로 돌려주세요
            </h2>

            <p className="text-slate-400 text-center text-sm font-medium leading-relaxed max-w-sm">
                Choir Master 모바일 환경은 <span className="text-emerald-400">세로 모드(Portrait)</span>에 최적화되어 있습니다.<br />
                원활한 이용을 위해 스마트폰을 똑바로 세워주세요.
            </p>
        </div>
    );
}
