'use client';

import Link from 'next/link';
import { LayoutGrid, Mic2, Activity, Music4, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export default function Home() {
  const t = useTranslation();
  const router = useRouter();

  // Redirect native iOS/Android apps directly to the Tuner
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      router.replace('/tuner');
    }
  }, [router]);

  return (
    <main className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden relative selection:bg-indigo-500/30">

      {/* Dynamic Animated Mesh Gradient Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30 [.is-native_&]:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[100px] bg-indigo-600/30 animate-[spin_20s_linear_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[120px] bg-emerald-600/20 animate-[spin_25s_linear_infinite_reverse]" />
      </div>

      <div className="[.is-native_&]:hidden flex-1 flex flex-col justify-between p-4 sm:p-8 w-full max-w-4xl mx-auto z-10 h-full safe-area-padding">

        {/* Premium Hero Section (Compact) */}
        <div className="flex items-center justify-between gap-4 mt-2 sm:mt-6 mb-4 sm:mb-8 shrink-0">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-3 sm:mb-4 shadow-lg">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold tracking-widest text-slate-300 uppercase">System Online</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-[1.1] mb-2 sm:mb-3 flex flex-wrap items-end gap-x-2">
              <span>Choir Master</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400 relative inline-block pr-8">
                Cloud.
                <span className="absolute top-0 right-0 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded-md tracking-wider shadow-lg">
                  v2.0.1
                </span>
              </span>
            </h1>
            <p className="text-[13px] sm:text-base text-slate-400 font-medium tracking-tight max-w-sm sm:max-w-lg leading-snug">
              {t.hero_desc1}<br className="sm:hidden" /> {t.hero_desc2}
            </p>
          </div>

          <div className="hidden sm:flex shrink-0 w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-2xl border border-white/10 backdrop-blur-xl items-center justify-center transform rotate-3 shadow-2xl">
            <Music4 size={40} className="text-indigo-300" />
          </div>
        </div>

        {/* Cards Area (Flex Col on Mobile, Flex Row on iPad) */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 w-full justify-center min-h-0 pb-4">

          {/* Master Entry */}
          <Link href="/master" className="group flex-1 min-h-[90px] max-h-[160px] md:max-h-[400px]">
            <div className="h-full relative overflow-hidden bg-slate-900/40 hover:bg-indigo-900/40 border border-white/5 hover:border-indigo-500/30 rounded-[1.5rem] sm:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/20 flex items-center md:flex-col md:items-start justify-between backdrop-blur-xl group-active:scale-[0.98]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_right_top,rgba(99,102,241,0.15),transparent_60%)] transition-opacity duration-700" />
              <div className="flex items-center md:flex-col md:items-start gap-4 sm:gap-6 relative z-10 min-w-0 pr-4 md:pr-0">
                <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-indigo-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 md:mb-4">
                  <LayoutGrid size={24} className="text-indigo-400 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl md:text-2xl lg:text-3xl font-black text-white mb-0.5 sm:mb-1 md:mb-3 truncate md:whitespace-normal break-keep">{t.menu_master_title}</h2>
                  <p className="text-slate-400 text-[11px] sm:text-sm md:text-sm lg:text-base font-medium line-clamp-2 md:line-clamp-none leading-snug md:leading-relaxed break-keep">{t.menu_master_desc}</p>
                </div>
              </div>
              <div className="w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white text-slate-500 transition-colors duration-300 relative z-10 md:absolute md:bottom-6 md:right-6">
                <ChevronRight size={18} />
              </div>
            </div>
          </Link>

          {/* Satellite Entry */}
          <Link href="/satellite" className="group flex-1 min-h-[90px] max-h-[160px] md:max-h-[400px]">
            <div className="h-full relative overflow-hidden bg-slate-900/40 hover:bg-emerald-900/30 border border-white/5 hover:border-emerald-500/30 rounded-[1.5rem] sm:rounded-3xl p-4 sm:p-6 md:p-8 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/20 flex items-center md:flex-col md:items-start justify-between backdrop-blur-xl group-active:scale-[0.98]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_right_top,rgba(16,185,129,0.15),transparent_60%)] transition-opacity duration-700" />
              <div className="flex items-center md:flex-col md:items-start gap-4 sm:gap-6 relative z-10 min-w-0 pr-4 md:pr-0">
                <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-emerald-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 md:mb-4">
                  <Mic2 size={24} className="text-emerald-400 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl md:text-2xl lg:text-3xl font-black text-white mb-0.5 sm:mb-1 md:mb-3 truncate md:whitespace-normal break-keep">{t.menu_satellite_title}</h2>
                  <p className="text-slate-400 text-[11px] sm:text-sm md:text-sm lg:text-base font-medium line-clamp-2 md:line-clamp-none leading-snug md:leading-relaxed break-keep">{t.menu_satellite_desc}</p>
                </div>
              </div>
              <div className="w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white text-slate-500 transition-colors duration-300 relative z-10 md:absolute md:bottom-6 md:right-6">
                <ChevronRight size={18} />
              </div>
            </div>
          </Link>

          {/* Tuner Entry */}
          <Link href="/tuner" className="group shrink-0 h-[70px] sm:h-[90px] md:h-auto md:flex-1 md:max-h-[400px]">
            <div className="h-full relative overflow-hidden bg-slate-900/30 hover:bg-cyan-900/20 border border-white/5 hover:border-cyan-500/30 rounded-2xl sm:rounded-3xl p-4 sm:px-6 md:p-8 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 flex items-center md:flex-col md:items-start justify-between backdrop-blur-xl group-active:scale-[0.98]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_right_top,rgba(6,182,212,0.1),transparent_60%)] transition-opacity duration-700" />
              <div className="flex items-center md:flex-col md:items-start gap-3 sm:gap-4 md:gap-6 relative z-10 min-w-0 pr-4 md:pr-0">
                <div className="w-10 h-10 md:w-16 md:h-16 shrink-0 bg-cyan-500/10 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner md:mb-4">
                  <Activity size={20} className="text-cyan-400 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-0.5 md:mb-2 truncate md:whitespace-normal break-keep">{t.menu_tuner_title}</h2>
                  <p className="text-slate-400 text-[10px] sm:text-xs md:text-xs lg:text-sm font-medium truncate md:whitespace-normal break-keep">{t.menu_tuner_desc}</p>
                </div>
              </div>
              <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/5 group-hover:bg-cyan-500 group-hover:text-white text-slate-500 transition-colors duration-300 relative z-10 text-xs md:absolute md:bottom-6 md:right-6">
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>

        </div>

        {/* Footer Branding */}
        <footer className="shrink-0 text-center pb-2 pt-2 border-t border-white/5 mt-auto z-10">
          <p className="text-[10px] font-medium text-slate-600 mb-0.5">Acoustic Engineering by</p>
          <p className="font-black text-slate-400 tracking-[0.2em] uppercase text-[10px]">Lemon Production</p>
        </footer>

      </div>
    </main>
  );
}
