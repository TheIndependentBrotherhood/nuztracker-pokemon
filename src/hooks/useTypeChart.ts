import { useCache } from '@/context/CacheContext';

export type TypeGeneration = '1' | '2' | '6';

function genKey(generation: TypeGeneration): 'gen1' | 'gen2-5' | 'gen6+' {
  if (generation === '1') return 'gen1';
  if (generation === '2') return 'gen2-5';
  return 'gen6+';
}

export function useTypeChart(generation: TypeGeneration) {
  const { typeCharts } = useCache();
  const chart = typeCharts[genKey(generation)];

  return {
    types: chart.types,

    getEffectiveness: (typeName: string) =>
      chart.effectiveness[typeName],

    getWeaknessesOf: (types: string[]) =>
      [...new Set(types.flatMap((t) => chart.effectiveness[t]?.weakTo ?? []))],

    getResistancesOf: (types: string[]) =>
      [...new Set(types.flatMap((t) => chart.effectiveness[t]?.resistsAgainst ?? []))],

    getImmunitiesOf: (types: string[]) =>
      [...new Set(types.flatMap((t) => chart.effectiveness[t]?.immuneTo ?? []))],

    /** Attack types that deal 4× damage (both defending types are weak to it). */
    getDoubleWeaknessesOf: (types: string[]) =>
      chart.types.filter((attackType) => {
        const weakCount = types.filter(
          (defType) => chart.effectiveness[defType]?.weakTo.includes(attackType),
        ).length;
        return weakCount > 1;
      }),

    /** Attack types resisted or nullified by both defending types. */
    getDoubleResistancesOf: (types: string[]) =>
      chart.types.filter((attackType) => {
        const resistCount = types.filter(
          (defType) =>
            chart.effectiveness[defType]?.resistsAgainst.includes(attackType) ||
            chart.effectiveness[defType]?.immuneTo.includes(attackType),
        ).length;
        return resistCount > 1;
      }),

    /** Combined damage multiplier for a dual-type Pokémon against one attacking type. */
    getDamageMultiplier: (pokemonTypes: string[], attackType: string) => {
      let multiplier = 1;
      for (const type of pokemonTypes) {
        if (chart.effectiveness[type]?.immuneTo.includes(attackType)) return 0;
        if (chart.effectiveness[type]?.weakTo.includes(attackType)) multiplier *= 2;
        if (chart.effectiveness[type]?.resistsAgainst.includes(attackType)) multiplier *= 0.5;
      }
      return multiplier;
    },
  };
}
