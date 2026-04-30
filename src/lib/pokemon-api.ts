import { PokemonApiData } from './types';

const BASE_URL = 'https://pokeapi.co/api/v2';

// In-memory fallback for environments where the cache file hasn't been generated yet
let pokemonListFallbackCache: Array<{ name: string; url: string }> | null = null;

export async function fetchPokemon(nameOrId: string | number): Promise<PokemonApiData> {
  const res = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error(`Pokemon not found: ${nameOrId}`);
  return res.json();
}

/**
 * Search Pokémon by name.
 * Prefers the static cache file (`/data/pokemon-list.json`) to avoid live API calls.
 * Falls back to a direct PokeAPI request when the cache is empty or unavailable.
 */
export async function searchPokemon(query: string): Promise<Array<{ name: string; url: string }>> {
  if (!query || query.length < 2) return [];

  const lower = query.toLowerCase();

  // Attempt to use the pre-generated static cache
  try {
    const res = await fetch('/data/pokemon-list.json');
    if (res.ok) {
      const data = (await res.json()) as { pokemon?: { name: string; id: number }[] };
      if (data.pokemon && data.pokemon.length > 0) {
        return data.pokemon
          .filter((p) => p.name.includes(lower))
          .slice(0, 10)
          .map((p) => ({
            name: p.name,
            url: `${BASE_URL}/pokemon/${p.id}`,
          }));
      }
    }
  } catch {
    // Cache not available – fall through to the live API
  }

  // Fallback: hit PokeAPI directly (maintains previous behaviour)
  try {
    if (!pokemonListFallbackCache) {
      const res = await fetch(`${BASE_URL}/pokemon?limit=1302`);
      const data = await res.json();
      pokemonListFallbackCache = data.results as Array<{ name: string; url: string }>;
    }
    return pokemonListFallbackCache.filter((p) => p.name.includes(lower)).slice(0, 10);
  } catch {
    return [];
  }
}

export function getPokemonIdFromUrl(url: string): number {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1]);
}

export function getSpriteUrl(id: number, shiny = false): string {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return shiny ? `${base}/shiny/${id}.png` : `${base}/${id}.png`;
}
