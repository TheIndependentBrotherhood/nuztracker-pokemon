import { Dex } from "@pkmn/dex";
import type { LivePokemon } from "../src/lib/tracker/types";
import type { DecodedPk4 } from "./pk4";
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
      }
    | undefined;
  /** Types of a species' base form in the ROM personal data. */
  speciesTypes(species: number): string[] | undefined;
  /** English name of a move, for observations. */
  moveName(id: number): string | undefined;
  /** Levels of a species' base-form level-up moves in the ROM (randomizer-aware). */
  learnLevels(species: number): number[] | undefined;
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

export async function loadPlatinumData(rom: NdsRom) {
  const personal = await rom.archive("poketool/personal/pl_personal.narc");
  const moveData = await rom.archive("poketool/waza/pl_waza_tbl.narc");
  const messages = await rom.archive("msgdata/pl_msg.narc");
  const learnsets = await optionalArchive(rom, "poketool/personal/wotbl.narc");
  if (!messages[624])
    throw new Error("This ROM has no supported type-name table.");
  const ninthType = readGen4Message(messages[624], 9)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const romTypes = [...types];
  if (ninthType === "fairy" || ninthType === "fee") romTypes[9] = "fairy";
  const dex = Dex.mod("gen4");
  const moves = new Map(
    dex.moves
      .all()
      .filter((move) => move.gen <= 4)
      .map((move) => [move.num, move.name]),
  );
  const abilities = new Map(
    dex.abilities
      .all()
      .filter((ability) => ability.gen <= 4)
      .map((ability) => [ability.num, ability.name]),
  );
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
      };
    },
    speciesTypes: (species) => {
      const row = personal[species];
      if (!row || row.length < 44 || row[6] >= romTypes.length) return;
      if (row[7] >= romTypes.length) return;
      return [...new Set([romTypes[row[6]], romTypes[row[7]]])];
    },
    moveName: (id) => moves.get(id),
    learnLevels: (species) => readLearnLevels(learnsets?.[species]),
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
    if (
      !row ||
      row.length < 44 ||
      row[6] >= types.length ||
      row[7] >= types.length
    )
      throw new Error("This ROM's personal-data table is unsupported.");
    return {
      ...decoded.pokemon,
      pokemonId: alternate ? form.pokemon + decoded.form - 1 : species,
      types: [...new Set([romTypes[row[6]], romTypes[row[7]]])],
      ability:
        abilities.get(decoded.abilityId) ??
        `Unknown ability #${decoded.abilityId}`,
      ...(decoded.abilityId ? { abilityId: decoded.abilityId } : {}),
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
        return {
          ...move,
          name: moves.get(move.id) ?? `Unknown move #${move.id}`,
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
    };
  };
  return { enrich, battle };
}
