import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { mergeAnimatedSpritesIntoPokemonList } from "@/src/lib/server/animatedSpritesMerge";

const DATA_DIR = path.join(process.cwd(), "public", "data");

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
  { params }: { params: { step: string } },
) {
  const { step } = params;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
        );
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
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
  return res.json() as Promise<T>;
}

type SendFn = (data: unknown) => void;

// ─── type-charts sync ─────────────────────────────────────────────────────────

async function syncTypeCharts(send: SendFn) {
  send({ type: "progress", message: "Fetching types from PokeAPI…" });

  const POKEAPI = "https://pokeapi.co/api/v2";

  const typeList = await fetchJson<{
    results: { name: string; url: string }[];
  }>(`${POKEAPI}/type?limit=100`);
  send({
    type: "progress",
    message: `Found ${typeList.results.length} types`,
    current: 0,
    total: typeList.results.length,
  });

  const current = readCurrentFile<Record<string, unknown>>("type-charts.json");

  const incoming: Record<string, unknown> = {};
  for (let i = 0; i < typeList.results.length; i++) {
    const typeInfo = await fetchJson<{
      name: string;
      damage_relations: {
        double_damage_from: { name: string }[];
        half_damage_from: { name: string }[];
        no_damage_from: { name: string }[];
        double_damage_to: { name: string }[];
      };
      names: { language: { name: string }; name: string }[];
    }>(typeList.results[i].url);

    const names: Record<string, string> = {};
    for (const n of typeInfo.names) {
      if (n.language.name === "fr" || n.language.name === "en") {
        names[n.language.name] = n.name;
      }
    }

    incoming[typeInfo.name] = {
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

    send({
      type: "progress",
      message: `Fetched type: ${typeInfo.name}`,
      current: i + 1,
      total: typeList.results.length,
    });
  }

  const diff = diffObjects(
    (current as Record<string, unknown> | null) ?? {},
    incoming,
  );
  send({ type: "diff", ...diff, incoming });
}

// ─── type-sprites sync ────────────────────────────────────────────────────────

async function syncTypeSprites(send: SendFn) {
  send({ type: "progress", message: "Fetching type sprites from PokeAPI…" });
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
    }>(typeList.results[i].url);

    incomingTypes.push({
      id: typeData.id,
      name: typeData.name,
      sprites: typeData.sprites,
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

async function syncAbilities(send: SendFn) {
  send({ type: "progress", message: "Fetching abilities from PokeAPI…" });
  const POKEAPI = "https://pokeapi.co/api/v2";

  const abilityList = await fetchJson<{
    results: { name: string; url: string }[];
    count: number;
  }>(`${POKEAPI}/ability?limit=400`);

  const current = readCurrentFile<{ abilities: unknown[] }>(
    "abilities-immunity.json",
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
      effect_entries: { effect: string; language: { name: string } }[];
    }>(abilityList.results[i].url);

    const effectEntry = abilityData.effect_entries.find(
      (e) => e.language.name === "en",
    );

    incoming.push({
      id: abilityData.id,
      name: abilityData.name,
      generation: abilityData.generation.name,
      effect: effectEntry?.effect ?? "",
    });

    if ((i + 1) % 20 === 0) {
      send({
        type: "progress",
        message: `Fetched ${i + 1}/${abilityList.results.length} abilities`,
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
    name: string;
    alternativeNames?: string[];
    types?: string[];
    generation?: number;
    isLegendary?: boolean;
    sprites?: {
      normal?: { default?: string; alternatives?: string[] };
      shiny?: { default?: string; alternatives?: string[] };
    };
  };

  const getTechnicalNames = (pokemon: {
    name: string;
    alternativeNames?: string[];
  }) => [pokemon.name, ...(pokemon.alternativeNames ?? [])];

  const current = readCurrentFile<{ pokemon: CurrentPokemonEntry[] }>(
    "pokemon-list.json",
  );
  const currentPokemon = current?.pokemon ?? [];
  const currentByCanonicalName = new Map(
    currentPokemon.map((p) => [p.name, p]),
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
    const canonicalName = existing?.name ?? details.name;
    const previousEntry = incomingByCanonicalName.get(canonicalName) as
      | {
          id: number;
          name: string;
          alternativeNames?: string[];
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
    const alternativeNames = Array.from(
      new Set([
        ...(existing?.alternativeNames ?? []),
        ...(previousEntry?.alternativeNames ?? []),
        ...(canonicalName !== details.name ? [details.name] : []),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    incomingByCanonicalName.set(canonicalName, {
      id: existing?.id ?? previousEntry?.id ?? details.id,
      name: canonicalName,
      alternativeNames,
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
    name: string;
    id: number;
    alternativeNames?: string[];
  }[]) {
    const cur = currentByCanonicalName.get(p.name) as
      | {
          id: number;
          alternativeNames?: string[];
          types: string[];
          generation: number;
          isLegendary: boolean;
        }
      | undefined;
    if (!cur) {
      added.push(p);
    } else {
      // Only flag as modified if core fields changed (ignore sprite alternatives)
      const currentAlternativeNames = [...(cur.alternativeNames ?? [])].sort();
      const incomingAlternativeNames = [...(p.alternativeNames ?? [])].sort();
      const coreChanged =
        cur.id !== p.id ||
        cur.types?.join(",") !== (p as { types: string[] }).types.join(",") ||
        cur.generation !== (p as { generation: number }).generation ||
        cur.isLegendary !== (p as { isLegendary: boolean }).isLegendary ||
        currentAlternativeNames.join(",") !==
          incomingAlternativeNames.join(",");
      if (coreChanged) {
        modified.push({ current: cur, incoming: p });
      }
    }
  }

  const incomingNames = new Set(
    (incoming as { name: string }[]).map((p) => p.name),
  );
  for (const [name, pokemon] of currentByCanonicalName) {
    if (!incomingNames.has(name)) deleted.push(pokemon);
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
  send({ type: "progress", message: "Fetching regions from PokeAPI…" });
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
    message: `Found ${regionList.results.length} regions`,
    current: 0,
    total: regionList.results.length,
  });

  const incomingRegions: unknown[] = [];

  for (let rIdx = 0; rIdx < regionList.results.length; rIdx++) {
    const r = regionList.results[rIdx];
    send({
      type: "progress",
      message: `Processing region: ${r.name} (${rIdx + 1}/${regionList.results.length})`,
      current: rIdx + 1,
      total: regionList.results.length,
    });

    const regionData = await fetchJson<{
      id: number;
      name: string;
      locations: { name: string }[];
      names: { language: { name: string }; name: string }[];
    }>(`${POKEAPI}/region/${r.name}`);

    const regionNames: Record<string, string> = {};
    for (const n of regionData.names) {
      if (n.language.name === "fr" || n.language.name === "en") {
        regionNames[n.language.name] = n.name;
      }
    }

    const locations: unknown[] = [];
    for (const loc of regionData.locations) {
      const locData = await fetchJson<{
        id: number;
        name: string;
        areas: { name: string }[];
        names: { language: { name: string }; name: string }[];
      }>(`${POKEAPI}/location/${loc.name}`);

      const locNames: Record<string, string> = {};
      for (const n of locData.names) {
        if (n.language.name === "fr" || n.language.name === "en") {
          locNames[n.language.name] = n.name;
        }
      }

      const areas: unknown[] = [];
      for (const area of locData.areas ?? []) {
        const areaData = await fetchJson<{
          id: number;
          name: string;
          names: { language: { name: string }; name: string }[];
        }>(`${POKEAPI}/location-area/${area.name}`);

        const areaNames: Record<string, string> = {};
        for (const n of areaData.names ?? []) {
          if (n.language.name === "fr" || n.language.name === "en") {
            areaNames[n.language.name] = n.name;
          }
        }
        areas.push({ id: areaData.id, name: areaData.name, names: areaNames });
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
    name: string;
    alternativeNames?: string[];
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
    current.pokemon.map((pokemon) => [pokemon.name, pokemon]),
  );
  const incomingByName = new Map(
    incoming.pokemon.map((pokemon) => [pokemon.name, pokemon]),
  );

  const added: PokemonListEntry[] = [];
  const modified: Array<{
    current: PokemonListEntry;
    incoming: PokemonListEntry;
  }> = [];
  const deleted: PokemonListEntry[] = [];

  for (const pokemon of incoming.pokemon) {
    const currentPokemon = currentByName.get(pokemon.name);
    if (!currentPokemon) {
      added.push(pokemon);
      continue;
    }

    if (JSON.stringify(currentPokemon) !== JSON.stringify(pokemon)) {
      modified.push({ current: currentPokemon, incoming: pokemon });
    }
  }

  for (const pokemon of current.pokemon) {
    if (!incomingByName.has(pokemon.name)) {
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
