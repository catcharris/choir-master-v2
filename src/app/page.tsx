import Tuner from "@/components/Tuner";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-md mx-auto py-10">
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
            Choir Tuner
          </h1>
          <p className="text-slate-400 text-sm mt-1">개별 파트 피치 트래커 (MVP)</p>
        </header>

        <Tuner />

      </div>
    </main>
  );
}
