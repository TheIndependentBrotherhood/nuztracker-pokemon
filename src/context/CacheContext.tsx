'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

// ─── Data shape types ─────────────────────────────────────────────────────────

export interface CachedPokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  isLegendary: boolean;
  generation: number;
}

export interface CachedLocation {
  id: number;
  name: string;
  pokemonEncounters: number[];
}

export interface CachedRegion {
  id: number;
  name: string;
  generationId: string | null;
  locations: CachedLocation[];
}

export interface TypeEffectivenessEntry {
  weakTo: string[];
  resistsAgainst: string[];
  immuneTo: string[];
  strongAgainst: string[];
}

export interface TypeChartData {
  types: string[];
  effectiveness: Record<string, TypeEffectivenessEntry>;
}

export interface AbilityEntry {
  id: number;
  name: string;
  generation: string;
  effect: string;
  immuneTypes: string[];
  isImmunity: boolean;
  special?: boolean;
  weakness?: string;
}

export interface TypeSpriteEntry {
  id: number;
  name: string;
  sprites: Record<string, Record<string, Record<string, string>>>;
}

export interface PokemonListCache {
  pokemon: CachedPokemon[];
  generatedAt: string;
  totalCount: number;
}

export interface RegionsCache {
  regions: CachedRegion[];
  generatedAt: string;
}

export interface TypeChartsCache {
  gen1: TypeChartData;
  'gen2-5': TypeChartData;
  'gen6+': TypeChartData;
  generatedAt: string;
}

export interface TypeSpritesCache {
  types: TypeSpriteEntry[];
  generatedAt: string;
}

export interface AbilitiesCache {
  abilities: AbilityEntry[];
  generatedAt: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CacheContextType {
  pokemon: PokemonListCache;
  regions: RegionsCache;
  typeCharts: TypeChartsCache;
  typeSprites: TypeSpritesCache;
  abilities: AbilitiesCache;
  isLoaded: boolean;
}

const EMPTY_TYPE_CHART: TypeChartData = { types: [], effectiveness: {} };

const defaultCache: CacheContextType = {
  pokemon: { pokemon: [], generatedAt: '', totalCount: 0 },
  regions: { regions: [], generatedAt: '' },
  typeCharts: {
    gen1: EMPTY_TYPE_CHART,
    'gen2-5': EMPTY_TYPE_CHART,
    'gen6+': EMPTY_TYPE_CHART,
    generatedAt: '',
  },
  typeSprites: { types: [], generatedAt: '' },
  abilities: { abilities: [], generatedAt: '' },
  isLoaded: false,
};

const CacheContext = createContext<CacheContextType>(defaultCache);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<CacheContextType>(defaultCache);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const [pokemon, regions, typeCharts, typeSprites, abilities] =
        await Promise.all([
          fetch('/data/pokemon-list.json').then((r) => { if (!r.ok) throw new Error(`Failed to fetch pokemon-list.json: ${r.status}`); return r.json() as Promise<PokemonListCache>; }),
          fetch('/data/regions.json').then((r) => { if (!r.ok) throw new Error(`Failed to fetch regions.json: ${r.status}`); return r.json() as Promise<RegionsCache>; }),
          fetch('/data/type-charts.json').then((r) => { if (!r.ok) throw new Error(`Failed to fetch type-charts.json: ${r.status}`); return r.json() as Promise<TypeChartsCache>; }),
          fetch('/data/type-sprites.json').then((r) => { if (!r.ok) throw new Error(`Failed to fetch type-sprites.json: ${r.status}`); return r.json() as Promise<TypeSpritesCache>; }),
          fetch('/data/abilities-immunity.json').then((r) => { if (!r.ok) throw new Error(`Failed to fetch abilities-immunity.json: ${r.status}`); return r.json() as Promise<AbilitiesCache>; }),
        ]);

      if (!cancelled) {
        setCache({ pokemon, regions, typeCharts, typeSprites, abilities, isLoaded: true });
      }
    }

    loadAll().catch((err) => {
      console.error('Failed to load cache files:', err);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CacheContext.Provider value={cache}>
      {children}
    </CacheContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCache = (): CacheContextType => useContext(CacheContext);
