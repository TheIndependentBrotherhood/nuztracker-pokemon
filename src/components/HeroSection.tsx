'use client';

interface Props {
  runsCount: number;
  activeCount: number;
  capturesCount: number;
  onNewRun: () => void;
}

export default function HeroSection({ runsCount, activeCount, capturesCount, onNewRun }: Props) {
  return (
    <section className="relative overflow-hidden py-16 px-4 text-center">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59,130,246,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative animate-slide-up">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-3">
          <span className="gradient-text">NuzTracker</span>
        </h1>
        <p className="text-slate-300 text-lg sm:text-xl max-w-xl mx-auto mb-2">
          Suivi de votre aventure Pokémon
        </p>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-10">
          Trackez vos runs Nuzlocke, gérez votre équipe et explorez les zones interactives.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-10">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-5 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-white">{runsCount}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mt-0.5">Runs</div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-5 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mt-0.5">Active</div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-5 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-blue-400">{capturesCount}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mt-0.5">Captures</div>
          </div>
        </div>

        <button
          onClick={onNewRun}
          className="btn-gradient inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>+</span>
          New Run
        </button>
      </div>
    </section>
  );
}
