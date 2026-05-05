import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type SpriteVariant = "normal" | "shiny";

interface ExportedCorrection {
  url: string;
  file: string;
  sourceName: string | null;
  provider: string | null;
  spriteVariant?: SpriteVariant | null;
  fromPokemonKey: string;
  toPokemonKey: string;
}

interface ExportedManualAddition {
  pokemonKey: string;
  url: string;
  file: string;
  spriteVariant: SpriteVariant;
}

interface ExportedDeletedSprite {
  url: string;
  file: string;
  sourceName: string | null;
  provider: string | null;
  spriteVariant?: SpriteVariant | null;
}

interface ExportPayload {
  corrections?: ExportedCorrection[];
  manualAdditions?: ExportedManualAddition[];
  deletedSprites?: ExportedDeletedSprite[];
}

interface PokemonListEntry {
  id: number;
  name: string;
  alternativeNames?: string[];
  sprites?: {
    normal?: { default?: string; alternatives?: string[] };
    shiny?: { default?: string; alternatives?: string[] };
  };
}

interface PokemonListFile {
  generatedAt?: string;
  pokemon: PokemonListEntry[];
}

function toPokeApiShinyUrl(url: string): string {
  return url.replace("/sprites/pokemon/", "/sprites/pokemon/shiny/");
}

function inferVariant(
  url: string,
  explicit?: SpriteVariant | null,
): SpriteVariant {
  if (explicit === "normal" || explicit === "shiny") {
    return explicit;
  }
  return url.includes("/shiny/") ? "shiny" : "normal";
}

function ensureSpriteStructure(entry: PokemonListEntry) {
  const normalDefault =
    entry.sprites?.normal?.default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`;
  const shinyDefault =
    entry.sprites?.shiny?.default ?? toPokeApiShinyUrl(normalDefault);

  entry.sprites = {
    normal: {
      default: normalDefault,
      alternatives: [...(entry.sprites?.normal?.alternatives ?? [])],
    },
    shiny: {
      default: shinyDefault,
      alternatives: [...(entry.sprites?.shiny?.alternatives ?? [])],
    },
  };

  if (!entry.alternativeNames) {
    entry.alternativeNames = [];
  }
}

function getTechnicalNames(entry: PokemonListEntry): string[] {
  return [entry.name, ...(entry.alternativeNames ?? [])];
}

function addAlternative(
  entry: PokemonListEntry,
  variant: SpriteVariant,
  url: string,
): boolean {
  ensureSpriteStructure(entry);
  const bucket = entry.sprites![variant]!;
  if (bucket.default === url) {
    return false;
  }
  const filtered = bucket.alternatives!.filter((item) => item !== url);
  bucket.alternatives = [url, ...filtered];
  return true;
}

function removeUrlFromAllAlternatives(
  list: PokemonListEntry[],
  url: string,
): number {
  let removedCount = 0;

  for (const entry of list) {
    ensureSpriteStructure(entry);

    for (const variant of ["normal", "shiny"] as const) {
      const bucket = entry.sprites![variant]!;
      const next = bucket.alternatives!.filter((item) => item !== url);
      removedCount += bucket.alternatives!.length - next.length;
      bucket.alternatives = next;
    }
  }

  return removedCount;
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  yarn apply-sprite-corrections <path-to-sprite-pokemon-corrections.json>",
      "",
      "Example:",
      '  yarn apply-sprite-corrections "C:/Users/Pomme/Downloads/sprite-pokemon-corrections.json"',
    ].join("\n"),
  );
}

const inputArg = process.argv[2];

if (!inputArg || inputArg === "--help" || inputArg === "-h") {
  printUsage();
  process.exit(inputArg ? 0 : 1);
}

const correctionsPath = resolve(process.cwd(), inputArg);
const pokemonListPath = resolve(process.cwd(), "public/data/pokemon-list.json");

if (!existsSync(correctionsPath)) {
  console.error(`Correction file not found: ${correctionsPath}`);
  process.exit(1);
}

if (!existsSync(pokemonListPath)) {
  console.error(`pokemon-list.json not found: ${pokemonListPath}`);
  process.exit(1);
}

const payload = JSON.parse(
  readFileSync(correctionsPath, "utf8"),
) as ExportPayload;
const pokemonList = JSON.parse(
  readFileSync(pokemonListPath, "utf8"),
) as PokemonListFile;

const corrections = payload.corrections ?? [];
const manualAdditions = payload.manualAdditions ?? [];
const deletedSprites = payload.deletedSprites ?? [];

const entriesByName = new Map(
  pokemonList.pokemon.flatMap((entry) => {
    ensureSpriteStructure(entry);
    return getTechnicalNames(entry).map((name) => [name, entry] as const);
  }),
);

let appliedCorrections = 0;
let skippedCorrections = 0;
let appliedAdditions = 0;
let skippedAdditions = 0;
let appliedDeletions = 0;
let removedAlternativeCount = 0;

for (const correction of corrections) {
  if (correction.provider === "pokemon-list-static") {
    skippedCorrections += 1;
    continue;
  }

  const targetEntry = entriesByName.get(correction.toPokemonKey);
  if (!targetEntry) {
    console.warn(
      `SKIP correction: target pokemon not found for ${correction.url} -> ${correction.toPokemonKey}`,
    );
    skippedCorrections += 1;
    continue;
  }

  const variant = inferVariant(correction.url, correction.spriteVariant);
  removedAlternativeCount += removeUrlFromAllAlternatives(
    pokemonList.pokemon,
    correction.url,
  );
  addAlternative(targetEntry, variant, correction.url);
  appliedCorrections += 1;
}

for (const addition of manualAdditions) {
  const targetEntry = entriesByName.get(addition.pokemonKey);
  if (!targetEntry) {
    console.warn(
      `SKIP addition: target pokemon not found for ${addition.url} -> ${addition.pokemonKey}`,
    );
    skippedAdditions += 1;
    continue;
  }

  addAlternative(targetEntry, addition.spriteVariant, addition.url);
  appliedAdditions += 1;
}

for (const deleted of deletedSprites) {
  const removed = removeUrlFromAllAlternatives(
    pokemonList.pokemon,
    deleted.url,
  );
  if (removed > 0) {
    appliedDeletions += 1;
    removedAlternativeCount += removed;
  }
}

pokemonList.generatedAt = new Date().toISOString();
writeFileSync(
  pokemonListPath,
  `${JSON.stringify(pokemonList, null, 2)}\n`,
  "utf8",
);

console.log("=== APPLY SPRITE CORRECTIONS ===");
console.log(`Corrections applied: ${appliedCorrections}`);
console.log(`Corrections skipped: ${skippedCorrections}`);
console.log(`Manual additions applied: ${appliedAdditions}`);
console.log(`Manual additions skipped: ${skippedAdditions}`);
console.log(`Deleted sprite URLs applied: ${appliedDeletions}`);
console.log(`Alternative URLs removed: ${removedAlternativeCount}`);
console.log(`Updated file: ${pokemonListPath}`);
