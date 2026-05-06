import { useEffect, useState } from "react";
import { Lang } from "@/i18n/translations";
import { getLocalizedPokemonName, PokemonNames } from "@/lib/pokemon-data";
import { Capture, PokemonData } from "@/lib/types";
import { publicPath } from "@/lib/base-path";

let pokemonNamesCache: Map<number, PokemonNames> | null = null;
let pokemonNamesPromise: Promise<Map<number, PokemonNames>> | null = null;

async function loadPokemonNamesCache(): Promise<Map<number, PokemonNames>> {
  if (pokemonNamesCache) return pokemonNamesCache;

  if (!pokemonNamesPromise) {
    pokemonNamesPromise = fetch(publicPath("/data/pokemon-list.json"))
      .then((response) => response.json())
      .then(
        (data: { pokemon?: Array<PokemonData> }) => {
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
  const base = getLocalizedPokemonName(capture.pokemon, lang);
  return base;
}

export function getCaptureDisplayLabel(capture: Capture, lang: Lang): string {
  return capture.nickname || getCaptureDisplayName(capture, lang);
}

export function useCaptureDisplayName(capture: Capture, lang: Lang): string {
  const cacheKey = `${capture.pokemon.id}-${lang}`;
  const [resolvedName, setResolvedName] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const storedName = getCaptureDisplayName(capture, lang);

  useEffect(() => {
    if (capture.pokemon.names?.[lang]) {
      return;
    }

    let cancelled = false;

    loadPokemonNamesCache().then((cache) => {
      if (cancelled) return;

      const names = cache.get(capture.pokemon.id);
      const nextResolvedName =
        names?.[lang] ?? names?.en ?? names?.fr ?? capture.pokemon.technicalName;

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
    capture.pokemon.id,
    capture.pokemon.technicalName,
    capture.pokemon.names,
    lang,
  ]);

  return resolvedName?.key === cacheKey ? resolvedName.value : storedName;
}

export function useCaptureDisplayLabel(capture: Capture, lang: Lang): string {
  const displayName = useCaptureDisplayName(capture, lang);
  return capture.nickname || displayName;
}
