import translations, { type Lang } from "../../i18n/translations";
import type { LiveEvolution } from "./types";

const text = translations.focusCard.evolution;

type ItemKey = keyof typeof text.items;

// In-game item indexes of evolution items, per generation.
const ITEMS_BY_GENERATION: Record<3 | 4, Record<number, ItemKey>> = {
  3: {
    93: "sun",
    94: "moon",
    95: "fire",
    96: "thunder",
    97: "water",
    98: "leaf",
    187: "kingsRock",
    192: "deepSeaTooth",
    193: "deepSeaScale",
    199: "metalCoat",
    201: "dragonScale",
    218: "upgrade",
  },
  4: {
    80: "sun",
    81: "moon",
    82: "fire",
    83: "thunder",
    84: "water",
    85: "leaf",
    107: "shiny",
    108: "dusk",
    109: "dawn",
    110: "oval",
    221: "kingsRock",
    226: "deepSeaTooth",
    227: "deepSeaScale",
    233: "metalCoat",
    235: "dragonScale",
    252: "upgrade",
    321: "protector",
    322: "electirizer",
    323: "magmarizer",
    324: "dubiousDisc",
    325: "reaperCloth",
    326: "razorClaw",
    327: "razorFang",
  },
};

// Gen 3 and Gen 4 share method codes 1-15; Gen 4 adds 16-26.
const LEVEL_METHODS = new Set([4, 8, 9, 10, 11, 12, 13, 14, 22, 23]);
const MAX_COMBINED_LENGTH = 8;

export interface EvolutionNames {
  item?: (id: number) => string | undefined;
  move?: (id: number) => string | undefined;
  species?: (id: number) => string | undefined;
}

export interface EvolutionSummary {
  /** Ironmon-style abbreviation shown after the level, such as `30`, `THUNDR` or `37/WTR`. */
  label: string;
  /** A level-based evolution is already reachable. */
  ready: boolean;
  /** One readable condition per evolution, with its target species. */
  details: string[];
}

interface Label {
  long: string;
  short: string;
}

const upper = (value: string, length: number) =>
  value.toLocaleUpperCase().slice(0, length).trim();

function itemLabel(
  id: number,
  generation: number,
  lang: Lang,
  names: EvolutionNames,
): Label {
  const key = ITEMS_BY_GENERATION[generation <= 3 ? 3 : 4][id];
  if (key) {
    const [long, short] = text.items[key][lang];
    return { long, short };
  }
  const name = names.item?.(id) ?? `#${id}`;
  return { long: upper(name, 6), short: upper(name, 3) };
}

function label(
  evolution: LiveEvolution,
  generation: number,
  lang: Lang,
  names: EvolutionNames,
): Label {
  const { method, param } = evolution;
  const fixed = (key: keyof typeof text.labels) => {
    const [long, short] = text.labels[key][lang];
    return { long, short };
  };
  if (method === 22 || method === 23) {
    const value = `${param} ${method === 22 ? "M" : "F"}`;
    return { long: value, short: value };
  }
  if (LEVEL_METHODS.has(method)) return { long: `${param}`, short: `${param}` };
  switch (method) {
    case 1:
    case 2:
    case 3:
      return fixed("friendship");
    case 5:
      return fixed("trade");
    case 6:
    case 7:
    case 16:
    case 17:
    case 18:
    case 19:
      return itemLabel(param, generation, lang, names);
    case 15:
      return fixed("beauty");
    case 20:
      return fixed("move");
    case 21: {
      const species = names.species?.(param);
      return species
        ? { long: upper(species, 6), short: upper(species, 3) }
        : fixed("team");
    }
    case 24:
    case 25:
    case 26:
      return fixed("place");
    default:
      return { long: "?", short: "?" };
  }
}

function condition(
  evolution: LiveEvolution,
  generation: number,
  lang: Lang,
  names: EvolutionNames,
): string {
  const { method, param } = evolution;
  const conditions = text.conditions;
  const item = () => names.item?.(param) ?? `#${param}`;
  switch (method) {
    case 1:
      return conditions.friendship[lang];
    case 2:
      return conditions.friendshipDay[lang];
    case 3:
      return conditions.friendshipNight[lang];
    case 4:
    case 13:
      return conditions.level[lang](param);
    case 5:
      return conditions.trade[lang];
    case 6:
      return conditions.tradeItem[lang](item());
    case 7:
      return conditions.useItem[lang](item());
    case 8:
      return conditions.attackHigher[lang](param);
    case 9:
      return conditions.attackEqual[lang](param);
    case 10:
      return conditions.defenseHigher[lang](param);
    case 11:
    case 12:
      return conditions.personality[lang](param);
    case 14:
      return conditions.extraSlot[lang](param);
    case 15:
      return conditions.beauty[lang];
    case 16:
      return conditions.useItemMale[lang](item());
    case 17:
      return conditions.useItemFemale[lang](item());
    case 18:
      return conditions.holdItemDay[lang](item());
    case 19:
      return conditions.holdItemNight[lang](item());
    case 20:
      return conditions.knowMove[lang](
        evolution.moveName ?? names.move?.(param) ?? `#${param}`,
      );
    case 21:
      return conditions.withSpecies[lang](
        names.species?.(param) ?? `#${param}`,
      );
    case 22:
      return conditions.levelMale[lang](param);
    case 23:
      return conditions.levelFemale[lang](param);
    case 24:
      return conditions.magneticField[lang];
    case 25:
      return conditions.mossRock[lang];
    case 26:
      return conditions.iceRock[lang];
    default:
      return conditions.unknown[lang](method, generation);
  }
}

function combine(labels: Label[], lang: Lang): string {
  const unique = labels.filter(
    (entry, index) =>
      labels.findIndex((other) => other.long === entry.long) === index,
  );
  if (!unique.length) return "";
  if (unique.length === 1) return unique[0].long;
  const genders = unique.map((entry) => entry.long.match(/^(\d+) [MF]$/));
  if (
    unique.length === 2 &&
    genders[0] &&
    genders[1] &&
    genders[0][1] === genders[1][1]
  )
    return `${genders[0][1]} M/F`;
  if (unique.length > 2) return text.labels.various[lang][0];
  const long = unique.map((entry) => entry.long).join("/");
  return long.length <= MAX_COMBINED_LENGTH
    ? long
    : unique.map((entry) => entry.short).join("/");
}

/** Ironmon-style evolution summary of a species, or undefined when it does not evolve or is unknown. */
export function evolutionSummary(
  evolutions: LiveEvolution[] | undefined,
  level: number | undefined,
  generation: number,
  lang: Lang,
  names: EvolutionNames = {},
  // Random evolutions: the ROM knows the target, but naming it would spoil the run.
  hideTargets = false,
): EvolutionSummary | undefined {
  if (!evolutions?.length) return undefined;
  return {
    label: combine(
      evolutions.map((entry) => label(entry, generation, lang, names)),
      lang,
    ),
    ready:
      level !== undefined &&
      evolutions.some(
        (entry) => LEVEL_METHODS.has(entry.method) && level >= entry.param,
      ),
    details: evolutions.map((entry) => {
      if (hideTargets) return condition(entry, generation, lang, names);
      const target = names.species?.(entry.target) ?? `#${entry.target}`;
      return `${condition(entry, generation, lang, names)} → ${target}`;
    }),
  };
}
