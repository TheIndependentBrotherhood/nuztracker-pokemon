import { Capture, Run } from "@/lib/types";

export function isRandomTypesMode(run: Run | null | undefined): boolean {
  return Boolean(run?.isRandomMode && run.randomizerOptions?.randomizeTypes);
}

export function getCaptureTypesForRun(
  pokemonCaptured: Capture,
  run: Run | null | undefined,
  fallbackTypes: string[] = [],
): string[] {
  if (pokemonCaptured.customTypes && pokemonCaptured.customTypes.length > 0) {
    return pokemonCaptured.customTypes.filter(Boolean);
  }

  if (!isRandomTypesMode(run)) {
    return fallbackTypes;
  }

  const knownTypes =
    pokemonCaptured.customTypes ??
    run?.customTypesByPokemonId?.[pokemonCaptured.pokemon.id] ??
    [];

  return knownTypes.filter(Boolean);
}
