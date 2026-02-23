import Tuner from "@/components/Tuner";

export default function TunerPage() {
    return (
        <main className="h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-[family-name:var(--font-geist-sans)]">
            <div className="h-full w-full max-w-md mx-auto flex flex-col px-4 py-6">
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
