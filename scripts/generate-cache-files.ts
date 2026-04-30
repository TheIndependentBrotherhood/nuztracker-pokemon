import * as fs from "fs";
import * as path from "path";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const OUTPUT_DIR = path.join(process.cwd(), "public/data");

// Utility: fetch with exponential-backoff retry
async function fetchWithRetry(url: string, retries = 3): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
      return res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

// ─── Generator 1: pokemon-list.json ────────────────────────────────────────

async function generatePokemonList() {
  console.log("📦 Generating pokemon-list.json…");
  const pokemon: unknown[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = (await fetchWithRetry(
      `${POKEAPI_BASE}/pokemon?offset=${offset}&limit=${limit}`,
    )) as { results: { name: string }[]; next: string | null };

    for (const p of data.results) {
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
      };
      const genMatch = species.generation.name.match(/generation-([ivxlcdm]+)/i);
      const genMap: Record<string, number> = {
        i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9,
      };
      const generation = genMatch ? (genMap[genMatch[1].toLowerCase()] ?? 0) : 0;

      pokemon.push({
        id: details.id,
        name: details.name,
        types: details.types.map((t) => t.type.name),
        sprite: details.sprites.front_default ??
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${details.id}.png`,
        isLegendary: species.is_legendary || species.is_mythical,
        generation,
      });
    }

    if (!data.next) break;
    offset += limit;
  }

  return {
    pokemon,
    generatedAt: new Date().toISOString(),
    totalCount: pokemon.length,
  };
}

// ─── Generator 2: regions.json ──────────────────────────────────────────────

async function generateRegions() {
  console.log("🗺️  Generating regions.json…");
  const regions: unknown[] = [];

  const regionsList = (await fetchWithRetry(`${POKEAPI_BASE}/region`)) as {
    results: { name: string }[];
  };

  for (const r of regionsList.results) {
    const regionData = (await fetchWithRetry(
      `${POKEAPI_BASE}/region/${r.name}`,
    )) as {
      id: number;
      name: string;
      generation?: { name: string };
      locations: { name: string }[];
    };

    const locations: unknown[] = [];

    for (const loc of regionData.locations) {
      const locData = (await fetchWithRetry(
        `${POKEAPI_BASE}/location/${loc.name}`,
      )) as {
        id: number;
        name: string;
        areas?: { name: string }[];
      };

      const pokemonIds = new Set<number>();

      for (const area of locData.areas ?? []) {
        const areaData = (await fetchWithRetry(
          `${POKEAPI_BASE}/location-area/${area.name}`,
        )) as {
          pokemon_encounters?: { pokemon: { url: string } }[];
        };
        for (const enc of areaData.pokemon_encounters ?? []) {
          // Parse the id directly from the URL (e.g. ".../pokemon/25/") to
          // avoid one extra HTTP request per encounter.
          const parts = enc.pokemon.url.replace(/\/$/, '').split('/');
          const pokemonId = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pokemonId)) pokemonIds.add(pokemonId);
        }
      }

      locations.push({
        id: locData.id,
        name: locData.name,
        pokemonEncounters: Array.from(pokemonIds),
      });
    }

    regions.push({
      id: regionData.id,
      name: regionData.name,
      generationId: regionData.generation?.name ?? null,
      locations,
    });
  }

  return {
    regions,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Generator 3: type-charts.json ──────────────────────────────────────────

async function generateTypeCharts() {
  console.log("📊 Generating type-charts.json…");
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
      };

      effectiveness[typeName] = {
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

// ─── Generator 4: abilities-immunity.json ───────────────────────────────────

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
  console.log("⚡ Generating abilities-immunity.json…");

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
        effect_entries?: { effect: string; language: { name: string } }[];
      };

      const englishEffect = abilityData.effect_entries?.find(
        (e) => e.language.name === "en",
      );

      abilities.push({
        id: abilityData.id,
        name: abilityData.name,
        generation: abilityData.generation.name,
        effect: englishEffect?.effect ?? "Unknown",
        immuneTypes: IMMUNITY_MAP[name],
        isImmunity: name !== "wonder-guard",
        ...(name === "wonder-guard" ? { special: true } : {}),
        ...(name === "dry-skin" ? { weakness: "fire" } : {}),
      });
    } catch {
      console.warn(`⚠️  Ability ${name} not found`);
    }
  }

  return {
    abilities,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Generator 5: type-sprites.json ─────────────────────────────────────────

async function generateTypeSprites() {
  console.log("🎨 Generating type-sprites.json…");

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

    // Normalize PokeAPI generation keys (e.g. "generation-i" → "gen1") so they
    // match the keys used in the hook at runtime.
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

// ─── Main ────────────────────────────────────────────────────────────────────

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
  ];

  for (const file of files) {
    try {
      const data = await file.generator();
      const outputPath = path.join(OUTPUT_DIR, file.name);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`✅ ${file.name} generated successfully`);
    } catch (e) {
      console.error(`❌ Error generating ${file.name}:`, e);
    }
  }

  console.log("✨ All cache files generated!");
}

main();
