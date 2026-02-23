import Link from 'next/link';
import { LayoutGrid, Mic2, Activity, Music4, ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden relative">

      {/* Dynamic Animated Mesh Gradient Background 
          This creates a slow-moving cinematic color aura behind the cards 
      */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen filter blur-[100px] bg-indigo-600/30 animate-[spin_20s_linear_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[120px] bg-emerald-600/20 animate-[spin_25s_linear_infinite_reverse]" />
        <div className="absolute top-[40%] left-[30%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[90px] bg-cyan-600/20 animate-[spin_30s_linear_infinite]" />
      </div>

      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 w-full max-w-6xl mx-auto z-10">

        {/* Premium Hero Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
          <div className="text-left max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-2xl">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold tracking-widest text-slate-300 uppercase">System Online</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.1] mb-6">
              Choir Master<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
                Cloud.
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-400 font-medium tracking-tight leading-relaxed max-w-xl">
              Zero-Hardware 스튜디오급 합창 원격 동기화 플랫폼. 지휘자와 성가대원을 0.1초 만에 연결합니다.
            </p>
          </div>

          <div className="hidden md:flex shrink-0 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-[2.5rem] border border-white/10 backdrop-blur-xl items-center justify-center shadow-[0_0_80px_-20px_rgba(99,102,241,0.3)] shadow-[inset_0_0_40px_rgba(255,255,255,0.05)] transform rotate-3 hover:rotate-0 transition-transform duration-700">
            <Music4 size={64} className="text-indigo-300" />
          </div>
        </div>

        {/* Bento Grid Action Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 w-full">

          {/* Master Entry (Large Primary Feature) */}
          <Link href="/master" className="group md:col-span-8">
            <div className="h-full relative overflow-hidden bg-slate-900/40 hover:bg-indigo-900/40 border border-white/5 hover:border-indigo-500/30 rounded-[2rem] p-8 sm:p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20 flex flex-col justify-between backdrop-blur-xl">
              {/* Dynamic Glare Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] transition-opacity duration-700" />

              <div className="flex justify-between items-start mb-12 relative z-10">
                <div className="w-16 h-16 bg-indigo-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner shadow-white/10 group-hover:scale-110 transition-transform duration-500">
                  <LayoutGrid size={32} className="text-indigo-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white text-slate-500 transition-colors duration-300">
                  <ChevronRight size={20} />
                </div>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">지휘자 마스터 콘솔</h2>
                <p className="text-slate-400 text-lg sm:text-xl font-medium max-w-md">오디오 엔진 뷰를 생성하고 수십 명의 성가대원 녹음을 실시간으로 통제합니다.</p>
              </div>
            </div>
          </Link>

          {/* Satellite Entry (Tall Secondary Feature) */}
          <Link href="/satellite" className="group md:col-span-4">
            <div className="h-full relative overflow-hidden bg-slate-900/40 hover:bg-emerald-900/30 border border-white/5 hover:border-emerald-500/30 rounded-[2rem] p-8 sm:p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 flex flex-col justify-between backdrop-blur-xl min-h-[300px]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] transition-opacity duration-700" />

              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-14 h-14 bg-emerald-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner shadow-white/10 group-hover:scale-110 transition-transform duration-500">
                  <Mic2 size={28} className="text-emerald-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white text-slate-500 transition-colors duration-300">
                  <ChevronRight size={20} />
                </div>
              </div>

              <div className="relative z-10">
                <h2 className="text-2xl font-black text-white mb-3">성가대원 위성</h2>
                <p className="text-slate-400 font-medium">부여받은 Room 번호로 로그인하여 즉각적인 동기화 녹음에 참여합니다.</p>
              </div>
            </div>
          </Link>

          {/* Tuner Entry (Footer Feature horizontally spanning) */}
          <Link href="/tuner" className="group md:col-span-12">
            <div className="relative overflow-hidden bg-slate-900/30 hover:bg-cyan-900/20 border border-white/5 hover:border-cyan-500/30 rounded-[2rem] p-6 sm:px-10 sm:py-8 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 backdrop-blur-xl">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1),transparent_70%)] transition-opacity duration-700" />

              <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 bg-cyan-500/10 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 shadow-inner inline-flex">
                  <Activity size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">개인 코칭 스마트 튜너</h2>
                  <p className="text-slate-400 text-sm">서버 스트리밍 없이 100% 로컬 디바이스 연산으로 내 발성 피치를 정밀 교정합니다.</p>
                </div>
              </div>
              <div className="hidden sm:flex shrink-0 px-4 py-2 bg-white/5 group-hover:bg-cyan-500 group-hover:text-white text-slate-300 font-bold rounded-full transition-colors duration-300 text-sm items-center gap-2">
                단독 연습 <ChevronRight size={16} />
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 py-8 text-center border-t border-white/5 bg-slate-950/50 backdrop-blur-md mt-auto">
        <p className="text-sm font-medium text-slate-600 mb-1">Acoustic Engineering by</p>
        <p className="font-black text-slate-400 tracking-[0.3em] uppercase text-xs">
          Lemon Production
        </p>
      </footer>

    </main>
  );
}
