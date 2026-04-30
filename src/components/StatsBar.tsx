'use client';

import { Run } from '@/lib/types';

interface Props {
  run: Run;
}

export default function StatsBar({ run }: Props) {
  const total = run.zones.length;
  const visited = run.zones.filter((z) => z.status !== 'not-visited').length;
  const captured = run.zones.filter((z) => z.status === 'captured').length;
  const totalCaptures = run.zones.reduce((acc, z) => acc + z.captures.length, 0);
  const captureRate = visited > 0 ? Math.round((captured / visited) * 100) : 0;
  const progress = total > 0 ? (visited / total) * 100 : 0;

  return (
    <div className="bg-slate-900/80 border-b border-slate-700/50 px-4 py-2">
      <div className="flex gap-5 text-sm mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">Zones</span>
          <span className="font-semibold text-blue-400">{visited}/{total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">Capturées</span>
          <span className="font-semibold text-emerald-400">{captured}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">Total</span>
          <span className="font-semibold text-cyan-400">{totalCaptures}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">Taux</span>
          <span className="font-semibold text-indigo-400">{captureRate}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">Équipe</span>
          <span className="font-semibold text-orange-400">{run.team.length}/6</span>
        </div>
      </div>
      {/* Global progress bar */}
      <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
          }}
        />
      </div>
    </div>
  );
}
