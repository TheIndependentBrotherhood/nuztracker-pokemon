'use client';

import { Run } from '@/lib/types';
import PokemonCard from './PokemonCard';

interface Props {
  run: Run;
  id?: string;
}

export default function TeamView({ run, id }: Props) {
  const teamSlots = Array.from({ length: 6 }, (_, i) => run.team[i] ?? null);

  return (
    <div id={id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Équipe</h3>
        <span className="text-xs text-slate-500">{run.team.length}/6</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {teamSlots.map((capture, i) => (
          <PokemonCard key={i} capture={capture} slotIndex={i} runId={run.id} />
        ))}
      </div>
    </div>
  );
}
