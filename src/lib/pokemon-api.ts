import { PokemonApiData } from "./types";
import { Lang } from "@/i18n/translations";

const BASE_URL = "https://pokeapi.co/api/v2";

// In-memory fallback for environments where the cache file hasn't been generated yet
let pokemonListFallbackCache: Array<{ name: string; url: string }> | null =
  null;

// Module-level cache for the static JSON file so it is only downloaded once
let pokemonListJsonCache: Array<{
  name: string;
  id: number;
  names?: { fr?: string; en?: string };
}> | null = null;

export interface PokemonNames {
  fr?: string;
  en?: string;
}

export interface PokemonSearchResult {
  name: string;
  displayName: string;
  url: string;
  names?: PokemonNames;
}

export async function fetchPokemon(
  nameOrId: string | number,
): Promise<PokemonApiData> {
  const res = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error(`Pokemon not found: ${nameOrId}`);
  return res.json();
}

/**
 * Search Pokémon by name.
 * Supports bilingual search (French and English) when the cache contains `names.fr` / `names.en`.
 * Prefers the static cache file (`/data/pokemon-list.json`) to avoid live API calls.
 * Falls back to a direct PokeAPI request when the cache is empty or unavailable.
 *
 * @param query  - The search string typed by the user.
 * @param lang   - Current language ("fr" | "en"). Determines which name is shown in results.
 *                 Searches both languages regardless of this setting.
 */
export async function searchPokemon(
  query: string,
  lang: "fr" | "en" = "fr",
): Promise<PokemonSearchResult[]> {
  if (!query || query.length < 2) return [];

  const lower = query.toLowerCase();

  // Attempt to use the pre-generated static cache
  try {
    if (!pokemonListJsonCache) {
      const res = await fetch("/data/pokemon-list.json");
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: {
            name: string;
            id: number;
            names?: { fr?: string; en?: string };
          }[];
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
          const nameEn = p.names?.en?.toLowerCase() ?? p.name.toLowerCase();
          return (
            nameFr.includes(lower) ||
            nameEn.includes(lower) ||
            p.name.includes(lower)
          );
        })
        .slice(0, 10)
        .map((p) => {
          const displayName =
            lang === "fr"
              ? (p.names?.fr ?? p.names?.en ?? p.name)
              : (p.names?.en ?? p.name);
          return {
            name: p.name,
            displayName,
            url: `${BASE_URL}/pokemon/${p.id}`,
            names: p.names,
          };
        });
    }
  } catch {
    // Cache not available – fall through to the live API
  }

  // Fallback: hit PokeAPI directly (maintains previous behaviour)
  try {
    if (!pokemonListFallbackCache) {
      const res = await fetch(`${BASE_URL}/pokemon?limit=1302`);
      if (!res.ok)
        throw new Error(`Failed to fetch Pokemon list: ${res.status}`);
      const data = await res.json();
      pokemonListFallbackCache = data.results as Array<{
        name: string;
        url: string;
      }>;
    }
    return pokemonListFallbackCache
      .filter((p) => p.name.includes(lower))
      .slice(0, 10)
      .map((p) => ({ ...p, displayName: p.name }));
  } catch {
    return [];
  }
}

export function getLocalizedPokemonName(
  pokemon: { pokemonName: string; pokemonNames?: PokemonNames },
  lang: Lang,
): string {
  return pokemon.pokemonNames?.[lang] ?? pokemon.pokemonName;
}

export function getPokemonIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return parseInt(parts[parts.length - 1]);
}

export function getStaticSpriteUrl(id: number, shiny = false): string {
  const staticBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  return shiny ? `${staticBase}/shiny/${id}.png` : `${staticBase}/${id}.png`;
}

export function getAnimatedSpriteUrl(id: number, shiny = false): string {
  const animatedBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
  return shiny
    ? `${animatedBase}/shiny/${id}.gif`
    : `${animatedBase}/${id}.gif`;
}

export function getSpriteUrl(
  id: number,
  shiny = false,
  preferAnimated = true,
): string {
  if (preferAnimated) {
    return getAnimatedSpriteUrl(id, shiny);
  }

  return getStaticSpriteUrl(id, shiny);
}

export function getSpriteFallbackUrl(id: number, shiny = false): string {
  return getStaticSpriteUrl(id, shiny);
}
