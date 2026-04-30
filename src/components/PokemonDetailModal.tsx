"use client";

import { useEffect, useState } from "react";
import { Capture, PokemonApiData } from "@/lib/types";
import { fetchPokemon, getSpriteUrl } from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";

interface Props {
  capture: Capture;
  onClose: () => void;
}

export default function PokemonDetailModal({ capture, onClose }: Props) {
  const [data, setData] = useState<PokemonApiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemon(capture.pokemonId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [capture.pokemonId]);

  const maxStat = 255;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-600 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : data ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
                alt={data.name}
                className="w-24 h-24 object-contain"
              />
              <div>
                <h2 className="text-2xl font-bold capitalize">
                  {capture.nickname || capture.pokemonName}
                  {capture.isShiny && (
                    <span className="ml-2 text-yellow-400">✨</span>
                  )}
                </h2>
                <p className="text-gray-400 capitalize text-sm">
                  {data.name} #{data.id.toString().padStart(3, "0")}
                </p>
                <div className="flex gap-1 mt-1">
                  {data.types.map(({ type }) => (
                    <span
                      key={type.name}
                      className="px-2 py-0.5 rounded text-xs font-bold text-white capitalize"
                      style={{
                        backgroundColor: typeColors[type.name] ?? "#888",
                      }}
                    >
                      {type.name}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  Lv.{capture.level}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                Base Stats
              </h3>
              {data.stats.map((s) => (
                <div key={s.stat.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20 capitalize">
                    {s.stat.name.replace("-", " ")}
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(s.base_stat / maxStat) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">
                    {s.base_stat}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-700 rounded p-2">
                <span className="text-gray-400">Height: </span>
                <span>{(data.height / 10).toFixed(1)}m</span>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <span className="text-gray-400">Weight: </span>
                <span>{(data.weight / 10).toFixed(1)}kg</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-red-400">
            Failed to load data
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
