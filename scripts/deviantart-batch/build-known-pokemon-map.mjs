import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const INPUT_CSV = path.join(
  ROOT_DIR,
  "scripts/deviantart-batch/entries/deviantart-resolved-map.csv",
);
const KNOWN_ANIMATED = path.join(
  ROOT_DIR,
  "public/data/animated-sprites-bw.json",
);
const KNOWN_POKEMON_LIST = path.join(ROOT_DIR, "public/data/pokemon-list.json");
const OUTPUT_JSON = path.join(
  ROOT_DIR,
  "scripts/deviantart-batch/entries/deviantart-known-pokemon-map.json",
);

function normalizePokemonName(rawName) {
  return String(rawName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
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
  return values;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = parseCsvLine(lines[i]);
    const row = {};

    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = (raw[col] || "").trim();
    }

    rows.push(row);
  }

  return rows;
}

const NOISE_SUFFIX_PATTERN =
  /-(front|back|sprite|sprites|animated|animation|anim|icon|gif|bw|bandw|style|v2|version|pokemon|black|white|read|description|new|form|forms|hgss|oras|xy|sm|swsh|sword|resolution|meteor|core|red|blue|female|male|starter)$/;

function removeNoiseSuffixes(value) {
  let prev;
  let current = value;
  do {
    prev = current;
    current = current.replace(NOISE_SUFFIX_PATTERN, "");
  } while (current !== prev);
  return current.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const MANUAL_NAME_ALIASES = {
  // Japanese names
  kirikizan: "bisharp",
  denchura: "galvantula",
  dokkora: "timburr",
  "ub-assembly": "stakataka",
  // Typos
  eeeve: "eevee",
  chestnaught: "chesnaught",
  pallosand: "palossand",
  phanphy: "phanpy",
  ninetails: "ninetales",
  pumkaboo: "pumpkaboo-average",
  vileplum: "vileplume",
  digglett: "diglett",
  victreebell: "victreebel",
  // Apostrophe / special chars
  "farfetch-d": "farfetchd",
  // Form-only pokemon (base name → default form key)
  meloetta: "meloetta-aria",
  keldeo: "keldeo-ordinary",
  "keldeo-resolution": "keldeo-resolute",
  mimikyu: "mimikyu-disguised",
  deoxys: "deoxys-normal",
  tornadus: "tornadus-incarnate",
  thundurus: "thundurus-incarnate",
  landorus: "landorus-incarnate",
  darmanitan: "darmanitan-standard",
  giratina: "giratina-altered",
  gourgeist: "gourgeist-average",
  pumpkaboo: "pumpkaboo-average",
  aegislash: "aegislash-blade",
  "aegislash-sword": "aegislash-blade",
  minior: "minior-red-meteor",
  "minior-meteor": "minior-red-meteor",
  "basculin-blue": "basculin-blue-striped",
  zygarde: "zygarde-50",
  // Gender variants
  "nidoran-female": "nidoran-f",
  "nidoran-male": "nidoran-m",
  meowsticf: "meowstic-female",
  frillish: "frillish-male",
  jellicent: "jellicent-male",
  pyroar: "pyroar-male",
  // Form prefix swaps
  "midnight-lycanroc": "lycanroc-midnight",
  // Misc form aliases
  "aria-forme": "meloetta-aria",
};

/**
 * Direct overrides keyed by exact normalizedSource value.
 * Used for entries whose names bear no resemblance to Pokémon names
 * (e.g., artistic titles, event names, joke names).
 * Custom keys like "egg", "missingno", or "skelenox" are kept as-is in the output.
 */
const SOURCE_NAME_OVERRIDES = {
  // "Sprite Animations for sale too" → Pichu
  "sprite-animations-for-sale-too": "pichu",
  // "Goldenwoodo" (typo) → Sudowoodo
  goldenwoodo: "sudowoodo",
  // "WHERE'S LUIGI?!" → Skelénox (fr) = Duskull
  "where-s-luigi": "duskull",
  // "X and Y Countdown DAY 6" → Talonflame
  "x-and-y-countdown-day-6": "talonflame",
  // "X and Y Countdown DAY 3" → Swirlix
  "x-and-y-countdown-day-3": "swirlix",
  // "5th Gen MissingNo" → MissingNo (custom key, not a canonical Pokémon)
  "5th-gen-missingno": "missingno",
  // "A Request From xbluemorning" → Bulbasaur
  "a-request-from-xbluemorning": "bulbasaur",
  // "th3sharkk Commission and Extra" → Torchic
  "th3sharkk-commission-and-extra": "torchic",
  // "Isolde" → Arceus (Ice form sprite, only "arceus" key exists in dataset)
  isolde: "arceus",
  // "Pkmn BW - Egg Gif Sprite" → Egg (custom key, no canonical Pokémon key)
  "pkmn-bw-egg-gif-sprite": "egg",
};

const NOISE_PREFIXES =
  /^(animated|animation|shiny|pixel-art|paper-bag|breeder)-/;

function removeNoisePrefixes(value) {
  let prev;
  let current = value;
  do {
    prev = current;
    current = current.replace(NOISE_PREFIXES, "");
  } while (current !== prev);
  return current.replace(/^-|-$/g, "");
}

function buildCandidateKeys(rawName) {
  const normalized = normalizePokemonName(rawName);
  const withoutId = normalized.replace(/^\d{1,4}-/, "");

  const candidates = new Set([normalized, withoutId]);

  function addWithAlias(key) {
    if (!key) return;
    candidates.add(key);
    if (MANUAL_NAME_ALIASES[key]) candidates.add(MANUAL_NAME_ALIASES[key]);
  }

  // Step through suffix removals one at a time, keeping each intermediate.
  function addAllSuffixSteps(start) {
    let current = start;
    addWithAlias(current);
    while (true) {
      const next = current
        .replace(NOISE_SUFFIX_PATTERN, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (next === current) break;
      addWithAlias(next);
      current = next;
    }
    return current;
  }

  const base = addAllSuffixSteps(withoutId);

  if (base.includes("alolan-")) {
    candidates.add(base.replace("alolan-", "") + "-alola");
  }
  if (base.includes("galarian-")) {
    candidates.add(base.replace("galarian-", "") + "-galar");
  }
  if (base.includes("hisuian-")) {
    candidates.add(base.replace("hisuian-", "") + "-hisui");
  }
  if (base.includes("paldean-")) {
    candidates.add(base.replace("paldean-", "") + "-paldea");
  }

  // Support concatenated regional forms like "alolansandshrew".
  const compactAlola = base.match(/^alolan([a-z0-9-]+)$/);
  if (compactAlola) {
    candidates.add(`${compactAlola[1]}-alola`);
    candidates.add(compactAlola[1]);
  }

  const compactGalar = base.match(/^galarian([a-z0-9-]+)$/);
  if (compactGalar) {
    candidates.add(`${compactGalar[1]}-galar`);
    candidates.add(compactGalar[1]);
  }

  const compactHisui = base.match(/^hisuian([a-z0-9-]+)$/);
  if (compactHisui) {
    candidates.add(`${compactHisui[1]}-hisui`);
    candidates.add(compactHisui[1]);
  }

  const compactPaldea = base.match(/^paldean([a-z0-9-]+)$/);
  if (compactPaldea) {
    candidates.add(`${compactPaldea[1]}-paldea`);
    candidates.add(compactPaldea[1]);
  }

  const megaMatch = base.match(/^mega-(.+)$/);
  if (megaMatch) {
    candidates.add(`${megaMatch[1]}-mega`);
  }

  const numberedMega = withoutId.match(/^mega-(.+)$/);
  if (numberedMega) {
    candidates.add(`${numberedMega[1]}-mega`);
  }

  const unownLetter = base.match(/^unown-([a-z])(?:-|$)/);
  if (unownLetter) {
    candidates.add(`unown-${unownLetter[1]}`);
  }

  if (base.includes("unbound") && base.includes("hoopa")) {
    candidates.add("hoopa-unbound");
  }

  if (base.includes("zygarde") && base.includes("100")) {
    candidates.add("zygarde-100");
  }

  if (base.includes("kommo-o")) candidates.add("kommo-o");
  if (base.includes("ho-oh")) candidates.add("ho-oh");
  if (base.includes("porygon-z")) candidates.add("porygon-z");

  // Strip noise prefixes and process again.
  const baseNoPfx = removeNoisePrefixes(base);
  if (baseNoPfx && baseNoPfx !== base) {
    addAllSuffixSteps(baseNoPfx);
  }

  return Array.from(candidates).filter(Boolean);
}

function extractDexId(rawName, alt) {
  const fromName = String(rawName || "").match(/^(\d{1,4})-/);
  if (fromName) return Number(fromName[1]);

  const fromAlt = String(alt || "").match(/^(\d{1,4})[.\-\s]/);
  if (fromAlt) return Number(fromAlt[1]);

  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickBestKnownKey(
  candidates,
  normalizedSource,
  knownByName,
  knownNames,
  baseByDexId,
  dexId,
) {
  for (const candidate of candidates) {
    if (knownByName.has(candidate)) return candidate;
  }

  // Fallback: detect a known name inside the noisy source slug using word boundaries.
  const source = normalizedSource || "";
  let best = null;

  for (const known of knownNames) {
    if (!known || known.length < 3) continue;
    const re = new RegExp(`(^|-)${escapeRegExp(known)}(-|$)`);
    if (re.test(source)) {
      if (!best || known.length > best.length) {
        best = known;
      }
    }
  }

  if (best) return best;

  // Secondary strategy: if we know the dex id, bind to the canonical base species.
  if (dexId !== null && baseByDexId.has(dexId)) {
    return baseByDexId.get(dexId);
  }

  return null;
}

function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    throw new Error(`CSV introuvable: ${INPUT_CSV}`);
  }
  if (!fs.existsSync(KNOWN_ANIMATED)) {
    throw new Error(`Fichier connu introuvable: ${KNOWN_ANIMATED}`);
  }
  if (!fs.existsSync(KNOWN_POKEMON_LIST)) {
    throw new Error(`Fichier connu introuvable: ${KNOWN_POKEMON_LIST}`);
  }

  const csvRows = parseCsv(fs.readFileSync(INPUT_CSV, "utf-8"));
  const animatedData = JSON.parse(fs.readFileSync(KNOWN_ANIMATED, "utf-8"));
  const pokemonListData = JSON.parse(
    fs.readFileSync(KNOWN_POKEMON_LIST, "utf-8"),
  );

  const knownByName = new Set();
  const knownNames = [];
  const knownByDexId = new Map();

  for (const sprite of animatedData.sprites || []) {
    const name = normalizePokemonName(sprite.name);
    if (!name) continue;
    if (!knownByName.has(name)) {
      knownByName.add(name);
      knownNames.push(name);
    }

    if (!knownByDexId.has(sprite.id)) {
      knownByDexId.set(sprite.id, new Set());
    }
    knownByDexId.get(sprite.id).add(name);
  }

  const baseByDexId = new Map();
  for (const pokemon of pokemonListData.pokemon || []) {
    const name = normalizePokemonName(pokemon.name);
    if (!name) continue;
    if (!knownByName.has(name)) {
      knownByName.add(name);
      knownNames.push(name);
    }
    if (!baseByDexId.has(pokemon.id)) {
      baseByDexId.set(pokemon.id, name);
    }
  }

  const mapping = {};
  const unmatched = [];

  for (const row of csvRows) {
    if (row.status && row.status !== "ok" && row.status !== "skipped") {
      continue;
    }

    const sourceName = row.name || "";
    const normalizedSource = normalizePokemonName(sourceName);
    const alt = row.alt || "";
    const dexId = extractDexId(sourceName, alt);
    const candidates = buildCandidateKeys(sourceName);

    // Check direct overrides first (entries whose titles bear no resemblance to Pokémon names).
    const overrideKey = SOURCE_NAME_OVERRIDES[normalizedSource];
    const bestKnownKey =
      overrideKey ||
      pickBestKnownKey(
        candidates,
        normalizedSource,
        knownByName,
        knownNames,
        baseByDexId,
        dexId,
      );

    const payload = {
      alt,
      sourceName,
      normalizedSource,
      file: row.file || "",
      url: row.url || "",
      dexId,
      candidates,
    };

    if (!bestKnownKey) {
      unmatched.push(payload);
      continue;
    }

    if (!mapping[bestKnownKey]) {
      mapping[bestKnownKey] = [];
    }

    // Keep all sprites for the same Pokémon. Only avoid exact duplicate URL entries.
    const exists = mapping[bestKnownKey].some(
      (item) => item.url === payload.url,
    );
    if (!exists) {
      mapping[bestKnownKey].push(payload);
    }
  }

  const allMappedSpritesCount = Object.values(mapping).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  const result = {
    generatedAt: new Date().toISOString(),
    source: {
      csv: path.relative(ROOT_DIR, INPUT_CSV).replaceAll("\\", "/"),
      knownAnimated: path
        .relative(ROOT_DIR, KNOWN_ANIMATED)
        .replaceAll("\\", "/"),
      knownPokemonList: path
        .relative(ROOT_DIR, KNOWN_POKEMON_LIST)
        .replaceAll("\\", "/"),
    },
    stats: {
      csvRows: csvRows.length,
      knownKeysMatched: Object.keys(mapping).length,
      mappedSprites: allMappedSpritesCount,
      unmatchedSprites: unmatched.length,
    },
    mapping,
    unmatched,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2), "utf-8");

  console.log(`JSON généré: ${OUTPUT_JSON}`);
  console.log(
    `rows=${result.stats.csvRows} mappedSprites=${result.stats.mappedSprites} unmatched=${result.stats.unmatchedSprites} keys=${result.stats.knownKeysMatched}`,
  );
}

main();
