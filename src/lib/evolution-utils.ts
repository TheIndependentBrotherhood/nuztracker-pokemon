import { Capture, EvolutionHistoryEntry, Run } from "./types";
import { PokemonData } from "./types";

/**
 * Get the evolution history for a specific Pokémon species from the run.
 * Returns an empty array if no history exists.
 */
export function getEvolutionHistoryForSpecies(
  run: Run,
  pokemonId: number,
): EvolutionHistoryEntry[] {
  return run.evolutionHistoryByPokemonId?.[pokemonId] ?? [];
}

/**
 * Build the initial evolution history for a Pokémon species when first captured.
 */
export function buildInitialEvolutionHistory(
  originalPokemon: PokemonData,
  createdAt: number,
): EvolutionHistoryEntry[] {
  return [
    {
      pokemonId: originalPokemon.id,
      technicalName: originalPokemon.technicalName,
      timestamp: createdAt,
    },
  ];
}

/**
 * Add an evolution step to the history for a Pokémon species.
 */
export function addEvolutionStep(
  currentHistory: EvolutionHistoryEntry[] | undefined,
  newPokemon: PokemonData,
  timestamp: number,
): EvolutionHistoryEntry[] {
  const history = currentHistory || [];

  return [
    ...history,
    {
      pokemonId: newPokemon.id,
      technicalName: newPokemon.technicalName,
      timestamp,
    },
  ];
}

/**
 * Update the run with new evolution history for a Pokémon species.
 */
export function updateRunWithEvolutionHistory(
  run: Run,
  originalPokemonId: number,
  newEvolutionHistory: EvolutionHistoryEntry[],
): Run {
  const nextHistoryByPokemonId = {
    ...(run.evolutionHistoryByPokemonId ?? {}),
  };

  if (newEvolutionHistory.length > 0) {
    nextHistoryByPokemonId[originalPokemonId] = newEvolutionHistory;
  } else {
    delete nextHistoryByPokemonId[originalPokemonId];
  }

  return {
    ...run,
    evolutionHistoryByPokemonId:
      Object.keys(nextHistoryByPokemonId).length > 0
        ? nextHistoryByPokemonId
        : undefined,
  };
}

/**
 * Create the evolved capture object.
 * Preserves the originalCapturedPokemonId so we can trace back the full lineage.
 * Does NOT update the evolution history - that's handled at the Run level.
 */
export function createEvolvedCapture(
  originalCapture: Capture,
  newPokemon: PokemonData,
  customTypesByPokemonId?: Record<number, string[]>,
): Capture {
  return {
    ...originalCapture,
    pokemon: newPokemon,
    selectedSprite: undefined,
    ability: undefined,
    // Keep track of the original captured species for genealogy tracking
    originalCapturedPokemonId:
      originalCapture.originalCapturedPokemonId || originalCapture.pokemon.id,
    // Inherit custom types from the species defaults if they exist
    customTypes:
      customTypesByPokemonId?.[newPokemon.id] ||
      customTypesByPokemonId?.[originalCapture.pokemon.id],
  };
}
