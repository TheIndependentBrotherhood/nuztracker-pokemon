import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GAME_VERSIONS } from "../src/lib/game-catalog.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataRoot = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const mapSource = "https://raw.githubusercontent.com/pret/pokeplatinum/main/generated/map_headers.txt";

function csv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(field); field = "";
      if (char === "\n") { rows.push(row); row = []; }
    } else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("The reference CSV contains an unterminated quote.");
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((entry) => entry.some(Boolean)).map((entry) => {
    if (entry.length !== headers.length) throw new Error("The reference CSV has inconsistent columns.");
    return Object.fromEntries(headers.map((name, index) => [name, entry[index]]));
  });
}

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Reference download failed: ${response.status} ${url}`);
  return response.text();
}

const names = ["versions", "version_groups", "locations", "location_names", "location_areas", "encounters", "encounter_slots", "encounter_methods", "encounter_condition_value_map", "encounter_condition_values"];
const tables = Object.fromEntries(await Promise.all(names.map(async (name) => [name, csv(await download(`${dataRoot}/${name}.csv`))])));
const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
const versions = byId(tables.versions), groups = byId(tables.version_groups);
const locations = byId(tables.locations), areas = byId(tables.location_areas);
const slots = byId(tables.encounter_slots), methods = byId(tables.encounter_methods);
const conditionValues = byId(tables.encounter_condition_values);
const knownGames = new Set(GAME_VERSIONS.map((game) => game.id));
const gameForVersion = (version) => {
  const group = groups.get(version.version_group_id)?.identifier;
  return group === "firered-leafgreen" ? version.identifier : group === "black-2-white-2" ? "black2-white2" : group;
};
const conditions = new Map();
for (const row of tables.encounter_condition_value_map) {
  const entries = conditions.get(row.encounter_id) ?? [];
  const value = conditionValues.get(row.encounter_condition_value_id);
  if (!value) throw new Error("An encounter condition is missing its reference.");
  entries.push(value.identifier);
  conditions.set(row.encounter_id, entries);
}
const englishNames = new Map(tables.location_names.filter((row) => row.local_language_id === "9").map((row) => [row.location_id, row.name]));
const collected = new Map();
for (const encounter of tables.encounters) {
  const version = versions.get(encounter.version_id);
  const game = version && gameForVersion(version);
  if (!knownGames.has(game)) continue;
  const area = areas.get(encounter.location_area_id);
  const location = area && locations.get(area.location_id);
  const slot = slots.get(encounter.encounter_slot_id);
  const method = slot && methods.get(slot.encounter_method_id);
  if (!area || !location || !slot || !method) throw new Error("An encounter is missing its location or method.");
  const key = `${game}:${area.id}`;
  let target = collected.get(key);
  if (!target) {
    target = {
      game, locationId: location.identifier,
      areaId: `${location.identifier}-${area.identifier || "area"}`,
      name: englishNames.get(location.id) || location.identifier,
      area: area.identifier.replaceAll("-", " "),
      entries: new Map(),
    };
    collected.set(key, target);
  }
  const row = {
    pokemonId: Number(encounter.pokemon_id), version: version.identifier,
    method: method.identifier, minLevel: Number(encounter.min_level), maxLevel: Number(encounter.max_level),
    conditions: (conditions.get(encounter.id) ?? []).sort(),
    chance: Number(slot.rarity),
  };
  const entryKey = JSON.stringify(row);
  if (row.chance < 0 || row.chance > 100) throw new Error("An original encounter-slot chance is outside 0-100%.");
  target.entries.set(entryKey, row);
}
const references = [...collected.values()].map((area) => ({ ...area, entries: [...area.entries.values()] }));
if (!references.some((area) => area.game === "platinum" && area.locationId === "sinnoh-route-201"))
  throw new Error("The generated reference is missing Platinum Route 201.");
const mapLines = (await download(mapSource)).trim().split(/\r?\n/);
if (mapLines[3] !== "MAP_HEADER_JUBILIFE_CITY") throw new Error("The Platinum map-header order has changed.");
const maps = mapLines.map((name) => name.replace(/^MAP_HEADER_/, "").toLowerCase().split("_").map((word) => /^\d/.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)).join(" "));
const regions = JSON.parse(await readFile(join(root, "public", "data", "regions.json"), "utf8"));
if (!regions.regions.some((region) => region.name === "sinnoh")) throw new Error("The existing Sinnoh region reference is missing.");
await writeFile(join(root, "public", "data", "game-encounters.json"), JSON.stringify({
  sources: [dataRoot, mapSource], areas: references,
}) + "\n");
await writeFile(join(root, "public", "data", "platinum-maps.json"), JSON.stringify(maps) + "\n");
console.log(`Generated ${references.length} original encounter areas and ${maps.length} Platinum map labels. No player ROM was used.`);
