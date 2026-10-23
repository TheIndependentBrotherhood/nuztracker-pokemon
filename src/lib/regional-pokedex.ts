import { publicPath } from "@/lib/base-path";
import { PokemonData, Run } from "@/lib/types";

export interface RegionalPokedex {
  region: string;
  pokedexes: string[];
  /** Generation of the region's games: every species up to it is obtainable (trade, transfer…) */
  maxGeneration: number;
  speciesIds: number[];
}

export type PokedexEntryOrigin = "regional" | "transfer" | "added";

interface RegionalPokedexFile {
  pokedexes: RegionalPokedex[];
  generatedAt?: string;
}

let cachedPokedexes: Map<string, RegionalPokedex> | null = null;
let pendingLoad: Promise<Map<string, RegionalPokedex>> | null = null;

export async function loadRegionalPokedexes(): Promise<
  Map<string, RegionalPokedex>
> {
  if (cachedPokedexes) return cachedPokedexes;
  if (pendingLoad) return pendingLoad;

  pendingLoad = (async () => {
    try {
      const response = await fetch(publicPath("/data/regional-pokedexes.json"));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as RegionalPokedexFile;
      cachedPokedexes = new Map(data.pokedexes.map((p) => [p.region, p]));
    } catch (error) {
      console.error("Failed to load regional pokédexes:", error);
      cachedPokedexes = new Map();
    }
    return cachedPokedexes;
  })();

  return pendingLoad;
}

/** Regions that introduced regional forms, with the generation of their games */
const REGIONS_WITH_FORMS: Record<string, number> = {
  alola: 7,
  galar: 8,
  hisui: 8,
  paldea: 9,
};

/** Forms whose technical name carries a region suffix (e.g. "rattata-alola"); Pikachu caps are excluded */
function isRegionalFormOf(entry: PokemonData, formRegion: string): boolean {
  if (entry.id <= 10000) return false;
  const name = entry.technicalName;
  if (name.endsWith("-cap")) return false;
  return name.endsWith(`-${formRegion}`) || name.includes(`-${formRegion}-`);
}

/** Regional forms obtainable in the run's games: forms from regions of generation ≤ the games' generation */
function isObtainableRegionalForm(
  entry: PokemonData,
  regional: RegionalPokedex,
): boolean {
  return Object.entries(REGIONS_WITH_FORMS).some(
    ([formRegion, generation]) =>
      generation <= regional.maxGeneration &&
      isRegionalFormOf(entry, formRegion),
  );
}

/** Base species introduced up to the games' generation (obtainable by trade / transfer) */
function isTransferableSpecies(
  entry: PokemonData,
  regional: RegionalPokedex,
): boolean {
  return entry.id <= 10000 && entry.generation <= regional.maxGeneration;
}

/**
 * Where an entry comes from in the run's Pokédex:
 * - "regional": listed in the regional Pokédex of the games
 * - "transfer": not in the regional dex but obtainable (trade, Pal Park, GTS, Home…)
 * - "added": manually added by the player
 */
export function getPokedexEntryOrigin(
  entry: PokemonData,
  regional: RegionalPokedex | undefined,
): PokedexEntryOrigin {
  if (!regional) return "regional";
  if (
    regional.speciesIds.includes(entry.id) ||
    isRegionalFormOf(entry, regional.region)
  ) {
    return "regional";
  }
  if (
    isTransferableSpecies(entry, regional) ||
    isObtainableRegionalForm(entry, regional)
  ) {
    return "transfer";
  }
  return "added";
}

export interface ResolvedPokedex {
  entries: PokemonData[];
  isRegional: boolean;
  /** Entries listed in the regional Pokédex (after removals) */
  regionalCount: number;
  /** Entries obtainable by trade / transfer (after removals) */
  transferCount: number;
}

/**
 * Pokédex entries for a run: the regional dex (in dex order), then every
 * other species obtainable in the games (generation ≤ games' generation),
 * minus the entries removed by the player, plus the entries added manually.
 * Regions without regional data (custom, Orre…) fall back to the full list.
 */
export function resolveRunPokedexEntries(
  run: Run | null | undefined,
  allEntries: PokemonData[],
  regional: RegionalPokedex | undefined,
): ResolvedPokedex {
  const removed = new Set(run?.pokedexRemovedPokemonIds ?? []);
  const added = run?.pokedexAddedPokemonIds ?? [];
  const byId = new Map(allEntries.map((entry) => [entry.id, entry]));

  if (!regional) {
    const entries = allEntries.filter((entry) => !removed.has(entry.id));
    return {
      entries,
      isRegional: false,
      regionalCount: entries.length,
      transferCount: 0,
    };
  }

  const inDex = new Set<number>();
  const ordered: PokemonData[] = [];
  let regionalCount = 0;
  let transferCount = 0;

  const push = (entry: PokemonData, origin: PokedexEntryOrigin) => {
    if (removed.has(entry.id) || inDex.has(entry.id)) return;
    ordered.push(entry);
    inDex.add(entry.id);
    if (origin === "regional") regionalCount++;
    else if (origin === "transfer") transferCount++;
  };

  for (const speciesId of regional.speciesIds) {
    const entry = byId.get(speciesId);
    if (entry) push(entry, "regional");
  }

  // Regional forms of this region sit right after the dex species
  for (const entry of allEntries) {
    if (isRegionalFormOf(entry, regional.region)) push(entry, "regional");
  }

  // Then every other species / regional form obtainable in these games
  for (const entry of allEntries) {
    if (
      isTransferableSpecies(entry, regional) ||
      isObtainableRegionalForm(entry, regional)
    ) {
      push(entry, "transfer");
    }
  }

  for (const id of added) {
    const entry = byId.get(id);
    if (entry) push(entry, "added");
  }

  return { entries: ordered, isRegional: true, regionalCount, transferCount };
}

/** True when the entry is part of the run's Pokédex by default (not manually added) */
export function isDefaultPokedexEntry(
  entry: PokemonData,
  regional: RegionalPokedex | undefined,
): boolean {
  return getPokedexEntryOrigin(entry, regional) !== "added";
}

/** Add an entry to the run's Pokédex (un-removes a default entry or records a manual addition) */
export function addPokedexEntryToRun(
  run: Run,
  entry: PokemonData,
  regional: RegionalPokedex | undefined,
): Run {
  const removed = (run.pokedexRemovedPokemonIds ?? []).filter(
    (id) => id !== entry.id,
  );
  const added = run.pokedexAddedPokemonIds ?? [];
  const isDefault = isDefaultPokedexEntry(entry, regional);

  return {
    ...run,
    pokedexRemovedPokemonIds: removed.length > 0 ? removed : undefined,
    pokedexAddedPokemonIds:
      isDefault || added.includes(entry.id) ? added : [...added, entry.id],
  };
}

/** Remove an entry from the run's Pokédex (drops a manual addition or hides a default entry) */
export function removePokedexEntryFromRun(
  run: Run,
  entry: PokemonData,
  regional: RegionalPokedex | undefined,
): Run {
  const added = (run.pokedexAddedPokemonIds ?? []).filter(
    (id) => id !== entry.id,
  );
  const removed = run.pokedexRemovedPokemonIds ?? [];
  const isDefault = isDefaultPokedexEntry(entry, regional);

  return {
    ...run,
    pokedexAddedPokemonIds: added.length > 0 ? added : undefined,
    pokedexRemovedPokemonIds:
      isDefault && !removed.includes(entry.id)
        ? [...removed, entry.id]
        : removed.length > 0
          ? removed
          : undefined,
  };
}
