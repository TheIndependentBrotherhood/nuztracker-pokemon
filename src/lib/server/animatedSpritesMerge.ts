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

const GEN7_ALOLAN_IDS = new Set([
  19, 20, 26, 27, 28, 37, 38, 50, 51, 52, 53, 74, 75, 76, 88, 89, 103, 105,
]);

interface SheetSpriteEntry {
  normal?: string;
  shiny?: string;
}

interface AnimatedSpriteRecord {
  id: number;
  technicalName: string;
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

export interface MergePokemonListEntry {
  id: number;
  technicalName: string;
  alternativeTechnicalNames?: string[];
  generation: number;
  sprites?: {
    normal?: {
      default?: string;
      alternatives?: string[];
      excludeUrls?: string[];
    };
    shiny?: {
      default?: string;
      alternatives?: string[];
      excludeUrls?: string[];
    };
  };
}

interface MergePokemonListFile {
  generatedAt?: string;
  totalCount?: number;
  pokemon: MergePokemonListEntry[];
}

interface ProgressReporter {
  (message: string, current?: number, total?: number): void;
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
    } catch (error) {
      if (i === retries - 1) throw error;
      const backoffMs = 1000 * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
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
  return values.map((value) => value.trim());
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

function toMegaFormKey(baseName: string): string {
  const megaSuffixMatch = baseName.match(/^(.*)-(x|y)$/i);
  if (megaSuffixMatch) {
    const root = megaSuffixMatch[1];
    const suffix = megaSuffixMatch[2].toLowerCase();
    return `${root}-mega-${suffix}`;
  }

  return `${baseName}-mega`;
}

function inferSheetKeysForRow(
  source: SheetSourceConfig,
  pokemonId: number | null,
  normalizedName: string,
  inPostMainSection: boolean,
  gen8SubSection?: "galarian" | "hisuian" | "gmax" | "other" | null,
): string[] {
  if (source.key === "google_sheet_gen6") {
    if (!inPostMainSection) return [normalizedName];
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
    if (!inPostMainSection) return [normalizedName];
    if (pokemonId !== null && GEN7_ALOLAN_IDS.has(pokemonId)) {
      return [`${normalizedName}-alola`];
    }
    return [normalizedName];
  }

  if (source.key === "google_sheet_gen8") {
    if (!inPostMainSection) return [normalizedName];
    if (gen8SubSection === "galarian") return [`${normalizedName}-galar`];
    if (gen8SubSection === "hisuian") return [`${normalizedName}-hisui`];
    if (gen8SubSection === "gmax") return [`${normalizedName}-gmax`];
    return [normalizedName];
  }

  if (source.key === "google_sheet_gen9") {
    if (!inPostMainSection) return [normalizedName];
    if (pokemonId === 194) return ["wooper-paldea"];
    if (pokemonId === 128 && normalizedName.startsWith("tauros-")) {
      return [normalizedName.replace("tauros-", "tauros-paldea-")];
    }
    return [normalizedName];
  }

  return [normalizedName];
}

async function readSheetSprites(
  source: SheetSourceConfig,
): Promise<{ map: Map<string, SheetSpriteEntry>; crossGenKeys: Set<string> }> {
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
    const normalUrlRaw = cols[2] ?? "";
    const normalUrl =
      normalUrlRaw.toLowerCase() === "unchanged" ? "" : normalUrlRaw;
    const shinyUrl = cols[4] ?? "";

    if (mainRangeStart !== -1 && pokemonId !== null) {
      if (pokemonId >= mainRangeStart && pokemonId <= mainRangeEnd) {
        hasReachedMainSection = true;
      } else if (hasReachedMainSection && pokemonId < mainRangeStart) {
        inPostMainSection = true;
      }
    }

    if (source.key === "google_sheet_gen8" && hasReachedMainSection) {
      if (gen8SubSection === null && pokemonId !== null && pokemonId < 810) {
        gen8SubSection = "galarian";
        inPostMainSection = true;
      } else if (gen8SubSection === "galarian" && pokemonId === null) {
        gen8SubSection = "hisuian";
      } else if (gen8SubSection === "hisuian" && pokemonId !== null) {
        gen8SubSection = "gmax";
      } else if (gen8SubSection === "gmax" && pokemonId === null) {
        gen8SubSection = "other";
      }
      if (gen8SubSection !== null) inPostMainSection = true;
    }

    if (!normalUrl && !shinyUrl) continue;

    const keyFromName = nameFromColumn
      ? normalizePokemonName(nameFromColumn)
      : null;
    const keyFromNormal = extractNameFromGifUrl(normalUrl);
    const keyFromShiny = extractNameFromGifUrl(shinyUrl);
    const key = keyFromName || keyFromNormal || keyFromShiny;
    if (!key) continue;

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
    if (headResponse.ok) return true;
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
      headers: { Range: "bytes=0-0" },
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
      if (itemIndex >= items.length) return;
      results[itemIndex] = await mapper(items[itemIndex], itemIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function getTechnicalNames(entry: {
  technicalName: string;
  alternativeTechnicalNames?: string[];
}): string[] {
  return [entry.technicalName, ...(entry.alternativeTechnicalNames ?? [])];
}

function ensureSpriteStructure(entry: MergePokemonListEntry) {
  const baseDefault =
    entry.sprites?.normal?.default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`;
  const shinyDefault = baseDefault.replace(
    "/sprites/pokemon/",
    "/sprites/pokemon/shiny/",
  );

  entry.sprites = {
    normal: {
      default: baseDefault,
      alternatives: [...(entry.sprites?.normal?.alternatives ?? [])],
      excludeUrls: [...(entry.sprites?.normal?.excludeUrls ?? [])],
    },
    shiny: {
      default: entry.sprites?.shiny?.default ?? shinyDefault,
      alternatives: [...(entry.sprites?.shiny?.alternatives ?? [])],
      excludeUrls: [...(entry.sprites?.shiny?.excludeUrls ?? [])],
    },
  };
}

export async function mergeAnimatedSpritesIntoPokemonList(
  pokemonListData: MergePokemonListFile,
  reportProgress?: ProgressReporter,
): Promise<MergePokemonListFile> {
  const pokemon = pokemonListData.pokemon.map((entry) => ({ ...entry }));
  pokemon.forEach(ensureSpriteStructure);

  const sheetSourcesData: Array<{
    source: SheetSourceConfig;
    map: Map<string, SheetSpriteEntry>;
    crossGenKeys: Set<string>;
  }> = [];

  for (const source of SHEET_SOURCES) {
    reportProgress?.(`Récupération de ${source.key}…`);
    const parsed = await readSheetSprites(source);
    sheetSourcesData.push({
      source,
      map: parsed.map,
      crossGenKeys: parsed.crossGenKeys,
    });
  }

  reportProgress?.(
    `Vérification des sprites animés (${pokemon.length} Pokémon)…`,
    0,
    pokemon.length,
  );

  const spriteRecords = await mapWithConcurrency(
    pokemon,
    25,
    async (entry, index): Promise<AnimatedSpriteRecord> => {
      const normalizedEntryName = normalizePokemonName(entry.technicalName);
      const isMegaOrPrimalForm =
        normalizedEntryName.includes("-mega") ||
        normalizedEntryName.includes("-primal");
      const isAlolanForm = normalizedEntryName.endsWith("-alola");
      const isGalarianForm = normalizedEntryName.endsWith("-galar");
      const isHisuianForm = normalizedEntryName.endsWith("-hisui");
      const isGmaxForm = normalizedEntryName.endsWith("-gmax");

      const sheetCandidatesForNormal = sheetSourcesData
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
          ) {
            return null;
          }

          const sheetEntry = map.get(normalizedEntryName);
          if (!sheetEntry?.normal) return null;
          return { source: source.key, url: sheetEntry.normal };
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
          ) {
            return null;
          }

          const sheetEntry = map.get(normalizedEntryName);
          if (!sheetEntry?.shiny) return null;
          return { source: source.key, url: sheetEntry.shiny };
        })
        .filter((candidate): candidate is { source: string; url: string } =>
          Boolean(candidate),
        );

      const normalCandidates = sheetCandidatesForNormal;
      const shinyCandidates = sheetCandidatesForShiny;

      let normalSelected: { source: string; url: string } | null = null;
      let shinySelected: { source: string; url: string } | null = null;

      for (const candidate of normalCandidates) {
        if (await checkUrlAvailable(candidate.url)) {
          normalSelected = candidate;
          break;
        }
      }
      for (const candidate of shinyCandidates) {
        if (await checkUrlAvailable(candidate.url)) {
          shinySelected = candidate;
          break;
        }
      }

      if ((index + 1) % 50 === 0 || index + 1 === pokemon.length) {
        reportProgress?.(
          `Sprites animés vérifiés ${index + 1}/${pokemon.length}`,
          index + 1,
          pokemon.length,
        );
      }

      return {
        id: entry.id,
        technicalName: entry.technicalName,
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

  const animatedByName = new Map<
    string,
    { normal: string | null; shiny: string | null }
  >();
  for (const sprite of spriteRecords) {
    animatedByName.set(sprite.technicalName, {
      normal: sprite.normal.available ? sprite.normal.url : null,
      shiny: sprite.shiny.available ? sprite.shiny.url : null,
    });
  }

  let normalInjected = 0;
  let shinyInjected = 0;

  for (const entry of pokemon) {
    const animated = getTechnicalNames(entry)
      .map((name) => animatedByName.get(name))
      .find((result) => Boolean(result));

    if (
      animated?.normal &&
      !entry.sprites?.normal?.alternatives?.includes(animated.normal) &&
      !entry.sprites?.normal?.excludeUrls?.includes(animated.normal)
    ) {
      entry.sprites?.normal?.alternatives?.unshift(animated.normal);
      normalInjected += 1;
    }

    if (
      animated?.shiny &&
      !entry.sprites?.shiny?.alternatives?.includes(animated.shiny) &&
      !entry.sprites?.shiny?.excludeUrls?.includes(animated.shiny)
    ) {
      entry.sprites?.shiny?.alternatives?.unshift(animated.shiny);
      shinyInjected += 1;
    }
  }

  reportProgress?.(
    `Merge terminé : ${normalInjected} normal, ${shinyInjected} shiny (Google Sheets)`,
  );

  return {
    ...pokemonListData,
    pokemon,
    generatedAt: new Date().toISOString(),
    totalCount: pokemon.length,
  };
}
