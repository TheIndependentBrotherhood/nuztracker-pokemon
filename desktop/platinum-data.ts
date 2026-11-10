import { Dex } from "@pkmn/dex";
import type {
  LiveEvolution,
  LiveMove,
  LivePokemon,
} from "../src/lib/tracker/types";
import { readShinyThreshold, type DecodedPk4 } from "./pk4";
import { NdsRom } from "./nds-rom";
import { readGen4Message } from "./nds-text";

const types = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "???",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
];
const moveCategories = ["physical", "special", "status"] as const;
const forms: Record<
  number,
  { last: number; personal: number; pokemon: number }
> = {
  386: { last: 3, personal: 496, pokemon: 10001 },
  413: { last: 2, personal: 499, pokemon: 10004 },
  487: { last: 1, personal: 501, pokemon: 10007 },
  492: { last: 1, personal: 502, pokemon: 10006 },
  479: { last: 5, personal: 503, pokemon: 10008 },
};

export interface PlatinumBattleData {
  /** Type name of a ROM type index, as used by battle structures. */
  typeName(index: number): string | undefined;
  move(id: number):
    | {
        type: string;
        category?: (typeof moveCategories)[number];
        power: number;
        accuracy: number;
      }
    | undefined;
  /** Types of a species' base form in the ROM personal data. */
  speciesTypes(species: number): string[] | undefined;
  /** English name of an ability, or its ROM name when the ROM replaced it. */
  abilityName(id: number): string | undefined;
  /** True when the ROM defines an ability id that vanilla Platinum does not have. */
  customAbility(id: number): boolean;
  /** Highest ability id the ROM names. */
  maxAbilityId: number;
  /** English name of a move, or its ROM name when the ROM replaced it. */
  moveName(id: number): string | undefined;
  /** ROM data of a move the ROM replaced (hacks); undefined for vanilla moves. */
  customMove(id: number): CustomMove | undefined;
  /** Highest move id the ROM defines. */
  maxMoveId: number;
  /** Levels of a species' base-form level-up moves in the ROM (randomizer-aware). */
  learnLevels(species: number): number[] | undefined;
  /** Evolution methods of a species in the ROM (randomizer-aware). */
  evolutions(species: number): LiveEvolution[] | undefined;
}

/** Vanilla move names per language, keyed by move id (from the game-text reference data). */
export type VanillaMoveNames = Record<string, Partial<Record<string, string>>>;

export type CustomMove = Required<Pick<LiveMove, "name" | "type" | "power">> &
  Pick<LiveMove, "category" | "accuracy">;

const VANILLA_MOVES = 467;
const VANILLA_ABILITIES = 123;
const MOVE_NAMES_BANK = 647;
const ABILITY_NAMES_BANK = 610;

const comparable = (value: string | undefined) =>
  (value ?? "")
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Gen 4 names are cut to 12 characters ("Puis. Cachée") and sometimes respelled ("Stalagtite").
export function sameMoveName(romName: string, vanillaName: string): boolean {
  const rom = comparable(romName);
  const vanilla = comparable(vanillaName);
  if (rom === vanilla) return true;
  const parts = romName.split(".").map(comparable).filter(Boolean);
  if (
    parts.length > 1 &&
    new RegExp(`^${parts.join("[a-z0-9]*")}$`).test(vanilla)
  )
    return true;
  return editDistance(rom, vanilla) <= 2;
}

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++)
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    previous = current;
  }
  return previous[right.length];
}

function readNames(bank: Buffer | undefined): string[] {
  const names: string[] = [];
  if (!bank) return names;
  for (let index = 0; ; index++) {
    try {
      const name = readGen4Message(bank, index);
      if (name === undefined) return names;
      names.push(name);
    } catch {
      return names;
    }
  }
}

const LEARNSET_END = 0xffff;

// Gen 4 level-up entries pack the level in the top 7 bits and the move in the low 9 bits.
export function readLearnLevels(
  data: Buffer | undefined,
): number[] | undefined {
  if (!data) return undefined;
  const levels: number[] = [];
  for (let offset = 0; offset + 1 < data.length; offset += 2) {
    const entry = data.readUInt16LE(offset);
    if (entry === LEARNSET_END) return levels;
    const level = entry >> 9;
    if (!(entry & 0x1ff) || level > 100) return undefined;
    levels.push(level);
  }
  return levels;
}

const EVOLUTION_SLOTS = 7;
const EVOLUTION_ENTRY_BYTES = 6;
const MAX_SPECIES = 493;
// Project PM adds method 27; its condition is not yet identified.
const MAX_EVOLUTION_METHOD = 27;

// Gen 4 evolution files hold 7 entries of method, parameter and target species (u16 each).
export function readEvolutions(
  data: Buffer | undefined,
): LiveEvolution[] | undefined {
  if (!data || data.length < EVOLUTION_SLOTS * EVOLUTION_ENTRY_BYTES)
    return undefined;
  const evolutions: LiveEvolution[] = [];
  for (let slot = 0; slot < EVOLUTION_SLOTS; slot++) {
    const offset = slot * EVOLUTION_ENTRY_BYTES;
    const method = data.readUInt16LE(offset);
    const param = data.readUInt16LE(offset + 2);
    const target = data.readUInt16LE(offset + 4);
    if (!method) continue;
    if (method > MAX_EVOLUTION_METHOD || target < 1 || target > MAX_SPECIES)
      return undefined;
    evolutions.push({ method, param, target });
  }
  return evolutions;
}

async function optionalArchive(
  rom: NdsRom,
  path: string,
): Promise<Buffer[] | undefined> {
  try {
    return await rom.archive(path);
  } catch {
    return undefined;
  }
}

export async function loadPlatinumData(
  rom: NdsRom,
  vanillaMoveNames: VanillaMoveNames = {},
) {
  const personal = await rom.archive("poketool/personal/pl_personal.narc");
  const moveData = await rom.archive("poketool/waza/pl_waza_tbl.narc");
  const messages = await rom.archive("msgdata/pl_msg.narc");
  const learnsets = await optionalArchive(rom, "poketool/personal/wotbl.narc");
  const evolutionData = await optionalArchive(
    rom,
    "poketool/personal/evo.narc",
  );
  const shinyThreshold = readShinyThreshold(await rom.arm9());
  if (!messages[624])
    throw new Error("This ROM has no supported type-name table.");
  const ninthType = readGen4Message(messages[624], 9)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const romTypes = [...types];
  if (ninthType === "fairy" || ninthType === "fee") romTypes[9] = "fairy";
  const dex = Dex.mod("gen4");
  const dexMoves = new Map(
    dex.moves
      .all()
      .filter((move) => move.gen <= 4)
      .map((move) => [move.num, move]),
  );
  const moves = new Map([...dexMoves].map(([id, move]) => [id, move.name]));
  const abilities = new Map(
    dex.abilities
      .all()
      .filter((ability) => ability.gen <= 4)
      .map((ability) => [ability.num, ability.name]),
  );
  const romMoveNames = readNames(messages[MOVE_NAMES_BANK]);
  const romAbilityNames = readNames(messages[ABILITY_NAMES_BANK]);
  // Translations and hacks keep the game code, so the text language is detected from move names.
  const vanillaName = (id: number, language: string) =>
    vanillaMoveNames[id]?.[language] ??
    (language === "en" ? dexMoves.get(id)?.name : undefined);
  const languages = [
    ...new Set([
      "en",
      ...Object.values(vanillaMoveNames).flatMap((names) => Object.keys(names)),
    ]),
  ];
  const matches = (language: string) =>
    romMoveNames.filter(
      (name, id) =>
        id >= 1 &&
        id <= VANILLA_MOVES &&
        comparable(vanillaName(id, language)) === comparable(name),
    ).length;
  const language = languages
    .map((candidate) => ({ candidate, count: matches(candidate) }))
    .filter(({ count }) => count >= VANILLA_MOVES / 2)
    .sort((left, right) => right.count - left.count)[0]?.candidate;
  // Hacks reuse vanilla move ids for new moves (e.g. Moonblast over Lunar Dance): a move is
  // custom when both its ROM name and its ROM data differ from vanilla. Renamed moves keep
  // vanilla data and randomizers change data but never names.
  const customMoves = new Map<number, CustomMove>();
  for (let id = 1; id < moveData.length; id++) {
    const data = moveData[id];
    const name = romMoveNames[id]?.trim();
    if (!name || !data || data.length < 16 || data[4] >= romTypes.length)
      continue;
    const rom = {
      name,
      type: romTypes[data[4]],
      power: data[3],
      category: moveCategories[data[2]],
      accuracy: data[5],
    };
    const vanilla = id <= VANILLA_MOVES ? dexMoves.get(id) : undefined;
    // Without a recognized text language, ROM names are the only reliable ones.
    if (vanilla && language) {
      const expected = vanillaName(id, language);
      if (!expected || sameMoveName(name, expected)) continue;
      if (
        rom.type === vanilla.type.toLowerCase() &&
        // Variable-power moves store 1 in the ROM and 0 in the reference data.
        (rom.power <= 1 ? 0 : rom.power) === vanilla.basePower &&
        rom.category === vanilla.category.toLowerCase()
      )
        continue;
    }
    customMoves.set(id, rom);
  }
  const customAbility = (id: number) =>
    id > VANILLA_ABILITIES && Boolean(romAbilityNames[id]?.trim());
  const items = new Map(
    dex.items
      .all()
      .filter((item) => item.gen <= 4)
      .map((item) => [item.num, item.name]),
  );
  const battle: PlatinumBattleData = {
    typeName: (index) => romTypes[index],
    move: (id) => {
      const data = moveData[id];
      if (!data || data.length < 16 || data[4] >= romTypes.length)
        return undefined;
      return {
        type: romTypes[data[4]],
        category: moveCategories[data[2]],
        power: data[3],
        accuracy: data[5],
      };
    },
    speciesTypes: (species) => {
      const row = personal[species];
      if (!row || row.length < 44 || row[6] >= romTypes.length) return;
      if (row[7] >= romTypes.length) return;
      return [...new Set([romTypes[row[6]], romTypes[row[7]]])];
    },
    moveName: (id) => customMoves.get(id)?.name ?? moves.get(id),
    customMove: (id) => customMoves.get(id),
    maxMoveId: moveData.length - 1,
    abilityName: (id) =>
      customAbility(id) ? romAbilityNames[id].trim() : abilities.get(id),
    customAbility,
    maxAbilityId: Math.max(VANILLA_ABILITIES, romAbilityNames.length - 1),
    learnLevels: (species) => readLearnLevels(learnsets?.[species]),
    evolutions: (species) => readEvolutions(evolutionData?.[species]),
  };
  const enrich = (decoded: DecodedPk4): LivePokemon => {
    const species = decoded.pokemon.pokemonId;
    const form = forms[species];
    const alternate = Boolean(
      form && decoded.form > 0 && decoded.form <= form.last,
    );
    const row =
      personal[alternate ? form.personal + decoded.form - 1 : species];
    const learnLevels = readLearnLevels(
      learnsets?.[alternate ? form.personal + decoded.form - 1 : species],
    );
    const evolutions = readEvolutions(evolutionData?.[species])?.map(
      (evolution) => {
        const custom =
          evolution.method === 20
            ? customMoves.get(evolution.param)
            : undefined;
        return custom ? { ...evolution, moveName: custom.name } : evolution;
      },
    );
    if (
      !row ||
      row.length < 44 ||
      row[6] >= types.length ||
      row[7] >= types.length
    )
      throw new Error("This ROM's personal-data table is unsupported.");
    return {
      ...decoded.pokemon,
      isShiny: decoded.shinyValue < shinyThreshold,
      pokemonId: alternate ? form.pokemon + decoded.form - 1 : species,
      types: [...new Set([romTypes[row[6]], romTypes[row[7]]])],
      ability:
        battle.abilityName(decoded.abilityId) ??
        `Unknown ability #${decoded.abilityId}`,
      ...(decoded.abilityId ? { abilityId: decoded.abilityId } : {}),
      ...(customAbility(decoded.abilityId) ? { customAbility: true } : {}),
      heldItem: decoded.heldItemId
        ? (items.get(decoded.heldItemId) ??
          `Unknown item #${decoded.heldItemId}`)
        : undefined,
      ...(decoded.heldItemId ? { heldItemId: decoded.heldItemId } : {}),
      moves: decoded.pokemon.moves.map((move, index) => {
        const data = moveData[move.id];
        if (!data || data.length < 16 || data[4] >= types.length)
          throw new Error(`Move #${move.id} uses an unsupported ROM layout.`);
        const category = moveCategories[data[2]];
        const ppUps = decoded.ppUps[index] ?? 0;
        const custom = customMoves.has(move.id);
        return {
          ...move,
          name: battle.moveName(move.id) ?? `Unknown move #${move.id}`,
          ...(custom ? { custom: true as const } : {}),
          type: romTypes[data[4]],
          power: data[3],
          accuracy: data[5],
          ...(category ? { category } : {}),
          ...(data[6]
            ? {
                maxPp: Math.max(
                  move.pp,
                  Math.floor((data[6] * (5 + ppUps)) / 5),
                ),
              }
            : {}),
        };
      }),
      ...(learnLevels ? { learnLevels } : {}),
      ...(evolutions ? { evolutions } : {}),
    };
  };
  return { enrich, battle };
}
