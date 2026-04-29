import { PokemonApiData } from './types';

const BASE_URL = 'https://pokeapi.co/api/v2';

export async function fetchPokemon(nameOrId: string | number): Promise<PokemonApiData> {
  const res = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error(`Pokemon not found: ${nameOrId}`);
  return res.json();
}

export async function searchPokemon(query: string): Promise<Array<{ name: string; url: string }>> {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`${BASE_URL}/pokemon?limit=1302`);
    const data = await res.json();
    const lower = query.toLowerCase();
    return (data.results as Array<{ name: string; url: string }>)
      .filter((p) => p.name.includes(lower))
      .slice(0, 10);
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
