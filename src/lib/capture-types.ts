import { Capture, Run } from "@/lib/types";
import { knowledgeForCapture } from "./tracker/knowledge";
import { pokemonForGame } from "./game-reference";

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
    return run?.gameVersion
      ? pokemonForGame(pokemonCaptured.pokemon, run.gameVersion).types
      : fallbackTypes;
  }

  const knownTypes =
    pokemonCaptured.customTypes ??
    (run
      ? knowledgeForCapture(run, pokemonCaptured).customTypesByPokemonId?.[
          pokemonCaptured.pokemon.id
        ]
      : undefined) ??
    [];

  return knownTypes.filter(Boolean);
}
