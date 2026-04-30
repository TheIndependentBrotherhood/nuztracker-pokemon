"use client";

import { useEffect, useState } from "react";
import { Capture, PokemonApiData } from "@/lib/types";
import { fetchPokemon, getSpriteUrl } from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";

interface Props {
  capture: Capture;
  onClose: () => void;
}

const statLabels: Record<string, string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  speed: 'Vit',
};

function StatBar({ name, value, max = 255 }: { name: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    pct >= 70 ? '#10b981' : pct >= 40 ? '#3b82f6' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-8 text-right shrink-0">
        {statLabels[name] ?? name}
      </span>
      <div className="flex-1 bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-slate-400 w-7 text-right shrink-0">{value}</span>
    </div>
  );
}

export default function PokemonDetailModal({ capture, onClose }: Props) {
  const [data, setData] = useState<PokemonApiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemon(capture.pokemonId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [capture.pokemonId]);

  const genderSymbol =
    capture.gender === "male" ? "♂" : capture.gender === "female" ? "♀" : null;
  const genderColor =
    capture.gender === "male" ? "text-blue-400" : "text-pink-400";

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700/60 shadow-xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-center py-12 text-slate-500">Chargement...</div>
        ) : data ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
                alt={data.name}
                className="w-24 h-24 object-contain drop-shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-xl font-bold capitalize leading-tight flex items-center gap-2 flex-wrap">
                  {capture.nickname || capture.pokemonName}
                  {capture.isShiny && <span className="text-base">✨</span>}
                  {genderSymbol && (
                    <span className={`text-sm font-normal ${genderColor}`}>
                      {genderSymbol}
                    </span>
                  )}
                </h2>
                <p className="text-slate-400 text-xs capitalize mt-0.5">
                  {data.name} #{data.id.toString().padStart(3, "0")}
                </p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {data.types.map(({ type }) => (
                    <span
                      key={type.name}
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                      style={{ backgroundColor: typeColors[type.name] ?? "#888" }}
                    >
                      {type.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  Lv. {capture.level}
                </div>
              </div>
            </div>

            {/* Base Stats */}
            <div className="space-y-2 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Statistiques de base
              </h3>
              {data.stats.map((s) => (
                <StatBar key={s.stat.name} name={s.stat.name} value={s.base_stat} />
              ))}
            </div>

            {/* Physical info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-0.5">Taille</div>
                <div className="font-semibold">{(data.height / 10).toFixed(1)} m</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-0.5">Poids</div>
                <div className="font-semibold">{(data.weight / 10).toFixed(1)} kg</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-red-400">
            Impossible de charger les données
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full bg-slate-700 hover:bg-slate-600 py-2.5 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
