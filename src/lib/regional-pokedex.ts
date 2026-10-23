import { publicPath } from "@/lib/base-path";
import { PokemonData, Run } from "@/lib/types";

export interface RegionalPokedex {
  region: string;
  pokedexes: string[];
  speciesIds: number[];
}

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

/** Regions that introduced regional forms (e.g. "rattata-alola", "tauros-paldea-combat-breed") */
const REGIONS_WITH_FORMS = new Set(["alola", "galar", "hisui", "paldea"]);

/** Forms whose technical name carries the region suffix; Pikachu caps are excluded */
function isRegionalForm(entry: PokemonData, region: string): boolean {
  if (entry.id <= 10000 || !REGIONS_WITH_FORMS.has(region)) return false;
  const name = entry.technicalName;
  if (name.endsWith("-cap")) return false;
  return name.endsWith(`-${region}`) || name.includes(`-${region}-`);
}

/**
 * Pokédex entries for a run: the regional dex (base species in dex order
 * plus regional forms) minus the entries removed by the player, plus the
 * entries added manually. Regions without regional data (custom, Orre…)
 * fall back to the full list.
 */
export function resolveRunPokedexEntries(
  run: Run | null | undefined,
  allEntries: PokemonData[],
  regional: RegionalPokedex | undefined,
): { entries: PokemonData[]; isRegional: boolean } {
  const removed = new Set(run?.pokedexRemovedPokemonIds ?? []);
  const added = run?.pokedexAddedPokemonIds ?? [];
  const byId = new Map(allEntries.map((entry) => [entry.id, entry]));

  if (!regional) {
    return {
      entries: allEntries.filter((entry) => !removed.has(entry.id)),
      isRegional: false,
    };
  }

  const inDex = new Set<number>();
  const ordered: PokemonData[] = [];

  for (const speciesId of regional.speciesIds) {
    const entry = byId.get(speciesId);
    if (entry && !removed.has(entry.id)) {
      ordered.push(entry);
      inDex.add(entry.id);
    }
  }

  // Regional forms sit right after the base species list
  for (const entry of allEntries) {
    if (
      isRegionalForm(entry, regional.region) &&
      !removed.has(entry.id) &&
      !inDex.has(entry.id)
    ) {
      ordered.push(entry);
      inDex.add(entry.id);
    }
  }

  for (const id of added) {
    const entry = byId.get(id);
    if (entry && !inDex.has(entry.id)) {
      ordered.push(entry);
      inDex.add(entry.id);
    }
  }

  return { entries: ordered, isRegional: true };
}

/** True when the entry belongs to the regional dex by default (not manually added) */
export function isDefaultPokedexEntry(
  entry: PokemonData,
  regional: RegionalPokedex | undefined,
): boolean {
  if (!regional) return true;
  return (
    regional.speciesIds.includes(entry.id) ||
    isRegionalForm(entry, regional.region)
  );
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
