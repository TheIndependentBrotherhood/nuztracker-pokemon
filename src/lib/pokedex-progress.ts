import { Run } from "./types";
import { TypeChartData } from "./type-chart";
import { countPossibleTypeCombos, TOTAL_TYPE_COMBOS } from "./type-deduction";

export interface PokedexKnowledgeProgress {
  /** Number of Pokémon in the Pokédex */
  total: number;
  /** Pokémon whose types have been set by the player */
  known: number;
  /** Pokémon with at least one observation but no confirmed types */
  partial: number;
  /** Sum of per-Pokémon knowledge (0..1 each), i.e. "Pokémon equivalents" known */
  score: number;
  /** Overall knowledge, 0..100 */
  percent: number;
}

/**
 * Knowledge for a single Pokémon, from 0 (nothing known) to 1 (types confirmed).
 * With only observations, knowledge grows as the number of remaining
 * type combinations shrinks from 171 down to 1.
 */
export function getPokemonTypeKnowledge(
  run: Run,
  pokemonId: number,
  typeData: TypeChartData,
): number {
  const customTypes = run.customTypesByPokemonId?.[pokemonId] ?? [];
  if (customTypes.filter(Boolean).length > 0) return 1;

  const observations = run.pokedexObservationsByPokemonId?.[pokemonId] ?? [];
  if (observations.length === 0) return 0;

  const abilityPanel = run.customAbilitiesByPokemonId?.[pokemonId] ?? [];
  const remaining = countPossibleTypeCombos(
    observations,
    abilityPanel,
    typeData,
  );

  // Contradictory observations (0 combos left) give no knowledge
  if (remaining === 0) return 0;

  return (TOTAL_TYPE_COMBOS - remaining) / (TOTAL_TYPE_COMBOS - 1);
}

export function computePokedexKnowledge(
  run: Run,
  pokemonIds: number[],
  typeData: TypeChartData,
): PokedexKnowledgeProgress {
  let known = 0;
  let partial = 0;
  let score = 0;

  for (const id of pokemonIds) {
    const knowledge = getPokemonTypeKnowledge(run, id, typeData);
    score += knowledge;
    if (knowledge >= 1) known++;
    else if (knowledge > 0) partial++;
  }

  const total = pokemonIds.length;
  return {
    total,
    known,
    partial,
    score,
    percent: total > 0 ? (score / total) * 100 : 0,
  };
}
