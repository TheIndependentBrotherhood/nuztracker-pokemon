import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { mergeAnimatedSpritesIntoPokemonList } from "@/lib/server/animatedSpritesMerge";

export const dynamic = "force-static";

const DATA_DIR = path.join(process.cwd(), "public", "data");

export async function generateStaticParams() {
  return [
    { step: "type-charts" },
    { step: "type-sprites" },
    { step: "abilities" },
    { step: "pokemon-list" },
    { step: "regions" },
    { step: "animated-sprites" },
  ];
}

/**
 * POST /api/dev/sync/[step]
 *
 * Streams Server-Sent Events (SSE) with progress and final diff data.
 * Events:
 *   { type: "progress", message: string, current?: number, total?: number }
 *   { type: "diff", added: T[], modified: T[], deleted: T[], incoming: unknown }
 *   { type: "error", message: string }
 *   { type: "done" }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ step: string }> },
) {
  const { step } = await params;

  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  // Start async sync independently from ReadableStream.start()
  (async () => {
    if (!controller) return; // Safety check

    function send(data: unknown) {
      if (controller) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      }
    }

    try {
      switch (step) {
        case "type-charts":
          await syncTypeCharts(send);
          break;
        case "type-sprites":
          await syncTypeSprites(send);
          break;
        case "abilities":
          await syncAbilities(send);
          break;
        case "pokemon-list":
          await syncPokemonList(send);
          break;
        case "regions":
          await syncRegions(send);
          break;
        case "animated-sprites":
          await syncAnimatedSprites(send);
          break;
        default:
          send({ type: "error", message: `Unknown step: ${step}` });
      }
      send({ type: "done" });
    } catch (e) {
      send({
        type: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      controller?.close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ step: string }> },
) {
  const { step } = await params;
  return new Response(
    JSON.stringify({
      ok: false,
      step,
      message:
        "Use POST on this endpoint from the dev sync UI to run the synchronization stream.",
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readCurrentFile<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, minDelayMs = 0): Promise<T> {
  if (minDelayMs > 0) await delay(minDelayMs);

  const maxRetries = 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status >= 500) {
          // Server error - might be temporary
          if (attempt < maxRetries - 1) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            await delay(backoffMs);
            continue;
          }
        }
        throw new Error(`HTTP ${res.status} – ${url}`);
      }
      return res.json() as Promise<T>;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await delay(backoffMs);
      }
    }
  }

  throw (
    lastError ||
    new Error(`Failed to fetch ${url} after ${maxRetries} attempts`)
  );
}

/**
 * Map PokeAPI generation name (e.g. "generation-iii") to app format (e.g. "gen3")
 */
function mapGenerationName(pokeapiGen: string): string {
  const romanToNum: Record<string, string> = {
    i: "1",
    ii: "2",
    iii: "3",
    iv: "4",
    v: "5",
    vi: "6",
    vii: "7",
    viii: "8",
    ix: "9",
  };

  // Extract roman numeral from "generation-iii" format
  const match = pokeapiGen.match(/generation-([ivx]+)/);
  if (!match) return pokeapiGen;

  const roman = match[1];
  const num = romanToNum[roman];
  return num ? `gen${num}` : pokeapiGen;
}

/**
 * Map generation number to app format:
 * 1 → "gen1", 2 → "gen2-5", 6+ → "gen6+"
 */
function mapGenerationNumberToKey(genId: number): string {
  if (genId === 1) return "gen1";
  if (genId <= 5) return "gen2-5";
  return "gen6+";
}

type SendFn = (data: unknown) => void;

// ─── type-charts sync ─────────────────────────────────────────────────────────

async function syncTypeCharts(send: SendFn) {
  send({
    type: "progress",
    message: "Fetching type-charts by generation from PokeAPI…",
  });

  const POKEAPI = "https://pokeapi.co/api/v2";
  const current = readCurrentFile<Record<string, unknown>>("type-charts.json");

  // Build charts for generations 1, 2, and 6
  const incoming: Record<string, unknown> = {};
  const genIds = [1, 2, 6];

  for (let gIdx = 0; gIdx < genIds.length; gIdx++) {
    const genId = genIds[gIdx];
    const genKey = mapGenerationNumberToKey(genId);

    send({
      type: "progress",
      message: `📊 Generation ${gIdx + 1}/3: Fetching ${genKey}…`,
      current: gIdx,
      total: 3,
    });

    const genData = await fetchJson<{
      types: { name: string }[];
    }>(`${POKEAPI}/generation/${genId}`, 100);

    const types = genData.types.map((t) => t.name);
    const effectiveness: Record<string, unknown> = {};

    for (const typeName of types) {
      const typeInfo = await fetchJson<{
        name: string;
        damage_relations: {
          double_damage_from: { name: string }[];
          half_damage_from: { name: string }[];
          no_damage_from: { name: string }[];
          double_damage_to: { name: string }[];
        };
        names: { language: { name: string }; name: string }[];
      }>(`${POKEAPI}/type/${typeName}`, 50);

      const names: Record<string, string> = {};
      for (const n of typeInfo.names) {
        if (n.language.name === "fr" || n.language.name === "en") {
          names[n.language.name] = n.name;
        }
      }

      effectiveness[typeName] = {
        names,
        weakTo: typeInfo.damage_relations.double_damage_from.map((t) => t.name),
        resistsAgainst: typeInfo.damage_relations.half_damage_from.map(
          (t) => t.name,
        ),
        immuneTo: typeInfo.damage_relations.no_damage_from.map((t) => t.name),
        strongAgainst: typeInfo.damage_relations.double_damage_to.map(
          (t) => t.name,
        ),
      };
    }

    incoming[genKey] = { types, effectiveness };
  }

  const diff = diffObjects(
    (current as Record<string, unknown> | null) ?? {},
    incoming,
  );
  send({ type: "diff", ...diff, incoming });
}

// ─── type-sprites sync ────────────────────────────────────────────────────────

async function syncTypeSprites(send: SendFn) {
  send({
    type: "progress",
    message: "Fetching type sprites from PokeAPI…",
  });
  const POKEAPI = "https://pokeapi.co/api/v2";

  const typeList = await fetchJson<{
    results: { name: string; url: string }[];
  }>(`${POKEAPI}/type?limit=100`);

  const current = readCurrentFile<{ types: unknown[] }>("type-sprites.json");
  const currentById = new Map(
    ((current?.types ?? []) as { name: string }[]).map((t) => [t.name, t]),
  );

  const incomingTypes = [];
  for (let i = 0; i < typeList.results.length; i++) {
    const typeData = await fetchJson<{
      id: number;
      name: string;
      sprites: Record<string, unknown>;
    }>(typeList.results[i].url, 50);

    // Normalize generation keys from "generation-iii" to "gen3"
    const normalizedSprites: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(typeData.sprites)) {
      if (key.startsWith("generation-")) {
        const mappedKey = mapGenerationName(key);
        normalizedSprites[mappedKey] = value;
      } else {
        normalizedSprites[key] = value;
      }
    }

    incomingTypes.push({
      id: typeData.id,
      name: typeData.name,
      sprites: normalizedSprites,
    });

    send({
      type: "progress",
      message: `Fetched sprites: ${typeData.name}`,
      current: i + 1,
      total: typeList.results.length,
    });
  }

  const added: unknown[] = [];
  const modified: unknown[] = [];
  const deleted: unknown[] = [];

  for (const t of incomingTypes as { name: string }[]) {
    if (!currentById.has(t.name)) {
      added.push(t);
    } else if (JSON.stringify(currentById.get(t.name)) !== JSON.stringify(t)) {
      modified.push({ current: currentById.get(t.name), incoming: t });
    }
  }

  const incomingNames = new Set(
    incomingTypes.map((t: { name: string }) => t.name),
  );
  for (const [name] of currentById) {
    if (!incomingNames.has(name)) deleted.push(currentById.get(name));
  }

  send({
    type: "diff",
    added,
    modified,
    deleted,
    incoming: { types: incomingTypes, generatedAt: new Date().toISOString() },
  });
}

// ─── abilities sync ──────────────────────────────────────────────────────────

// Map of abilities that grant immunity to specific types
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

async function syncAbilities(send: SendFn) {
  send({
    type: "progress",
    message: "Fetching all abilities from PokeAPI…",
  });
  const POKEAPI = "https://pokeapi.co/api/v2";

  const abilityList = await fetchJson<{
    results: { name: string; url: string }[];
    count: number;
  }>(`${POKEAPI}/ability?limit=500`);

  send({
    type: "progress",
    message: `Found ${abilityList.results.length} abilities`,
    current: 0,
    total: abilityList.results.length,
  });

  const current = readCurrentFile<{ abilities: unknown[] }>(
    "abilities.json",
  );
  const currentByName = new Map(
    ((current?.abilities ?? []) as { name: string }[]).map((a) => [a.name, a]),
  );

  const incoming: unknown[] = [];
  for (let i = 0; i < abilityList.results.length; i++) {
    const abilityData = await fetchJson<{
      id: number;
      name: string;
      generation: { name: string };
      names: { language: { name: string }; name: string }[];
      effect_entries: {
        effect: string;
        short_effect: string;
        language: { name: string };
      }[];
    }>(abilityList.results[i].url, 50);

    // Get name translations
    const names: Record<string, string> = {};
    for (const n of abilityData.names) {
      if (n.language.name === "fr" || n.language.name === "en") {
        names[n.language.name] = n.name;
      }
    }

    // Get effect translations
    const effectEn =
      abilityData.effect_entries.find((e) => e.language.name === "en")
        ?.effect ?? "";
    const effectFr =
      abilityData.effect_entries.find((e) => e.language.name === "fr")
        ?.effect ?? "";

    const entry: Record<string, unknown> = {
      id: abilityData.id,
      name: abilityData.name,
      names,
      generation: abilityData.generation.name,
      effects: {
        fr: effectFr,
        en: effectEn,
      },
    };

    // Add immuneTypes if this ability grants immunity
    if (abilityData.name in IMMUNITY_MAP) {
      entry.immuneTypes = IMMUNITY_MAP[abilityData.name];
    }

    // Add special attributes for specific abilities
    if (abilityData.name === "dry-skin") {
      entry.weakness = "fire";
    }

    incoming.push(entry);

    if ((i + 1) % 50 === 0) {
      send({
        type: "progress",
        message: `⚡ ${i + 1}/${abilityList.results.length} abilities fetched`,
        current: i + 1,
        total: abilityList.results.length,
      });
    }
  }

  const added: unknown[] = [];
  const modified: unknown[] = [];
  const deleted: unknown[] = [];

  for (const a of incoming as { name: string }[]) {
    if (!currentByName.has(a.name)) {
      added.push(a);
    } else if (
      JSON.stringify(currentByName.get(a.name)) !== JSON.stringify(a)
    ) {
      modified.push({ current: currentByName.get(a.name), incoming: a });
    }
  }

  const incomingNames = new Set(
    (incoming as { name: string }[]).map((a) => a.name),
  );
  for (const [name] of currentByName) {
    if (!incomingNames.has(name)) deleted.push(currentByName.get(name));
  }

  send({
    type: "diff",
    added,
    modified,
    deleted,
    incoming: { abilities: incoming, generatedAt: new Date().toISOString() },
  });
}

// ─── pokemon-list sync ────────────────────────────────────────────────────────

async function syncPokemonList(send: SendFn) {
  send({ type: "progress", message: "Fetching Pokémon list from PokeAPI…" });
  const POKEAPI = "https://pokeapi.co/api/v2";

  type CurrentPokemonEntry = {
    id: number;
    technicalName: string;
    alternativeTechnicalNames?: string[];
    types?: string[];
    generation?: number;
    isLegendary?: boolean;
    sprites?: {
      normal?: { default?: string; alternatives?: string[] };
      shiny?: { default?: string; alternatives?: string[] };
    };
  };

  const getTechnicalNames = (pokemon: {
    technicalName: string;
    alternativeTechnicalNames?: string[];
  }) => [pokemon.technicalName, ...(pokemon.alternativeTechnicalNames ?? [])];

  const current = readCurrentFile<{ pokemon: CurrentPokemonEntry[] }>(
    "pokemon-list.json",
  );
  const currentPokemon = current?.pokemon ?? [];
  const currentByCanonicalName = new Map(
    currentPokemon.map((p) => [p.technicalName, p]),
  );
  const currentByAnyName = new Map<string, CurrentPokemonEntry>();
  for (const pokemon of currentPokemon) {
    for (const technicalName of getTechnicalNames(pokemon)) {
      currentByAnyName.set(technicalName, pokemon);
    }
  }

  const listData = await fetchJson<{
    count: number;
    results: { name: string }[];
  }>(`${POKEAPI}/pokemon?limit=2000`);

  send({
    type: "progress",
    message: `Found ${listData.results.length} Pokémon — fetching details…`,
    current: 0,
    total: listData.results.length,
  });

  const incomingByCanonicalName = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < listData.results.length; i++) {
    const p = listData.results[i];

    const details = await fetchJson<{
      id: number;
      name: string;
      types: { type: { name: string } }[];
      sprites: { front_default: string | null };
      species: { url: string };
    }>(`${POKEAPI}/pokemon/${p.name}`);

    const species = await fetchJson<{
      is_legendary: boolean;
      is_mythical: boolean;
      generation: { name: string };
      names: { language: { name: string }; name: string }[];
    }>(details.species.url);

    const genMatch = species.generation.name.match(/generation-([ivxlcdm]+)/i);
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
    const generation = genMatch ? (genMap[genMatch[1].toLowerCase()] ?? 0) : 0;

    const names: Record<string, string> = {};
    for (const n of species.names) {
      if (n.language.name === "fr" || n.language.name === "en") {
        names[n.language.name] = n.name;
      }
    }

    const staticNormalUrl =
      details.sprites.front_default ??
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${details.id}.png`;
    const staticShinyUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${details.id}.png`;

    const existing = currentByAnyName.get(p.name);
    const canonicalName = existing?.technicalName ?? details.name;
    const previousEntry = incomingByCanonicalName.get(canonicalName) as
      | {
          id: number;
          technicalName: string;
          alternativeTechnicalNames?: string[];
          names: Record<string, string>;
          types: string[];
          isLegendary: boolean;
          generation: number;
          sprites: {
            normal: { default: string; alternatives: string[] };
            shiny: { default: string; alternatives: string[] };
          };
        }
      | undefined;
    const alternativeTechnicalNames = Array.from(
      new Set([
        ...(existing?.alternativeTechnicalNames ?? []),
        ...(previousEntry?.alternativeTechnicalNames ?? []),
        ...(canonicalName !== details.name ? [details.name] : []),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    incomingByCanonicalName.set(canonicalName, {
      id: existing?.id ?? previousEntry?.id ?? details.id,
      technicalName: canonicalName,
      alternativeTechnicalNames,
      names,
      types:
        existing?.types ??
        previousEntry?.types ??
        details.types.map((t) => t.type.name),
      isLegendary:
        (existing?.isLegendary ??
          previousEntry?.isLegendary ??
          species.is_legendary) ||
        species.is_mythical,
      generation:
        existing?.generation ?? previousEntry?.generation ?? generation,
      sprites: {
        normal: {
          default:
            existing?.sprites?.normal?.default ??
            previousEntry?.sprites.normal.default ??
            staticNormalUrl,
          alternatives:
            existing?.sprites?.normal?.alternatives ??
            previousEntry?.sprites.normal.alternatives ??
            [],
        },
        shiny: {
          default:
            existing?.sprites?.shiny?.default ??
            previousEntry?.sprites.shiny.default ??
            staticShinyUrl,
          alternatives:
            existing?.sprites?.shiny?.alternatives ??
            previousEntry?.sprites.shiny.alternatives ??
            [],
        },
      },
    });

    if ((i + 1) % 50 === 0 || i + 1 === listData.results.length) {
      send({
        type: "progress",
        message: `Fetched ${i + 1}/${listData.results.length} Pokémon`,
        current: i + 1,
        total: listData.results.length,
      });
    }
  }

  const incoming = Array.from(incomingByCanonicalName.values());

  const added: unknown[] = [];
  const modified: unknown[] = [];
  const deleted: unknown[] = [];

  for (const p of incoming as {
    technicalName: string;
    id: number;
    alternativeTechnicalNames?: string[];
    types?: string[];
    generation?: number;
    isLegendary?: boolean;
  }[]) {
    const cur = currentByCanonicalName.get(p.technicalName) as
      | {
          id: number;
          alternativeTechnicalNames?: string[];
          types: string[];
          generation: number;
          isLegendary: boolean;
        }
      | undefined;
    if (!cur) {
      added.push(p);
    } else {
      // Only flag as modified if core fields changed (ignore sprite alternatives)
      const currentAlternativeTechnicalNames = [
        ...(cur.alternativeTechnicalNames ?? []),
      ].sort();
      const incomingAlternativeTechnicalNames = [
        ...(p.alternativeTechnicalNames ?? []),
      ].sort();
      const coreChanged =
        cur.id !== p.id ||
        cur.types?.join(",") !== p.types?.join(",") ||
        cur.generation !== p.generation ||
        cur.isLegendary !== p.isLegendary ||
        currentAlternativeTechnicalNames.join(",") !==
          incomingAlternativeTechnicalNames.join(",");
      if (coreChanged) {
        modified.push({ current: cur, incoming: p });
      }
    }
  }

  const incomingNames = new Set(
    (incoming as { technicalName: string }[]).map((p) => p.technicalName),
  );
  for (const [technicalName, pokemon] of currentByCanonicalName) {
    if (!incomingNames.has(technicalName)) deleted.push(pokemon);
  }

  send({
    type: "diff",
    added,
    modified,
    deleted,
    incoming: {
      pokemon: incoming,
      generatedAt: new Date().toISOString(),
      totalCount: incoming.length,
    },
  });
}

// ─── regions sync ────────────────────────────────────────────────────────────

async function syncRegions(send: SendFn) {
  send({ type: "progress", message: "📍 Fetching regions list from PokeAPI…" });
  const POKEAPI = "https://pokeapi.co/api/v2";

  const current = readCurrentFile<{ regions: { name: string }[] }>(
    "regions.json",
  );
  const currentByName = new Map(
    (current?.regions ?? []).map((r) => [r.name, r]),
  );

  const regionList = await fetchJson<{
    results: { name: string; url: string }[];
  }>(`${POKEAPI}/region`);

  send({
    type: "progress",
    message: `✓ Found ${regionList.results.length} regions – fetching details…`,
    current: 0,
    total: regionList.results.length,
  });

  const incomingRegions: unknown[] = [];

  for (let rIdx = 0; rIdx < regionList.results.length; rIdx++) {
    const r = regionList.results[rIdx];
    send({
      type: "progress",
      message: `🌎 Region ${rIdx + 1}/${regionList.results.length}: ${r.name}…`,
      current: rIdx,
      total: regionList.results.length,
    });

    const regionData = await fetchJson<{
      id: number;
      name: string;
      locations: { name: string }[];
      names: { language: { name: string }; name: string }[];
    }>(`${POKEAPI}/region/${r.name}`, 100);

    const regionNames: Record<string, string> = {};
    for (const n of regionData.names) {
      if (n.language.name === "fr" || n.language.name === "en") {
        regionNames[n.language.name] = n.name;
      }
    }

    send({
      type: "progress",
      message: `  → ${regionData.locations.length} locations found`,
    });

    const locations: unknown[] = [];
    for (let locIdx = 0; locIdx < regionData.locations.length; locIdx++) {
      const loc = regionData.locations[locIdx];
      send({
        type: "progress",
        message: `    🏙️ Location ${locIdx + 1}/${regionData.locations.length}: ${loc.name}`,
      });

      const locData = await fetchJson<{
        id: number;
        name: string;
        areas?: { name: string }[];
        names: { language: { name: string }; name: string }[];
      }>(`${POKEAPI}/location/${loc.name}`, 100);

      const locNames: Record<string, string> = {};
      for (const n of locData.names) {
        if (n.language.name === "fr" || n.language.name === "en") {
          locNames[n.language.name] = n.name;
        }
      }

      const areas: unknown[] = [];
      if (locData.areas && locData.areas.length > 0) {
        send({
          type: "progress",
          message: `      📍 ${locData.areas.length} areas in ${loc.name}`,
        });

        for (let areaIdx = 0; areaIdx < locData.areas.length; areaIdx++) {
          const area = locData.areas[areaIdx];
          const areaData = await fetchJson<{
            id: number;
            name: string;
            names: { language: { name: string }; name: string }[];
          }>(`${POKEAPI}/location-area/${area.name}`, 150); // 150ms delay to avoid rate limit

          const areaNames: Record<string, string> = {};
          for (const n of areaData.names ?? []) {
            if (n.language.name === "fr" || n.language.name === "en") {
              areaNames[n.language.name] = n.name;
            }
          }
          areas.push({
            id: areaData.id,
            name: areaData.name,
            names: areaNames,
          });

          if ((areaIdx + 1) % 10 === 0) {
            send({
              type: "progress",
              message: `        → ${areaIdx + 1}/${locData.areas.length} areas processed`,
            });
          }
        }
      }

      locations.push({
        id: locData.id,
        name: locData.name,
        names: locNames,
        areas,
      });
    }

    incomingRegions.push({
      id: regionData.id,
      name: regionData.name,
      names: regionNames,
      locations,
    });

    send({
      type: "progress",
      message: `✓ Region ${r.name} done (${locations.length} locations)`,
      current: rIdx + 1,
      total: regionList.results.length,
    });
  }

  const added: unknown[] = [];
  const modified: unknown[] = [];
  const deleted: unknown[] = [];

  for (const r of incomingRegions as { name: string }[]) {
    if (!currentByName.has(r.name)) {
      added.push(r);
    } else if (
      JSON.stringify(currentByName.get(r.name)) !== JSON.stringify(r)
    ) {
      modified.push({ current: currentByName.get(r.name), incoming: r });
    }
  }
  const incomingNames = new Set(
    (incomingRegions as { name: string }[]).map((r) => r.name),
  );
  for (const [name] of currentByName) {
    if (!incomingNames.has(name)) deleted.push(currentByName.get(name));
  }

  send({
    type: "progress",
    message: `📊 Diff: +${added.length} | ~${modified.length} | -${deleted.length}`,
  });

  send({
    type: "diff",
    added,
    modified,
    deleted,
    incoming: {
      regions: incomingRegions,
      generatedAt: new Date().toISOString(),
    },
  });
}

// ─── animated-sprites sync ───────────────────────────────────────────────────

async function syncAnimatedSprites(send: SendFn) {
  type PokemonListEntry = {
    id: number;
    technicalName: string;
    alternativeTechnicalNames?: string[];
    generation: number;
    sprite?: string;
    sprites?: {
      normal?: { default?: string; alternatives?: string[] };
      shiny?: { default?: string; alternatives?: string[] };
    };
  };

  const current = readCurrentFile<{
    generatedAt?: string;
    totalCount?: number;
    pokemon: PokemonListEntry[];
  }>("pokemon-list.json");

  if (!current?.pokemon?.length) {
    throw new Error("pokemon-list.json est introuvable ou invalide.");
  }

  send({
    type: "progress",
    message: "Préparation du merge des sprites animés…",
  });

  const incoming = await mergeAnimatedSpritesIntoPokemonList(
    current,
    (message, currentStep, totalSteps) => {
      send({
        type: "progress",
        message,
        current: currentStep,
        total: totalSteps,
      });
    },
  );

  const currentByName = new Map(
    current.pokemon.map((pokemon) => [pokemon.technicalName, pokemon]),
  );
  const incomingByName = new Map(
    incoming.pokemon.map((pokemon) => [pokemon.technicalName, pokemon]),
  );

  const added: PokemonListEntry[] = [];
  const modified: Array<{
    current: PokemonListEntry;
    incoming: PokemonListEntry;
  }> = [];
  const deleted: PokemonListEntry[] = [];

  for (const pokemon of incoming.pokemon) {
    const currentPokemon = currentByName.get(pokemon.technicalName);
    if (!currentPokemon) {
      added.push(pokemon);
      continue;
    }

    if (JSON.stringify(currentPokemon) !== JSON.stringify(pokemon)) {
      modified.push({ current: currentPokemon, incoming: pokemon });
    }
  }

  for (const pokemon of current.pokemon) {
    if (!incomingByName.has(pokemon.technicalName)) {
      deleted.push(pokemon);
    }
  }

  send({
    type: "diff",
    added,
    modified,
    deleted,
    incoming,
  });
}

// ─── Generic diff helper ──────────────────────────────────────────────────────

function diffObjects(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
) {
  const added: unknown[] = [];
  const modified: unknown[] = [];
  const deleted: unknown[] = [];

  for (const [key, value] of Object.entries(incoming)) {
    if (!(key in current)) {
      added.push({ key, value });
    } else if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
      modified.push({ key, current: current[key], incoming: value });
    }
  }
  for (const key of Object.keys(current)) {
    if (!(key in incoming)) {
      deleted.push({ key, value: current[key] });
    }
  }

  return { added, modified, deleted };
}
