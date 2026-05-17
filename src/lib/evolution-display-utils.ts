import { Capture, EvolutionHistoryEntry } from "./types";

/**
 * Get a human-readable description of the evolution chain for a Pokémon species.
 * E.g., "charmander → charmeleon → charizard"
 */
export function getEvolutionChainDescription(
  history: EvolutionHistoryEntry[],
): string {
  if (!history || history.length === 0) {
    return "";
  }

  return history.map((entry) => entry.technicalName).join(" → ");
}

/**
 * Check if a Pokémon species has evolved (has more than one entry in history).
 */
export function hasEvolved(history: EvolutionHistoryEntry[]): boolean {
  return Boolean(history && history.length > 1);
}

/**
 * Get the count of evolution steps for a Pokémon species.
 * Returns 0 if never evolved, 1 if one evolution, etc.
 */
export function getEvolutionStepCount(
  history: EvolutionHistoryEntry[],
): number {
  if (!history || history.length === 0) {
    return 0;
  }
  // History includes the original, so steps = history.length - 1
  return Math.max(0, history.length - 1);
}

/**
 * Get the original (first captured) Pokémon ID from the history.
 */
export function getOriginalPokemonId(
  history: EvolutionHistoryEntry[],
): number | null {
  return history && history.length > 0 ? history[0].pokemonId : null;
}

/**
 * Get the current (latest) Pokémon ID from the history.
 */
export function getCurrentPokemonId(
  history: EvolutionHistoryEntry[],
): number | null {
  return history && history.length > 0
    ? history[history.length - 1].pokemonId
    : null;
}
