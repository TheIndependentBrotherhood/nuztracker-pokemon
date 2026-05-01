import { useEffect, useState } from "react";
import { Lang } from "@/i18n/translations";
import { getLocalizedPokemonName, PokemonNames } from "@/lib/pokemon-api";
import { Capture } from "@/lib/types";

let pokemonNamesCache: Map<number, PokemonNames> | null = null;
let pokemonNamesPromise: Promise<Map<number, PokemonNames>> | null = null;

async function loadPokemonNamesCache(): Promise<Map<number, PokemonNames>> {
  if (pokemonNamesCache) return pokemonNamesCache;

  if (!pokemonNamesPromise) {
    pokemonNamesPromise = fetch("/data/pokemon-list.json")
      .then((response) => response.json())
      .then(
        (data: { pokemon?: Array<{ id: number; names?: PokemonNames }> }) => {
          const nextCache = new Map<number, PokemonNames>();

          for (const pokemon of data.pokemon ?? []) {
            if (pokemon.names) {
              nextCache.set(pokemon.id, pokemon.names);
            }
          }

          pokemonNamesCache = nextCache;
          return nextCache;
        },
      )
      .catch(() => new Map<number, PokemonNames>());
  }

  return pokemonNamesPromise;
}

export function getCaptureDisplayName(capture: Capture, lang: Lang): string {
  return getLocalizedPokemonName(capture, lang);
}

export function getCaptureDisplayLabel(capture: Capture, lang: Lang): string {
  return capture.nickname || getCaptureDisplayName(capture, lang);
}

export function useCaptureDisplayName(capture: Capture, lang: Lang): string {
  const cacheKey = `${capture.pokemonId}-${lang}`;
  const [resolvedName, setResolvedName] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const storedName = getCaptureDisplayName(capture, lang);

  useEffect(() => {
    if (capture.pokemonNames?.[lang]) {
      return;
    }

    let cancelled = false;

    loadPokemonNamesCache().then((cache) => {
      if (cancelled) return;

      const names = cache.get(capture.pokemonId);
      const nextResolvedName =
        names?.[lang] ?? names?.en ?? names?.fr ?? capture.pokemonName;

      setResolvedName({
        key: cacheKey,
        value: nextResolvedName,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    cacheKey,
    capture.pokemonId,
    capture.pokemonName,
    capture.pokemonNames,
    lang,
  ]);

  return resolvedName?.key === cacheKey ? resolvedName.value : storedName;
}

export function useCaptureDisplayLabel(capture: Capture, lang: Lang): string {
  const displayName = useCaptureDisplayName(capture, lang);
  return capture.nickname || displayName;
}
