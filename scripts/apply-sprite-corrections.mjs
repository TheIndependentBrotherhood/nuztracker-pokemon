// Script to apply sprite-pokemon-corrections.json to the correct source files
// - wixmp.com URLs → deviantart-known-pokemon-map.json (move entry from fromKey to toKey)
// - raw.githubusercontent.com/PokeAPI URLs → pokemon-list.json (rename entry or remove duplicate)

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const CORRECTIONS_PATH =
  "c:/Users/Pomme/Downloads/sprite-pokemon-corrections.json";
const DEVIANTART_MAP_PATH = resolve(
  "public/data/deviantart-known-pokemon-map.json",
);
const POKEMON_LIST_PATH = resolve("public/data/pokemon-list.json");

const corrections = JSON.parse(
  readFileSync(CORRECTIONS_PATH, "utf8"),
).corrections;

// Deduplicate by URL
const seen = new Set();
const deduped = corrections.filter((c) => {
  if (seen.has(c.url)) return false;
  seen.add(c.url);
  return true;
});
console.log(
  `Loaded ${corrections.length} corrections, ${deduped.length} unique after dedup`,
);

// --- DeviantArt corrections (wixmp.com) ---
const deviantartCorrections = deduped.filter((c) =>
  c.url.includes("wixmp.com"),
);
const pokeapiCorrections = deduped.filter((c) =>
  c.url.includes("raw.githubusercontent.com/PokeAPI"),
);
const otherCorrections = deduped.filter(
  (c) =>
    !c.url.includes("wixmp.com") &&
    !c.url.includes("raw.githubusercontent.com/PokeAPI"),
);

console.log(`\nDeviantArt corrections: ${deviantartCorrections.length}`);
console.log(`PokeAPI static corrections: ${pokeapiCorrections.length}`);
if (otherCorrections.length > 0) {
  console.log(
    `⚠️  Other corrections (unhandled): ${otherCorrections.length}`,
    otherCorrections.map((c) => c.url),
  );
}

// Process DeviantArt corrections
const daMap = JSON.parse(readFileSync(DEVIANTART_MAP_PATH, "utf8"));
let daApplied = 0;
let daNotFound = 0;

for (const correction of deviantartCorrections) {
  const { url, fromPokemonKey, toPokemonKey } = correction;

  // Find the sprite in the fromKey array
  const fromArray = daMap.mapping[fromPokemonKey];
  if (!fromArray) {
    console.log(
      `  DA NOT FOUND: key "${fromPokemonKey}" does not exist in mapping`,
    );
    daNotFound++;
    continue;
  }

  const entryIndex = fromArray.findIndex((e) => e.url === url);
  if (entryIndex === -1) {
    console.log(
      `  DA NOT FOUND: url not found in "${fromPokemonKey}" array: ${url.substring(0, 60)}...`,
    );
    daNotFound++;
    continue;
  }

  // Remove from fromKey array
  const [entry] = fromArray.splice(entryIndex, 1);

  // Clean up empty array
  if (fromArray.length === 0) {
    delete daMap.mapping[fromPokemonKey];
  }

  // Add to toKey array
  if (!daMap.mapping[toPokemonKey]) {
    daMap.mapping[toPokemonKey] = [];
  }
  daMap.mapping[toPokemonKey].push(entry);

  console.log(
    `  DA ✓ "${fromPokemonKey}" → "${toPokemonKey}" [${entry.sourceName || entry.file || "?"}]`,
  );
  daApplied++;
}

// Sort keys alphabetically for consistency
daMap.mapping = Object.fromEntries(
  Object.entries(daMap.mapping).sort(([a], [b]) => a.localeCompare(b)),
);

writeFileSync(DEVIANTART_MAP_PATH, JSON.stringify(daMap, null, 2), "utf8");
console.log(
  `\nDeviantArt: applied=${daApplied}, not_found=${daNotFound} → saved to ${DEVIANTART_MAP_PATH}`,
);

// Process PokeAPI static corrections (pokemon-list.json)
const pokemonList = JSON.parse(readFileSync(POKEMON_LIST_PATH, "utf8"));
const list = pokemonList.pokemon;

let plApplied = 0;
let plNotFound = 0;
let plRemoved = 0;

for (const correction of pokeapiCorrections) {
  const { url, fromPokemonKey, toPokemonKey } = correction;

  // Find entry by name and verify URL
  const entryIndex = list.findIndex((p) => p.name === fromPokemonKey);
  if (entryIndex === -1) {
    console.log(
      `  PL NOT FOUND: name "${fromPokemonKey}" not in pokemon-list.json`,
    );
    plNotFound++;
    continue;
  }

  const entry = list[entryIndex];
  if (entry.sprite !== url) {
    console.log(
      `  PL URL MISMATCH: "${fromPokemonKey}" has sprite "${entry.sprite}" but correction URL is "${url}"`,
    );
    // Still proceed with rename, URL mismatch is just a warning
  }

  // Check if toPokemonKey already exists
  const toEntryIndex = list.findIndex((p) => p.name === toPokemonKey);

  if (toEntryIndex !== -1) {
    // toPokemonKey already exists → remove the fromKey entry (it's a redundant form)
    list.splice(entryIndex, 1);
    console.log(
      `  PL ✓ removed "${fromPokemonKey}" (duplicate of existing "${toPokemonKey}")`,
    );
    plRemoved++;
  } else {
    // Rename fromKey to toKey
    entry.name = toPokemonKey;
    console.log(`  PL ✓ renamed "${fromPokemonKey}" → "${toPokemonKey}"`);
    plApplied++;
  }
}

writeFileSync(POKEMON_LIST_PATH, JSON.stringify(pokemonList, null, 2), "utf8");
console.log(
  `\nPokemon List: renamed=${plApplied}, removed=${plRemoved}, not_found=${plNotFound} → saved to ${POKEMON_LIST_PATH}`,
);

console.log("\n=== SUMMARY ===");
console.log(`DeviantArt map: ${daApplied} applied, ${daNotFound} not found`);
console.log(
  `Pokemon list:   ${plApplied} renamed, ${plRemoved} removed as duplicate, ${plNotFound} not found`,
);
