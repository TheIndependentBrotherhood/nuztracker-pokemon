import { PokemonData } from "./types";
import { Lang } from "@/i18n/translations";
import { publicPath } from "@/lib/base-path";

export interface CaptureSpriteOption {
  url: string;
  source: "alternatives" | "default";
  label: string;
}

export async function getPokemonList(): Promise<PokemonData[]> {
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
        } else {
          return [];
        }
      } else {
        return [];
      }
    }
    return pokemonListJsonCache;
  } catch {
    // Cache not available
    return [];
  }
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

  const cachedEntry = pokemonListJsonCache?.find((p) => p.id === pokemonId);

  const spriteSlot = isShiny
    ? cachedEntry?.sprites?.shiny
    : cachedEntry?.sprites?.normal;

  // Add default sprite first
  if (spriteSlot?.default) {
    pushUnique({
      url: spriteSlot.default,
      source: "default",
      label: "Default",
    });
  }

  // Add alternative sprites
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

// Cache for evolution chains
let evolutionChainsCache: Array<{
  base: { id: number; technicalName: string };
  stage2?: { id: number; technicalName: string };
  stage3?: { id: number; technicalName: string };
}> | null = null;

/**
 * Get the evolution chain for a given Pokémon (works for base, stage2, or stage3)
 * Returns all members of the chain as PokemonData objects
 */
export async function getEvolutionChain(pId: number): Promise<PokemonData[]> {
  try {
    // Load evolution chains cache if not already loaded
    if (!evolutionChainsCache) {
      const res = await fetch(publicPath("/data/evolution-chains.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          chains?: Array<{
            base: { id: number; technicalName: string };
            stage2?: { id: number; technicalName: string };
            stage3?: { id: number; technicalName: string };
          }>;
        };
        if (data.chains) {
          evolutionChainsCache = data.chains;
        }
      }
    }

    if (!evolutionChainsCache) return [];

    // Find the chain containing this pokémon
    const chain = evolutionChainsCache.find(
      (c) => c.base.id === pId || c.stage2?.id === pId || c.stage3?.id === pId,
    );

    if (!chain) return [];

    // Build the evolution chain as PokemonData objects
    const result: PokemonData[] = [];

    const baseData = await getPokemonById(chain.base.id);
    if (baseData) result.push(baseData);

    if (chain.stage2) {
      const stage2Data = await getPokemonById(chain.stage2.id);
      if (stage2Data) result.push(stage2Data);
    }

    if (chain.stage3) {
      const stage3Data = await getPokemonById(chain.stage3.id);
      if (stage3Data) result.push(stage3Data);
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Get available evolutions for a capture based on game mode
 * @param pokemon The pokémon to evolve
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
  const otherEvolutions = (await getPokemonList()).filter(
    (e) => e.id !== pokemon.id,
  );

  if (!run) return otherEvolutions;

  // Normal mode: only allow evolutions in the same family (chain)
  if (!run.isRandomMode) {
    return chain.filter((e) => e.id !== pokemon.id);
  } else {
    // Random mode: allow any evolution (full pokedex) except the current form
    return otherEvolutions;
  }
}
