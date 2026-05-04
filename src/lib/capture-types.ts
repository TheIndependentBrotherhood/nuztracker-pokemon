import { Capture, Run } from "@/lib/types";

export function isRandomTypesMode(run: Run | null | undefined): boolean {
  return Boolean(run?.isRandomMode && run.randomizerOptions?.randomizeTypes);
}

export function getCaptureTypesForRun(
  capture: Pick<Capture, "pokemonId" | "customTypes">,
  run: Run | null | undefined,
  fallbackTypes: string[] = [],
): string[] {
  if (capture.customTypes && capture.customTypes.length > 0) {
    return capture.customTypes.filter(Boolean);
  }

  if (!isRandomTypesMode(run)) {
    return fallbackTypes;
  }

  const knownTypes =
    capture.customTypes ??
    run?.customTypesByPokemonId?.[capture.pokemonId] ??
    [];

  return knownTypes.filter(Boolean);
}
