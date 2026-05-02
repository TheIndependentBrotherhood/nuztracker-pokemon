import * as fs from "fs";
import * as path from "path";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const OUTPUT_DIR = path.join(process.cwd(), "public/data");
const POKEMON_DB_ANIM_BASE =
  "https://img.pokemondb.net/sprites/black-white/anim";

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
  const totalLinksToCheck = pokemon.length * 2;

  console.log(
    `LINK: Checking ${totalLinksToCheck} links (${pokemon.length} Pokemon x normal + shiny)...`,
  );

  const sprites = await mapWithConcurrency(
    pokemon,
    25,
    async (entry, index) => {
      const normalUrl = `${POKEMON_DB_ANIM_BASE}/normal/${entry.name}.gif`;
      const shinyUrl = `${POKEMON_DB_ANIM_BASE}/shiny/${entry.name}.gif`;

      const [normalAvailable, shinyAvailable] = await Promise.all([
        checkUrlAvailable(normalUrl),
        checkUrlAvailable(shinyUrl),
      ]);

      if ((index + 1) % 50 === 0 || index + 1 === pokemon.length) {
        console.log(`  OK: Checked ${index + 1}/${pokemon.length} Pokemon`);
      }

      return {
        id: entry.id,
        name: entry.name,
        generation: entry.generation,
        normal: {
          url: normalUrl,
          available: normalAvailable,
        },
        shiny: {
          url: shinyUrl,
          available: shinyAvailable,
        },
      };
    },
  );

  const normalWorking = sprites.filter((s) => s.normal.available).length;
  const shinyWorking = sprites.filter((s) => s.shiny.available).length;
  const linksWorking = normalWorking + shinyWorking;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalPokemon: pokemon.length,
      totalLinksChecked: totalLinksToCheck,
      linksWorking,
      linksFailed: totalLinksToCheck - linksWorking,
      normalWorking,
      shinyWorking,
    },
    sprites,
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
