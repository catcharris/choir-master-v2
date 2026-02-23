import Link from 'next/link';
import { LayoutGrid, Mic2, Activity, Music4 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-[family-name:var(--font-geist-sans)] selection:bg-indigo-500/30">

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 w-full max-w-4xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-indigo-500/10 rounded-3xl mb-6 shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]">
            <Music4 size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-100 to-indigo-400 tracking-tight leading-tight">
            Choir Master Cloud
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-400 font-medium tracking-wide">
            Zero-Hardware 스튜디오급 합창 녹음 플랫폼
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">

          {/* Satellite Entry */}
          <Link href="/satellite" className="group">
            <div className="h-full bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Mic2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">성가대원 입장</h2>
              <p className="text-sm text-slate-400">지휘자가 알려준 방 번호로 접속하여 원격 동기화 녹음에 참여합니다.</p>
            </div>
          </Link>

          {/* Master Entry */}
          <Link href="/master" className="group">
            <div className="h-full bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <LayoutGrid size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">지휘자 입장</h2>
              <p className="text-sm text-slate-400">오디오 엔진 마스터 뷰를 생성하고 대원들의 녹음을 통제합니다.</p>
            </div>
          </Link>

          {/* Tuner Entry */}
          <Link href="/tuner" className="group">
            <div className="h-full bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Activity size={32} className="text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">개인 코칭 튜너</h2>
              <p className="text-sm text-slate-400">마스터 연동 없이 단독으로 발성과 피치를 교정하는 연습도구입니다.</p>
            </div>
          </Link>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm font-medium text-slate-600">
        <p>Acoustic Engineering by</p>
        <p className="mt-1 font-bold text-slate-500 tracking-widest text-xs uppercase">
          Lemon Production
        </p>
      </footer>

    </main>
  );
}
