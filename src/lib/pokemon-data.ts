import { PokemonData } from "./types";
import { Lang } from "@/i18n/translations";
import { publicPath } from "@/lib/base-path";

export interface CaptureSpriteOption {
  url: string;
  source: "alternatives" | "default";
  label: string;
}

export async function getPokemonById(id: number): Promise<PokemonData | null> {
  // Attempt to use the pre-generated static cache
  try {
    if (!pokemonListJsonCache) {
      const res = await fetch(publicPath("/data/pokemon-list.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: PokemonData[];
        };
        if (data.pokemon && data.pokemon.length > 0) {
          pokemonListJsonCache = data.pokemon;
        }
      }
    }
    if (pokemonListJsonCache) {
      return pokemonListJsonCache.find((p) => p.id === id) ?? null;
    }
  } catch {
    // Cache not available
    return null;
  }
  return null;
}

export async function getDefaultSprite(
  pId: number,
  isShiny: boolean = false,
): Promise<string | null> {
  // Attempt to use the pre-generated static cache
  try {
    if (!pokemonListJsonCache) {
      const res = await fetch(publicPath("/data/pokemon-list.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: PokemonData[];
        };
        if (data.pokemon && data.pokemon.length > 0) {
          pokemonListJsonCache = data.pokemon;
        }
      }
    }
    if (pokemonListJsonCache) {
      const pokemon = pokemonListJsonCache.find((p) => p.id === pId);
      if (!pokemon) return null;

      return isShiny
        ? (pokemon.sprites?.shiny.default ?? null)
        : (pokemon.sprites?.normal.default ?? null);
    }
  } catch {
    // Cache not available
    return null;
  }
  return null;
}

export function getCaptureSpriteOptionMeta(option: CaptureSpriteOption): {
  label: string;
  sourceLabel: string;
} {
  const sourceLabel =
    option.source === "alternatives" ? "Alternatives" : "Default";

  return { label: option.label, sourceLabel };
}

// Module-level cache for the static JSON file so it is only downloaded once
let pokemonListJsonCache: Array<PokemonData> | null = null;

export interface PokemonNames {
  fr?: string;
  en?: string;
}

function getTechnicalNames(entry: {
  technicalName: string;
  alternativeTechnicalNames?: string[];
}): string[] {
  return [entry.technicalName, ...(entry.alternativeTechnicalNames ?? [])];
}

/**
 * Search Pokémon by name.
 * Supports bilingual search (French and English) when the cache contains `names.fr` / `names.en`.
 * Prefers the static cache file (`/data/pokemon-list.json`) to avoid live API calls.
 * Falls back to a direct PokeAPI request when the cache is empty or unavailable.
 *
 * @param query  - The search string typed by the user.
 *                 Searches both languages regardless of this setting.
 */
export async function searchPokemonByName(
  query: string,
): Promise<PokemonData[]> {
  if (!query || query.length < 2) return [];

  const lower = query.toLowerCase();

  // Attempt to use the pre-generated static cache
  try {
    if (!pokemonListJsonCache) {
      const res = await fetch(publicPath("/data/pokemon-list.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: PokemonData[];
        };
        if (data.pokemon && data.pokemon.length > 0) {
          pokemonListJsonCache = data.pokemon;
        }
      }
    }
    if (pokemonListJsonCache) {
      return pokemonListJsonCache
        .filter((p) => {
          const nameFr = p.names?.fr?.toLowerCase() ?? "";
          const nameEn =
            p.names?.en?.toLowerCase() ?? p.technicalName.toLowerCase();
          const technicalNames = getTechnicalNames(p);
          return (
            nameFr.includes(lower) ||
            nameEn.includes(lower) ||
            technicalNames.some((name) => name.includes(lower))
          );
        })
        .slice(0, 10);
    }
  } catch {
    // Cache not available
    return [];
  }
  return [];
}

export function getLocalizedPokemonName(
  pokemon: PokemonData,
  lang: Lang,
): string {
  return pokemon.names?.[lang] ?? pokemon.names?.en ?? pokemon.technicalName;
}

export function getPokemonIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return parseInt(parts[parts.length - 1]);
}

export async function getAvailableCaptureSpriteOptions(params: {
  pokemonId: number;
  isShiny: boolean;
}): Promise<CaptureSpriteOption[]> {
  const { pokemonId, isShiny } = params;
  const options: CaptureSpriteOption[] = [];

  const pushUnique = (option: CaptureSpriteOption) => {
    if (!options.some((existing) => existing.url === option.url)) {
      options.push(option);
    }
  };

  // Load alternatives from pokemon-list.json (merged source)
  if (!pokemonListJsonCache) {
    try {
      const res = await fetch(publicPath("/data/pokemon-list.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: Array<PokemonData>;
        };
        if (data.pokemon && data.pokemon.length > 0) {
          pokemonListJsonCache = data.pokemon;
        }
      }
    } catch {
      // ignore
    }
  }

  const cachedEntry = pokemonListJsonCache?.find(
    (p) => p.id === pokemonId,
  );

  const spriteSlot = isShiny
    ? cachedEntry?.sprites?.shiny
    : cachedEntry?.sprites?.normal;

  for (const altUrl of spriteSlot?.alternatives ?? []) {
    pushUnique({
      url: altUrl,
      source: "alternatives",
      label: altUrl,
    });
  }

  return options;
}

// ── Evolution chain functions ──────────────────────────────────────────────

/**
 * Get the evolution chain for a given Pokémon
 */
export async function getEvolutionChain(
  pId: number,
): Promise<PokemonData[]> {
  try {
    const evolutions: PokemonData[] = [];
    return evolutions;
  } catch {
    return [];
  }
}

/**
 * Get available evolutions for a capture based on game mode
 * @param capture The capture to evolve
 * @param run The run configuration (for mode detection)
 * @returns Array of possible evolutions
 */
export async function getAvailableEvolutions(
  pokemon: PokemonData,
  run?: {
    isRandomMode: boolean;
  },
): Promise<PokemonData[]> {
  const chain = await getEvolutionChain(pokemon.id);

  if (!chain || chain.length === 0) return [];

  // Remove current pokémon from the list
  const otherEvolutions = chain.filter((e) => e.id !== pokemon.id);

  if (!run) return otherEvolutions;

  // Normal mode: only allow evolutions in the same family (chain)
  if (!run.isRandomMode) {
    return otherEvolutions;
  } else {
    // Random mode: allow any evolution (full pokedex) except the current form
  }

  return [];
}
