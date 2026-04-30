"use client";

import { Run } from "@/lib/types";
import PokemonCard from "./PokemonCard";

interface Props {
  run: Run;
  id?: string;
}

export default function TeamView({ run, id }: Props) {
  const teamSlots = Array.from({ length: 6 }, (_, i) => run.team[i] ?? null);

  return (
    <div
      id={id}
      className="bg-gradient-to-b from-blue-50 to-purple-50 border-2 border-black rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
        <h3 className="text-lg font-bold text-black">Équipe</h3>
        <span className="text-sm font-bold bg-blue-500 text-white px-3 py-1 rounded-lg border-2 border-black">
          {run.team.length}/6
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {teamSlots.map((capture, i) => (
          <PokemonCard key={i} capture={capture} slotIndex={i} runId={run.id} />
        ))}
      </div>
    </div>
  );
}
