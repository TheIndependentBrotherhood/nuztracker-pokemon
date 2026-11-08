import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { downloadTables } from "./pokeapi-csv.mjs";

// Game words are keyed by in-game ids (like the Ironmon tracker language files) and fall back to English.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const languages = { 5: "fr", 9: "en" };
// Platinum first, then the other Gen 4 / Gen 3 version groups, then anything newer.
const versionGroupPreference = ["9", "8", "10", "7", "6", "5"];
const maxMoveId = 467;
const maxAbilityId = 123;
const tables = await downloadTables([
  "moves",
  "move_names",
  "move_flavor_text",
  "move_damage_classes",
  "types",
  "abilities",
  "ability_names",
  "ability_flavor_text",
  "items",
  "item_names",
  "item_flavor_text",
  "item_game_indices",
  "natures",
  "nature_names",
  "stats",
]);

const clean = (text) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\u00ad/g, "")
    .trim();

function names(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const lang = languages[row.local_language_id];
    if (!lang) continue;
    const entry = result.get(row[key]) ?? {};
    entry[lang] = clean(row.name);
    result.set(row[key], entry);
  }
  return result;
}

function flavors(rows, key, textKey = "flavor_text") {
  const rank = (group) => {
    const index = versionGroupPreference.indexOf(group);
    return index === -1 ? 100 - Number(group) / 1000 : index;
  };
  const best = new Map();
  for (const row of rows) {
    const lang = languages[row.language_id];
    if (!lang) continue;
    const id = `${row[key]}:${lang}`;
    const current = best.get(id);
    if (!current || rank(row.version_group_id) < rank(current.version_group_id))
      best.set(id, row);
  }
  const result = new Map();
  for (const row of best.values()) {
    const entry = result.get(row[key]) ?? {};
    entry[languages[row.language_id]] = clean(row[textKey]);
    result.set(row[key], entry);
  }
  return result;
}

const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
const damageClasses = byId(tables.move_damage_classes);
const types = byId(tables.types);
const stats = byId(tables.stats);

const moveNames = names(tables.move_names, "move_id");
const moveTexts = flavors(tables.move_flavor_text, "move_id");
const moves = {};
for (const move of tables.moves) {
  if (Number(move.id) > maxMoveId) continue;
  moves[move.id] = {
    name: moveNames.get(move.id),
    description: moveTexts.get(move.id),
    category: damageClasses.get(move.damage_class_id)?.identifier,
    type: types.get(move.type_id)?.identifier,
    power: move.power ? Number(move.power) : undefined,
    accuracy: move.accuracy ? Number(move.accuracy) : undefined,
    pp: move.pp ? Number(move.pp) : undefined,
  };
}

const abilityNames = names(tables.ability_names, "ability_id");
const abilityTexts = flavors(tables.ability_flavor_text, "ability_id");
const abilities = {};
for (const ability of tables.abilities) {
  if (Number(ability.id) > maxAbilityId) continue;
  abilities[ability.id] = {
    name: abilityNames.get(ability.id),
    description: abilityTexts.get(ability.id),
  };
}

const itemNames = names(tables.item_names, "item_id");
const itemTexts = flavors(tables.item_flavor_text, "item_id", "flavor_text");
const itemIndices = new Map();
for (const row of tables.item_game_indices) {
  if (row.generation_id !== "3" && row.generation_id !== "4") continue;
  const entry = itemIndices.get(row.item_id) ?? {};
  entry[`gen${row.generation_id}`] = Number(row.game_index);
  itemIndices.set(row.item_id, entry);
}
const items = [];
for (const item of tables.items) {
  const indices = itemIndices.get(item.id);
  if (!indices || !itemNames.get(item.id)?.en) continue;
  items.push({
    ...indices,
    name: itemNames.get(item.id),
    description: itemTexts.get(item.id),
  });
}

const natureNames = names(tables.nature_names, "nature_id");
const natures = {};
for (const nature of tables.natures) {
  natures[nature.identifier] = {
    name: natureNames.get(nature.id),
    increased: stats.get(nature.increased_stat_id)?.identifier,
    decreased: stats.get(nature.decreased_stat_id)?.identifier,
  };
}

await writeFile(
  join(root, "public", "data", "game-text.json"),
  JSON.stringify({ moves, abilities, items, natures }) + "\n",
);
console.log(
  `Game text: ${Object.keys(moves).length} moves, ${Object.keys(abilities).length} abilities, ${items.length} items, ${Object.keys(natures).length} natures.`,
);
