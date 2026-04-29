'use client';

import { useEffect, useState } from 'react';
import { Run } from '@/lib/types';
import { TYPES, getTypeDefenses, typeColors } from '@/lib/type-chart';
import { fetchPokemon } from '@/lib/pokemon-api';

interface Props {
  run: Run;
}

export default function TypeAnalysis({ run }: Props) {
  const [teamTypes, setTeamTypes] = useState<string[][]>([]);

  useEffect(() => {
    async function load() {
      const types = await Promise.all(
        run.team.map(async (c) => {
          try {
            const data = await fetchPokemon(c.pokemonId);
            return data.types.map((t) => t.type.name);
          } catch {
            return [];
          }
        })
      );
      setTeamTypes(types);
    }
    if (run.team.length > 0) load();
  }, [run.team]);

  if (run.team.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Add Pokémon to your team to see type analysis
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 text-gray-400 w-24">Attack Type</th>
            {run.team.map((c) => (
              <th key={c.id} className="p-1 text-center capitalize text-gray-300 w-16">
                {(c.nickname || c.pokemonName).slice(0, 6)}
              </th>
            ))}
            <th className="p-1 text-center text-gray-400">Def x2+</th>
            <th className="p-1 text-center text-gray-400">Def x0.5-</th>
          </tr>
        </thead>
        <tbody>
          {TYPES.map((attackType) => {
            const memberEffects = teamTypes.map((types) => {
              if (types.length === 0) return 1;
              return getTypeDefenses(types)[attackType] ?? 1;
            });

            const weakCount = memberEffects.filter((e) => e > 1).length;
            const resistCount = memberEffects.filter((e) => e < 1).length;

            return (
              <tr key={attackType} className="border-t border-gray-700/50">
                <td className="p-1.5">
                  <span
                    className="px-2 py-0.5 rounded text-white capitalize font-medium"
                    style={{ backgroundColor: typeColors[attackType] ?? '#888' }}
                  >
                    {attackType}
                  </span>
                </td>
                {memberEffects.map((eff, i) => {
                  const bg =
                    eff === 0 ? '#1f2937' :
                    eff >= 4 ? '#7f1d1d' :
                    eff === 2 ? '#991b1b' :
                    eff === 0.5 ? '#14532d' :
                    eff === 0.25 ? '#065f46' :
                    '#374151';
                  const label =
                    eff === 0 ? '0' :
                    eff === 0.25 ? '¼' :
                    eff === 0.5 ? '½' :
                    eff === 1 ? '1' :
                    eff === 2 ? '2' :
                    eff === 4 ? '4' : `${eff}`;

                  return (
                    <td key={i} className="p-1 text-center">
                      <span
                        className="inline-block w-7 h-6 leading-6 rounded text-center text-white font-bold"
                        style={{ backgroundColor: bg, fontSize: '10px' }}
                      >
                        {label}
                      </span>
                    </td>
                  );
                })}
                <td className="p-1 text-center">
                  {weakCount > 0 && (
                    <span className="text-red-400 font-bold">{weakCount}</span>
                  )}
                </td>
                <td className="p-1 text-center">
                  {resistCount > 0 && (
                    <span className="text-green-400 font-bold">{resistCount}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
