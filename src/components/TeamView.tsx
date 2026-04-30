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
    <div id={id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-bold mb-3 text-yellow-400">Team</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {teamSlots.map((capture, i) => (
          <PokemonCard key={i} capture={capture} slotIndex={i} runId={run.id} />
        ))}
      </div>
    </div>
  );
}
