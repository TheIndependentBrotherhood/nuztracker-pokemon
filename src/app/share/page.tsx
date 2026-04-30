'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Capture, PokemonApiData } from '@/lib/types';
import { decodeTeam } from '@/lib/share';
import { fetchPokemon, getSpriteUrl } from '@/lib/pokemon-api';
import { typeColors } from '@/lib/type-chart';

function ShareContent() {
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<Capture[]>([]);
  const [pokemonData, setPokemonData] = useState<Record<number, PokemonApiData>>({});
  const [loading, setLoading] = useState(true);

  const showTypes = searchParams.get('showTypes') === 'true';
  const showLevels = searchParams.get('showLevels') === 'true';

  useEffect(() => {
    const encoded = searchParams.get('team');
    if (!encoded) { setLoading(false); return; }
    decodeTeam(encoded).then(async (captures) => {
      setTeam(captures);
      const dataMap: Record<number, PokemonApiData> = {};
      await Promise.all(
        captures.map(async (c) => {
          try {
            dataMap[c.pokemonId] = await fetchPokemon(c.pokemonId);
          } catch {}
        })
      );
      setPokemonData(dataMap);
      setLoading(false);
    });
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Loading team...
      </div>
    );
  }

  if (team.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        No team data found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div
        className="bg-gray-800 rounded-2xl p-8 border border-gray-600 w-full"
        style={{ maxWidth: '1280px', aspectRatio: '16/9' }}
      >
        <h2 className="text-3xl font-black text-yellow-400 text-center mb-8">NuzTracker Team</h2>
        <div className="grid grid-cols-6 gap-4 h-full">
          {team.map((capture) => {
            const data = pokemonData[capture.pokemonId];
            const types = data?.types.map((t) => t.type.name) ?? [];

            return (
              <div key={capture.id} className="bg-gray-700 rounded-xl p-4 flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
                  alt={capture.pokemonName}
                  className="w-20 h-20 object-contain"
                />
                <div className="text-center">
                  <div className="font-bold text-white text-sm">
                    {capture.nickname || capture.pokemonName}
                    {capture.isShiny && ' ✨'}
                  </div>
                  <div className="text-gray-400 text-xs capitalize">{capture.pokemonName}</div>
                  {showLevels && (
                    <div className="text-gray-300 text-xs">Lv.{capture.level}</div>
                  )}
                </div>
                {showTypes && types.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-center">
                    {types.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-xs text-white capitalize font-medium"
                        style={{ backgroundColor: typeColors[t] ?? '#888' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>}>
      <ShareContent />
    </Suspense>
  );
}
