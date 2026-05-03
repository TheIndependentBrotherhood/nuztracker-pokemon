import * as fs from "fs";
import * as path from "path";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const OUTPUT_DIR = path.join(process.cwd(), "public/data");
const POKEMON_DB_ANIM_BASE =
  "https://img.pokemondb.net/sprites/black-white/anim";

interface SheetSourceConfig {
  key: string;
  generation: number;
  csvUrl: string;
}

const SHEET_SOURCES: SheetSourceConfig[] = [
  {
    key: "google_sheet_gen6",
    generation: 6,
    csvUrl:
      "https://docs.google.com/spreadsheets/d/1Gn0UORn-unvcbUeQhQdEBz0ADNcH49BZZqQ1dpXm9eo/gviz/tq?tqx=out:csv&sheet=animated%20sprites",
  },
  {
    key: "google_sheet_gen7",
    generation: 7,
    csvUrl:
      "https://docs.google.com/spreadsheets/d/1FMcHbSKEWZc7v2Ur4cyJjT_NhO0gqXyU9kDhsOQhlBQ/gviz/tq?tqx=out:csv&sheet=animated%20sprites",
  },
  {
    key: "google_sheet_gen8",
    generation: 8,
    csvUrl:
      "https://docs.google.com/spreadsheets/d/1acgzAjh0dnFRQnjZu8kSjS177rKCzpFfEHRLtwuuXRU/gviz/tq?tqx=out:csv&sheet=animated%20sprites",
  },
  {
    key: "google_sheet_gen9",
    generation: 9,
    csvUrl:
      "https://docs.google.com/spreadsheets/d/1MCjDktTOOFjLKM5C-RW6SfBQGkjlxDSCZAZDma_ItuA/gviz/tq?tqx=out:csv&sheet=animated%20sprites",
  },
];

// Utility: fetch with exponential-backoff retry
async function fetchWithRetry(url: string, retries = 3): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
      return res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      const backoffMs = 1000 * Math.pow(2, i);
      console.warn(
        `    WARNING: Retry ${i + 1}/${retries} after ${backoffMs}ms: ${url}`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw new Error("unreachable");
}

async function fetchTextWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
      return res.text();
    } catch (e) {
      if (i === retries - 1) throw e;
      const backoffMs = 1000 * Math.pow(2, i);
      console.warn(
        `    WARNING: Retry ${i + 1}/${retries} after ${backoffMs}ms: ${url}`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw new Error("unreachable");
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values.map((v) => v.trim());
}

function normalizePokemonName(rawName: string): string {
  return rawName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, "-");
}

function extractNameFromGifUrl(url: string): string | null {
  if (!url || !url.includes(".gif")) return null;

  const cleanUrl = url.split("?")[0];
  const fileName = cleanUrl.split("/").pop();
  if (!fileName) return null;

  const namePart = fileName.replace(/\.gif$/i, "");
  return namePart ? normalizePokemonName(namePart) : null;
}

interface SheetSpriteEntry {
  normal?: string;
  shiny?: string;
}

const GEN6_MEGA_BASE_NAMES = new Set([
  "venusaur",
  "charizard-x",
  "charizard-y",
  "blastoise",
  "beedrill",
  "pidgeot",
  "alakazam",
  "slowbro",
  "gengar",
  "kangaskhan",
  "pinsir",
  "gyarados",
  "aerodactyl",
  "mewtwo-x",
  "mewtwo-y",
  "ampharos",
  "steelix",
  "scizor",
  "heracross",
  "houndoom",
  "tyranitar",
  "sceptile",
  "blaziken",
  "swampert",
  "gardevoir",
  "sableye",
  "mawile",
  "aggron",
  "medicham",
  "manectric",
  "sharpedo",
  "camerupt",
  "altaria",
  "banette",
  "absol",
  "glalie",
  "salamence",
  "metagross",
  "latias",
  "latios",
  "rayquaza",
  "lopunny",
  "garchomp",
  "lucario",
  "abomasnow",
  "gallade",
  "audino",
  "diancie",
]);

function toMegaFormKey(baseName: string): string {
  const megaSuffixMatch = baseName.match(/^(.*)-(x|y)$/i);
  if (megaSuffixMatch) {
    const root = megaSuffixMatch[1];
    const suffix = megaSuffixMatch[2].toLowerCase();
    return `${root}-mega-${suffix}`;
  }

  return `${baseName}-mega`;
}

// Gen7: Alolan form base Pokémon IDs (those listed in the Alolan Forms section of the Gen7 sheet)
const GEN7_ALOLAN_IDS = new Set([
  19, 20, 26, 27, 28, 37, 38, 50, 51, 52, 53, 74, 75, 76, 88, 89, 103, 105,
]);

function inferSheetKeysForRow(
  source: SheetSourceConfig,
  pokemonId: number | null,
  normalizedName: string,
  inPostMainSection: boolean,
  gen8SubSection?: "galarian" | "hisuian" | "gmax" | "other" | null,
): string[] {
  if (source.key === "google_sheet_gen6") {
    if (!inPostMainSection) {
      return [normalizedName];
    }

    if (pokemonId === 382 && normalizedName === "kyogre") {
      return ["kyogre-primal"];
    }

    if (pokemonId === 383 && normalizedName === "groudon") {
      return ["groudon-primal"];
    }

    if (GEN6_MEGA_BASE_NAMES.has(normalizedName)) {
      return [toMegaFormKey(normalizedName)];
    }

    return [normalizedName];
  }

  if (source.key === "google_sheet_gen7") {
    if (!inPostMainSection) {
      return [normalizedName];
    }

    if (pokemonId !== null && GEN7_ALOLAN_IDS.has(pokemonId)) {
      return [`${normalizedName}-alola`];
    }

    return [normalizedName];
  }

  if (source.key === "google_sheet_gen8") {
    if (!inPostMainSection) {
      return [normalizedName];
    }

    if (gen8SubSection === "galarian") {
      return [`${normalizedName}-galar`];
    }

    if (gen8SubSection === "hisuian") {
      return [`${normalizedName}-hisui`];
    }

    if (gen8SubSection === "gmax") {
      return [`${normalizedName}-gmax`];
    }

    return [normalizedName];
  }

  if (source.key === "google_sheet_gen9") {
    if (!inPostMainSection) {
      return [normalizedName];
    }

    // Paldean Wooper
    if (pokemonId === 194) {
      return ["wooper-paldea"];
    }

    // Paldean Tauros (no URLs yet, but map for future use)
    if (pokemonId === 128 && normalizedName.startsWith("tauros-")) {
      return [normalizedName.replace("tauros-", "tauros-paldea-")];
    }

    // Terastal and other cross-gen forms: name already normalizes correctly
    // (ursaluna-bloodmoon, terapagos-stellar, etc.)
    return [normalizedName];
  }

  return [normalizedName];
}

interface AnimatedSpriteRecord {
  id: number;
  name: string;
  generation: number;
  normal: {
    url: string | null;
    available: boolean;
    source: string | null;
  };
  shiny: {
    url: string | null;
    available: boolean;
    source: string | null;
  };
}

function buildMissingAnimatedSpritesByGeneration(
  sprites: AnimatedSpriteRecord[],
) {
  const byGeneration: Record<
    string,
    {
      missingAnyAnimated: { id: number; name: string }[];
      missingNormal: { id: number; name: string }[];
      missingShiny: { id: number; name: string }[];
    }
  > = {};

  for (const sprite of sprites) {
    const generationKey = `gen${sprite.generation}`;
    if (!byGeneration[generationKey]) {
      byGeneration[generationKey] = {
        missingAnyAnimated: [],
        missingNormal: [],
        missingShiny: [],
      };
    }

    const baseInfo = { id: sprite.id, name: sprite.name };

    if (!sprite.normal.available) {
      byGeneration[generationKey].missingNormal.push(baseInfo);
    }
    if (!sprite.shiny.available) {
      byGeneration[generationKey].missingShiny.push(baseInfo);
    }
    if (!sprite.normal.available && !sprite.shiny.available) {
      byGeneration[generationKey].missingAnyAnimated.push(baseInfo);
    }
  }

  const summaryByGeneration: Record<
    string,
    {
      missingAnyAnimatedCount: number;
      missingNormalCount: number;
      missingShinyCount: number;
    }
  > = {};

  for (const [generation, missing] of Object.entries(byGeneration)) {
    summaryByGeneration[generation] = {
      missingAnyAnimatedCount: missing.missingAnyAnimated.length,
      missingNormalCount: missing.missingNormal.length,
      missingShinyCount: missing.missingShiny.length,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    summaryByGeneration,
    byGeneration,
  };
}

async function readSheetSprites(
  source: SheetSourceConfig,
): Promise<{ map: Map<string, SheetSpriteEntry>; crossGenKeys: Set<string> }> {
  console.log(`SHEET: Fetching ${source.key} animated sprites spreadsheet...`);

  const csv = await fetchTextWithRetry(source.csvUrl);
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const map = new Map<string, SheetSpriteEntry>();
  const crossGenKeys = new Set<string>();
  let hasReachedMainSection = false;
  let inPostMainSection = false;
  let gen8SubSection: "galarian" | "hisuian" | "gmax" | "other" | null = null;

  const mainRangeStart =
    source.key === "google_sheet_gen6"
      ? 650
      : source.key === "google_sheet_gen7"
        ? 722
        : source.key === "google_sheet_gen8"
          ? 810
          : source.key === "google_sheet_gen9"
            ? 906
            : -1;
  const mainRangeEnd =
    source.key === "google_sheet_gen6"
      ? 721
      : source.key === "google_sheet_gen7"
        ? 809
        : source.key === "google_sheet_gen8"
          ? 905
          : source.key === "google_sheet_gen9"
            ? 1025
            : -1;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const idRaw = cols[0] ?? "";
    const pokemonId = idRaw ? Number.parseInt(idRaw, 10) : null;
    const nameFromColumn = cols[1] ?? "";
    const normalUrlRaw = cols[2] ?? ""; // Column C
    // "unchanged" is used in Gen6 sheet (e.g. Castform forms) to indicate no new normal sprite
    const normalUrl =
      normalUrlRaw.toLowerCase() === "unchanged" ? "" : normalUrlRaw;
    const shinyUrl = cols[4] ?? ""; // Column E

    if (mainRangeStart !== -1 && pokemonId !== null) {
      if (pokemonId >= mainRangeStart && pokemonId <= mainRangeEnd) {
        hasReachedMainSection = true;
      } else if (hasReachedMainSection && pokemonId < mainRangeStart) {
        inPostMainSection = true;
      }
    }

    // Gen8: track sub-sections (Galarian → Hisuian → Gigantamax → Other)
    // The CSV export loses IDs for Hisuian rows; detect by null↔non-null ID transitions.
    if (source.key === "google_sheet_gen8" && hasReachedMainSection) {
      if (gen8SubSection === null && pokemonId !== null && pokemonId < 810) {
        gen8SubSection = "galarian";
        inPostMainSection = true;
      } else if (gen8SubSection === "galarian" && pokemonId === null) {
        gen8SubSection = "hisuian";
        inPostMainSection = true;
      } else if (gen8SubSection === "hisuian" && pokemonId !== null) {
        gen8SubSection = "gmax";
        inPostMainSection = true;
      } else if (gen8SubSection === "gmax" && pokemonId === null) {
        gen8SubSection = "other";
        inPostMainSection = true;
      }
    }

    if (!normalUrl && !shinyUrl) {
      continue;
    }

    const keyFromName = nameFromColumn
      ? normalizePokemonName(nameFromColumn)
      : null;
    const keyFromNormal = extractNameFromGifUrl(normalUrl);
    const keyFromShiny = extractNameFromGifUrl(shinyUrl);
    const key = keyFromName || keyFromNormal || keyFromShiny;

    if (!key) {
      continue;
    }

    const inferredKeys = inferSheetKeysForRow(
      source,
      pokemonId,
      key,
      inPostMainSection,
      gen8SubSection,
    );

    for (const inferredKey of inferredKeys) {
      const existing = map.get(inferredKey);
      map.set(inferredKey, {
        normal: normalUrl || existing?.normal,
        shiny: shinyUrl || existing?.shiny,
      });
      if (inPostMainSection) {
        crossGenKeys.add(inferredKey);
      }
    }
  }

  console.log(`SHEET: Parsed ${map.size} Pokemon entries from ${source.key}`);
  return { map, crossGenKeys };
}

async function checkUrlAvailable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    if (headResponse.ok) {
      return true;
    }

    if (headResponse.status !== 405 && headResponse.status !== 403) {
      return false;
    }
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }

  const fallbackController = new AbortController();
  const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);

  try {
    const fallbackResponse = await fetch(url, {
      method: "GET",
      headers: {
        Range: "bytes=0-0",
      },
      signal: fallbackController.signal,
    });

    return fallbackResponse.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(fallbackTimeoutId);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const itemIndex = currentIndex;
      currentIndex += 1;

      if (itemIndex >= items.length) {
        return;
      }

      results[itemIndex] = await mapper(items[itemIndex], itemIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

interface PokemonListEntry {
  id: number;
  name: string;
  generation: number;
}

function readPokemonListFromCache(): PokemonListEntry[] {
  const pokemonListPath = path.join(OUTPUT_DIR, "pokemon-list.json");

  if (!fs.existsSync(pokemonListPath)) {
    throw new Error(
      "pokemon-list.json not found. Generate pokemon-list.json first.",
    );
  }

  const raw = fs.readFileSync(pokemonListPath, "utf-8");
  const data = JSON.parse(raw) as { pokemon?: PokemonListEntry[] };

  if (!data.pokemon || !Array.isArray(data.pokemon)) {
    throw new Error("pokemon-list.json has an invalid format.");
  }

  return data.pokemon;
}

// Generator 1: pokemon-list.json

async function generatePokemonList() {
  console.log("PACKAGE: Generating pokemon-list.json...");
  const pokemon: unknown[] = [];
  let offset = 0;
  const limit = 100;
  let totalBatches = 0;

  while (true) {
    console.log(
      `  FETCH: Batch ${totalBatches + 1} (offset: ${offset}, limit: ${limit})...`,
    );

    const data = (await fetchWithRetry(
      `${POKEAPI_BASE}/pokemon?offset=${offset}&limit=${limit}`,
    )) as { results: { name: string }[]; next: string | null };

    console.log(`    -> Received ${data.results.length} Pokemon in this batch`);

    for (let i = 0; i < data.results.length; i++) {
      const p = data.results[i];
      const details = (await fetchWithRetry(
        `${POKEAPI_BASE}/pokemon/${p.name}`,
      )) as {
        id: number;
        name: string;
        types: { type: { name: string } }[];
        sprites: { front_default: string | null };
        species: { url: string };
      };

      // Determine generation from species data
      const species = (await fetchWithRetry(details.species.url)) as {
        is_legendary: boolean;
        is_mythical: boolean;
        generation: { name: string };
        names?: { language: { name: string }; name: string }[];
      };
      const genMatch = species.generation.name.match(
        /generation-([ivxlcdm]+)/i,
      );
      const genMap: Record<string, number> = {
        i: 1,
        ii: 2,
        iii: 3,
        iv: 4,
        v: 5,
        vi: 6,
        vii: 7,
        viii: 8,
        ix: 9,
      };
      const generation = genMatch
        ? (genMap[genMatch[1].toLowerCase()] ?? 0)
        : 0;

      // Extract French and English names
      const names: { fr?: string; en?: string } = {};
      if (species.names) {
        for (const nameObj of species.names) {
          if (nameObj.language.name === "fr") names.fr = nameObj.name;
          if (nameObj.language.name === "en") names.en = nameObj.name;
        }
      }

      pokemon.push({
        id: details.id,
        name: details.name,
        names,
        types: details.types.map((t) => t.type.name),
        sprite:
          details.sprites.front_default ??
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${details.id}.png`,
        isLegendary: species.is_legendary || species.is_mythical,
        generation,
      });

      if ((i + 1) % 20 === 0) {
        console.log(`      OK: Processed ${i + 1}/${data.results.length}`);
      }
    }

    totalBatches++;
    console.log(
      `    OK: Batch complete (${pokemon.length} total Pokemon so far)\n`,
    );

    if (!data.next) break;
    offset += limit;
  }

  return {
    pokemon,
    generatedAt: new Date().toISOString(),
    totalCount: pokemon.length,
  };
}

// Generator 2: regions.json

async function generateRegions() {
  console.log("MAP: Generating regions.json...");
  const regions: unknown[] = [];

  const regionsList = (await fetchWithRetry(`${POKEAPI_BASE}/region`)) as {
    results: { name: string }[];
  };

  console.log(
    `LOCATION: Found ${regionsList.results.length} regions to process`,
  );

  for (let rIdx = 0; rIdx < regionsList.results.length; rIdx++) {
    const r = regionsList.results[rIdx];
    console.log(
      `  [${rIdx + 1}/${regionsList.results.length}] Processing region: ${r.name}...`,
    );

    const regionData = (await fetchWithRetry(
      `${POKEAPI_BASE}/region/${r.name}`,
    )) as {
      id: number;
      name: string;
      generation?: { name: string };
      locations: { name: string }[];
      names?: { language: { name: string }; name: string }[];
    };

    console.log(`    -> Region has ${regionData.locations.length} locations`);

    // Extract French and English names for region
    const regionNames: { fr?: string; en?: string } = {};
    if (regionData.names) {
      for (const nameObj of regionData.names) {
        if (nameObj.language.name === "fr") regionNames.fr = nameObj.name;
        if (nameObj.language.name === "en") regionNames.en = nameObj.name;
      }
    }

    const locations: unknown[] = [];

    for (let locIdx = 0; locIdx < regionData.locations.length; locIdx++) {
      const loc = regionData.locations[locIdx];
      console.log(
        `      [${locIdx + 1}/${regionData.locations.length}] Fetching location: ${loc.name}...`,
      );

      const locData = (await fetchWithRetry(
        `${POKEAPI_BASE}/location/${loc.name}`,
      )) as {
        id: number;
        name: string;
        areas?: { name: string }[];
        names?: { language: { name: string }; name: string }[];
      };

      console.log(
        `        -> Location has ${locData.areas?.length ?? 0} areas`,
      );

      // Extract French and English names
      const names: { fr?: string; en?: string } = {};
      if (locData.names) {
        for (const nameObj of locData.names) {
          if (nameObj.language.name === "fr") names.fr = nameObj.name;
          if (nameObj.language.name === "en") names.en = nameObj.name;
        }
      }

      locations.push({
        id: locData.id,
        name: locData.name,
        names,
      });
      console.log(`        OK: Location fetched`);
    }

    regions.push({
      id: regionData.id,
      name: regionData.name,
      names: regionNames,
      locations,
    });
    console.log(`  OK: Region ${r.name} complete\n`);
  }

  return {
    regions,
    generatedAt: new Date().toISOString(),
  };
}

// Generator 3: type-charts.json

async function generateTypeCharts() {
  console.log("CHART: Generating type-charts.json...");
  const charts: Record<string, unknown> = {};

  for (const genId of [1, 2, 6]) {
    const genData = (await fetchWithRetry(
      `${POKEAPI_BASE}/generation/${genId}`,
    )) as { types: { name: string }[] };

    const types = genData.types.map((t) => t.name);
    const effectiveness: Record<string, unknown> = {};

    for (const typeName of types) {
      const typeData = (await fetchWithRetry(
        `${POKEAPI_BASE}/type/${typeName}`,
      )) as {
        damage_relations: {
          double_damage_from: { name: string }[];
          half_damage_from: { name: string }[];
          no_damage_from: { name: string }[];
          double_damage_to: { name: string }[];
        };
        names?: { language: { name: string }; name: string }[];
      };

      // Extract French and English names
      const names: { fr?: string; en?: string } = {};
      if (typeData.names) {
        for (const nameObj of typeData.names) {
          if (nameObj.language.name === "fr") names.fr = nameObj.name;
          if (nameObj.language.name === "en") names.en = nameObj.name;
        }
      }

      effectiveness[typeName] = {
        names,
        weakTo: typeData.damage_relations.double_damage_from.map((t) => t.name),
        resistsAgainst: typeData.damage_relations.half_damage_from.map(
          (t) => t.name,
        ),
        immuneTo: typeData.damage_relations.no_damage_from.map((t) => t.name),
        strongAgainst: typeData.damage_relations.double_damage_to.map(
          (t) => t.name,
        ),
      };
    }

    const genKey = genId === 1 ? "gen1" : genId === 2 ? "gen2-5" : "gen6+";
    charts[genKey] = { types, effectiveness };
  }

  return {
    ...charts,
    generatedAt: new Date().toISOString(),
  };
}

// Generator 4: abilities-immunity.json

const IMMUNITY_MAP: Record<string, string[]> = {
  "water-absorb": ["water"],
  "flash-fire": ["fire"],
  levitate: ["ground"],
  "sap-sipper": ["grass"],
  "lightning-rod": ["electric"],
  "wonder-guard": ["all-except-super-effective"],
  "volt-absorb": ["electric"],
  "dry-skin": ["water"],
  "storm-drain": ["water"],
  "earth-eater": ["ground"],
};

async function generateAbilitiesImmunity() {
  console.log("ABILITY: Generating abilities-immunity.json...");

  const abilityNames = Object.keys(IMMUNITY_MAP);
  const abilities: unknown[] = [];

  for (const name of abilityNames) {
    try {
      const abilityData = (await fetchWithRetry(
        `${POKEAPI_BASE}/ability/${name}`,
      )) as {
        id: number;
        name: string;
        generation: { name: string };
        names?: { language: { name: string }; name: string }[];
        effect_entries?: {
          effect: string;
          language: { name: string };
          short_effect?: string;
        }[];
      };

      // Extract French and English names
      const abilityNames: { fr?: string; en?: string } = {};
      if (abilityData.names) {
        for (const nameObj of abilityData.names) {
          if (nameObj.language.name === "fr") abilityNames.fr = nameObj.name;
          if (nameObj.language.name === "en") abilityNames.en = nameObj.name;
        }
      }

      // Extract French and English effects
      const effects: { fr?: string; en?: string } = {};
      if (abilityData.effect_entries) {
        for (const entry of abilityData.effect_entries) {
          if (entry.language.name === "fr") effects.fr = entry.effect;
          if (entry.language.name === "en") effects.en = entry.effect;
        }
      }

      abilities.push({
        id: abilityData.id,
        name: abilityData.name,
        names: abilityNames,
        generation: abilityData.generation.name,
        effects,
        immuneTypes: IMMUNITY_MAP[name],
        isImmunity: name !== "wonder-guard",
        ...(name === "wonder-guard" ? { special: true } : {}),
        ...(name === "dry-skin" ? { weakness: "fire" } : {}),
      });
    } catch {
      console.warn(`WARNING: Ability ${name} not found`);
    }
  }

  return {
    abilities,
    generatedAt: new Date().toISOString(),
  };
}

// Generator 5: type-sprites.json

async function generateTypeSprites() {
  console.log("SPRITE: Generating type-sprites.json...");

  const typesList = (await fetchWithRetry(`${POKEAPI_BASE}/type`)) as {
    results: { name: string }[];
  };
  const types: unknown[] = [];

  for (const typeItem of typesList.results) {
    const typeData = (await fetchWithRetry(
      `${POKEAPI_BASE}/type/${typeItem.name}`,
    )) as {
      id: number;
      name: string;
      sprites?: Record<string, unknown>;
    };

    const sprites: Record<string, Record<string, unknown>> = {};

    const POKEAPI_GEN_KEY_MAP: Record<string, string> = {
      "generation-i": "gen1",
      "generation-ii": "gen2",
      "generation-iii": "gen3",
      "generation-iv": "gen4",
      "generation-v": "gen5",
      "generation-vi": "gen6",
      "generation-vii": "gen7",
      "generation-viii": "gen8",
      "generation-ix": "gen9",
    };

    if (typeData.sprites) {
      for (const [rawGenKey, genSprites] of Object.entries(typeData.sprites)) {
        const genKey = POKEAPI_GEN_KEY_MAP[rawGenKey] ?? rawGenKey;
        if (typeof genSprites === "object" && genSprites !== null) {
          sprites[genKey] = {};
          for (const [gameName, gameSprites] of Object.entries(
            genSprites as Record<string, unknown>,
          )) {
            if (typeof gameSprites === "object" && gameSprites !== null) {
              sprites[genKey][gameName] = gameSprites;
            }
          }
        }
      }
    }

    types.push({
      id: typeData.id,
      name: typeData.name,
      sprites,
    });
  }

  return {
    types,
    generatedAt: new Date().toISOString(),
  };
}

// Generator 6: animated-sprites-bw.json

async function generateAnimatedSpritesBw() {
  console.log("ANIM: Generating animated-sprites-bw.json...");

  const pokemon = readPokemonListFromCache();
  const sheetSourcesData: Array<{
    source: SheetSourceConfig;
    map: Map<string, SheetSpriteEntry>;
    crossGenKeys: Set<string>;
  }> = [];

  for (const source of SHEET_SOURCES) {
    const parsed = await readSheetSprites(source);
    sheetSourcesData.push({
      source,
      map: parsed.map,
      crossGenKeys: parsed.crossGenKeys,
    });
  }

  const totalLinksToCheck = pokemon.length * 2;

  console.log(
    `LINK: Checking ${totalLinksToCheck} links (${pokemon.length} Pokemon x normal + shiny)...`,
  );

  const sourceStats: Record<
    string,
    {
      normalSelected: number;
      shinySelected: number;
      pokemonWithAtLeastOne: number;
    }
  > = {
    pokemondb_bw: {
      normalSelected: 0,
      shinySelected: 0,
      pokemonWithAtLeastOne: 0,
    },
  };

  for (const source of SHEET_SOURCES) {
    sourceStats[source.key] = {
      normalSelected: 0,
      shinySelected: 0,
      pokemonWithAtLeastOne: 0,
    };
  }

  const sprites = await mapWithConcurrency(
    pokemon,
    25,
    async (entry, index) => {
      const normalizedEntryName = normalizePokemonName(entry.name);

      const isMegaOrPrimalForm =
        normalizedEntryName.includes("-mega") ||
        normalizedEntryName.includes("-primal");
      const isAlolanForm = normalizedEntryName.endsWith("-alola");
      const isGalarianForm = normalizedEntryName.endsWith("-galar");
      const isHisuianForm = normalizedEntryName.endsWith("-hisui");
      const isGmaxForm = normalizedEntryName.endsWith("-gmax");

      const sheetCandidatesForNormal = sheetSourcesData
        .map(({ source, map, crossGenKeys }) => {
          // Each sheet only covers its own generation.
          // Exception: Gen6 sheet also covers mega/primal forms from any generation.
          // Exception: Gen7 sheet also covers Alolan forms from Gen1.
          // Exception: Gen8 sheet also covers Galarian/Hisuian/Gigantamax forms from any generation.
          // Exception: Gen9 sheet also covers Paldean forms and Ursaluna-bloodmoon.
          // Exception: Any sheet can cover cross-gen forms found in its "Other Forms" section.
          const isGenMatch = entry.generation === source.generation;
          const isGen6MegaPrimalException =
            source.key === "google_sheet_gen6" && isMegaOrPrimalForm;
          const isGen7AlolanException =
            source.key === "google_sheet_gen7" && isAlolanForm;
          const isGen8GalarHisuiGmaxException =
            source.key === "google_sheet_gen8" &&
            (isGalarianForm || isHisuianForm || isGmaxForm);
          const isGen9PaldeanCrossGenException =
            source.key === "google_sheet_gen9" &&
            (normalizedEntryName.endsWith("-paldea") ||
              normalizedEntryName.startsWith("tauros-paldea-") ||
              normalizedEntryName === "ursaluna-bloodmoon");
          const isOtherFormsException = crossGenKeys.has(normalizedEntryName);

          if (
            !isGenMatch &&
            !isGen6MegaPrimalException &&
            !isGen7AlolanException &&
            !isGen8GalarHisuiGmaxException &&
            !isGen9PaldeanCrossGenException &&
            !isOtherFormsException
          )
            return null;

          const sheetEntry = map.get(normalizedEntryName);
          if (!sheetEntry?.normal) return null;
          return {
            source: source.key,
            url: sheetEntry.normal,
          };
        })
        .filter((candidate): candidate is { source: string; url: string } =>
          Boolean(candidate),
        );

      const sheetCandidatesForShiny = sheetSourcesData
        .map(({ source, map, crossGenKeys }) => {
          const isGenMatch = entry.generation === source.generation;
          const isGen6MegaPrimalException =
            source.key === "google_sheet_gen6" && isMegaOrPrimalForm;
          const isGen7AlolanException =
            source.key === "google_sheet_gen7" && isAlolanForm;
          const isGen8GalarHisuiGmaxException =
            source.key === "google_sheet_gen8" &&
            (isGalarianForm || isHisuianForm || isGmaxForm);
          const isGen9PaldeanCrossGenException =
            source.key === "google_sheet_gen9" &&
            (normalizedEntryName.endsWith("-paldea") ||
              normalizedEntryName.startsWith("tauros-paldea-") ||
              normalizedEntryName === "ursaluna-bloodmoon");
          const isOtherFormsException = crossGenKeys.has(normalizedEntryName);

          if (
            !isGenMatch &&
            !isGen6MegaPrimalException &&
            !isGen7AlolanException &&
            !isGen8GalarHisuiGmaxException &&
            !isGen9PaldeanCrossGenException &&
            !isOtherFormsException
          )
            return null;

          const sheetEntry = map.get(normalizedEntryName);
          if (!sheetEntry?.shiny) return null;
          return {
            source: source.key,
            url: sheetEntry.shiny,
          };
        })
        .filter((candidate): candidate is { source: string; url: string } =>
          Boolean(candidate),
        );

      const normalCandidates = [
        {
          source: "pokemondb_bw",
          url: `${POKEMON_DB_ANIM_BASE}/normal/${entry.name}.gif`,
        },
        ...sheetCandidatesForNormal,
      ];

      // For Castform forms, prefer the Gen6 sheet shiny over PokeDB
      // (the Gen6 sheet has dedicated Castform form shinys; PokeDB only has the base form)
      const isCastformForm = normalizedEntryName.startsWith("castform-");
      const shinyCandidates = isCastformForm
        ? [
            ...sheetCandidatesForShiny,
            {
              source: "pokemondb_bw",
              url: `${POKEMON_DB_ANIM_BASE}/shiny/${entry.name}.gif`,
            },
          ]
        : [
            {
              source: "pokemondb_bw",
              url: `${POKEMON_DB_ANIM_BASE}/shiny/${entry.name}.gif`,
            },
            ...sheetCandidatesForShiny,
          ];

      let normalSelected: { source: string; url: string } | null = null;
      let shinySelected: { source: string; url: string } | null = null;

      for (const candidate of normalCandidates) {
        const available = await checkUrlAvailable(candidate.url);
        if (available) {
          normalSelected = candidate;
          break;
        }
      }

      for (const candidate of shinyCandidates) {
        const available = await checkUrlAvailable(candidate.url);
        if (available) {
          shinySelected = candidate;
          break;
        }
      }

      if (normalSelected) {
        sourceStats[normalSelected.source].normalSelected += 1;
      }
      if (shinySelected) {
        sourceStats[shinySelected.source].shinySelected += 1;
      }

      for (const sourceName of Object.keys(sourceStats)) {
        const hasAtLeastOne =
          normalSelected?.source === sourceName ||
          shinySelected?.source === sourceName;
        if (hasAtLeastOne) {
          sourceStats[sourceName].pokemonWithAtLeastOne += 1;
        }
      }

      if ((index + 1) % 50 === 0 || index + 1 === pokemon.length) {
        console.log(`  OK: Checked ${index + 1}/${pokemon.length} Pokemon`);
      }

      return {
        id: entry.id,
        name: entry.name,
        generation: entry.generation,
        normal: {
          url: normalSelected?.url ?? null,
          available: Boolean(normalSelected),
          source: normalSelected?.source ?? null,
        },
        shiny: {
          url: shinySelected?.url ?? null,
          available: Boolean(shinySelected),
          source: shinySelected?.source ?? null,
        },
      };
    },
  );

  const typedSprites = sprites as AnimatedSpriteRecord[];

  const normalWorking = typedSprites.filter((s) => s.normal.available).length;
  const shinyWorking = typedSprites.filter((s) => s.shiny.available).length;
  const linksWorking = normalWorking + shinyWorking;
  const missingByGeneration =
    buildMissingAnimatedSpritesByGeneration(typedSprites);

  const sourceNames = Object.keys(sourceStats);
  for (const sourceName of sourceNames) {
    const stats = sourceStats[sourceName];
    console.log(
      `SOURCE: ${sourceName} -> normal=${stats.normalSelected}, shiny=${stats.shinySelected}, pokemonWithAtLeastOne=${stats.pokemonWithAtLeastOne}`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalPokemon: pokemon.length,
      totalLinksChecked: totalLinksToCheck,
      linksWorking,
      linksFailed: totalLinksToCheck - linksWorking,
      normalWorking,
      shinyWorking,
      sourceCoverage: sourceStats,
    },
    sprites: typedSprites,
    missingByGeneration,
  };
}

// Main

interface CacheFile {
  name: string;
  generator: () => Promise<unknown>;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files: CacheFile[] = [
    { name: "pokemon-list.json", generator: generatePokemonList },
    { name: "regions.json", generator: generateRegions },
    { name: "type-charts.json", generator: generateTypeCharts },
    { name: "type-sprites.json", generator: generateTypeSprites },
    { name: "abilities-immunity.json", generator: generateAbilitiesImmunity },
    { name: "animated-sprites-bw.json", generator: generateAnimatedSpritesBw },
  ];

  const selectedFileNames = process.argv.slice(2);
  const filesToGenerate =
    selectedFileNames.length === 0
      ? files
      : files.filter((f) => selectedFileNames.includes(f.name));

  if (selectedFileNames.length > 0 && filesToGenerate.length === 0) {
    console.error(
      `No matching files for: ${selectedFileNames.join(", ")}. Available: ${files.map((f) => f.name).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nSTART: Cache generation at ${new Date().toISOString()}\n`);

  for (const file of filesToGenerate) {
    const startTime = Date.now();
    try {
      const separator = "=".repeat(60);
      console.log(`\n${separator}`);
      console.log(`Starting: ${file.name}`);
      console.log(`${separator}\n`);

      const data = await file.generator();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const outputPath = path.join(OUTPUT_DIR, file.name);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

      if (file.name === "animated-sprites-bw.json") {
        const animatedData = data as {
          missingByGeneration?: unknown;
        };

        if (animatedData.missingByGeneration) {
          const missingOutputPath = path.join(
            OUTPUT_DIR,
            "missing-animated-sprites-by-generation.json",
          );
          fs.writeFileSync(
            missingOutputPath,
            JSON.stringify(animatedData.missingByGeneration, null, 2),
          );
          console.log(
            "INFO: missing-animated-sprites-by-generation.json generated",
          );
        }
      }

      console.log(`\nSUCCESS: ${file.name} generated (${elapsed}s)\n`);
    } catch (e) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`\nERROR: Generating ${file.name} (after ${elapsed}s):`, e);
      console.error(`\n`);
    }
  }

  console.log(
    `\nFINISH: All cache files generated! Completed at ${new Date().toISOString()}`,
  );
}

main();
