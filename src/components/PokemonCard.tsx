"use client";

import { useState } from "react";
import { Capture } from "@/lib/types";
import { getSpriteUrl } from "@/lib/pokemon-api";
import { useRunStore } from "@/store/runStore";
import PokemonDetailModal from "./PokemonDetailModal";

interface Props {
  capture: Capture | null;
  slotIndex: number;
  runId: string;
}

export default function PokemonCard({ capture, slotIndex, runId }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { runs, updateTeam } = useRunStore();

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    const run = runs.find((r) => r.id === runId);
    if (!run || !capture) return;
    updateTeam(
      runId,
      run.team.filter((c) => c.id !== capture.id),
    );
  }

  if (!capture) {
    return (
      <div className="bg-slate-800/30 border border-dashed border-slate-700/50 rounded-xl p-4 flex items-center justify-center min-h-[100px]">
        <span className="text-slate-600 text-xs">Slot {slotIndex + 1}</span>
      </div>
    );
  }

  const genderSymbol =
    capture.gender === "male" ? "♂" : capture.gender === "female" ? "♀" : "";
  const genderColor =
    capture.gender === "male"
      ? "text-blue-400"
      : capture.gender === "female"
        ? "text-pink-400"
        : "text-slate-500";

  return (
    <>
      <div
        className="bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/40 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10 relative group"
        onClick={() => setShowDetail(true)}
      >
        {capture.isShiny && (
          <span className="absolute top-1.5 right-1.5 text-xs">✨</span>
        )}
        <button
          onClick={handleRemove}
          className="absolute top-1.5 left-1.5 text-xs text-red-400 hover:text-red-300 bg-slate-900/80 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Retirer de l'équipe"
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
          alt={capture.pokemonName}
          className="w-14 h-14 object-contain mx-auto drop-shadow"
        />
        <div className="text-center mt-1">
          <div className="text-sm font-semibold text-white truncate leading-tight">
            {capture.nickname || capture.pokemonName}
            {genderSymbol && (
              <span className={`ml-1 text-xs font-normal ${genderColor}`}>
                {genderSymbol}
              </span>
            )}
          </div>
          {capture.nickname && (
            <div className="text-xs text-slate-500 capitalize truncate">
              {capture.pokemonName}
            </div>
          )}
          <div className="text-xs text-slate-400 mt-0.5">Lv.{capture.level}</div>
        </div>
      </div>

      {showDetail && (
        <PokemonDetailModal
          capture={capture}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
