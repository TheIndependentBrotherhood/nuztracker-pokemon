"use client";

import { useEffect, useState } from "react";
import { Run } from "@/lib/types";
import { TYPES, getTypeDefenses, typeColors } from "@/lib/type-chart";
import { fetchPokemon } from "@/lib/pokemon-api";

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
        }),
      );
      setTeamTypes(types);
    }
    if (run.team.length > 0) load();
  }, [run.team]);

  if (run.team.length === 0) {
    return (
      <div className="text-center py-12 text-black font-bold text-sm">
        Ajoute des Pokémon à ton équipe pour voir l&apos;analyse des types
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-2xl border-2 border-black">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-blue-200 to-purple-200 border-b-2 border-black">
            <th className="text-left p-3 text-black font-bold w-24">
              Attack Type
            </th>
            {run.team.map((c) => (
              <th
                key={c.id}
                className="p-2 text-center capitalize text-black font-bold w-16"
              >
                {(c.nickname || c.pokemonName).slice(0, 6)}
              </th>
            ))}
            <th className="p-2 text-center text-black font-bold">Def x2+</th>
            <th className="p-2 text-center text-black font-bold">Def x0.5-</th>
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
              <tr
                key={attackType}
                className="border-b border-gray-200 hover:bg-blue-50"
              >
                <td className="p-2">
                  <span
                    className="px-3 py-1.5 rounded-lg text-white font-bold capitalize text-xs border border-black"
                    style={{
                      backgroundColor: typeColors[attackType] ?? "#888",
                    }}
                  >
                    {attackType}
                  </span>
                </td>
                {memberEffects.map((eff, i) => {
                  const bg =
                    eff === 0
                      ? "#f0f0f0"
                      : eff >= 4
                        ? "#ef4444"
                        : eff === 2
                          ? "#f87171"
                          : eff === 0.5
                            ? "#86efac"
                            : eff === 0.25
                              ? "#4ade80"
                              : "#e5e7eb";
                  const label =
                    eff === 0
                      ? "0"
                      : eff === 0.25
                        ? "¼"
                        : eff === 0.5
                          ? "½"
                          : eff === 1
                            ? "1"
                            : eff === 2
                              ? "2"
                              : eff === 4
                                ? "4"
                                : `${eff}`;

                  return (
                    <td key={i} className="p-2 text-center">
                      <span
                        className="inline-block w-8 h-8 leading-8 rounded-lg text-center text-black font-bold border-2 border-black"
                        style={{ backgroundColor: bg, fontSize: "11px" }}
                      >
                        {label}
                      </span>
                    </td>
                  );
                })}
                <td className="p-2 text-center">
                  {weakCount > 0 && (
                    <span className="text-red-900 font-bold text-lg">
                      {weakCount}
                    </span>
                  )}
                </td>
                <td className="p-2 text-center">
                  {resistCount > 0 && (
                    <span className="text-green-900 font-bold text-lg">
                      {resistCount}
                    </span>
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
