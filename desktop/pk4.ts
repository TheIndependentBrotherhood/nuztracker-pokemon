import type { LivePokemon } from "../src/lib/tracker/types";
import { hiddenPowerFromIvs } from "../src/lib/tracker/hidden-power";

const orders = [
  "ABCD",
  "ABDC",
  "ACBD",
  "ACDB",
  "ADBC",
  "ADCB",
  "BACD",
  "BADC",
  "BCAD",
  "BCDA",
  "BDAC",
  "BDCA",
  "CABD",
  "CADB",
  "CBAD",
  "CBDA",
  "CDAB",
  "CDBA",
  "DABC",
  "DACB",
  "DBAC",
  "DBCA",
  "DCAB",
  "DCBA",
];
const natures = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
];

export interface DecodedPk4 {
  pokemon: LivePokemon;
  personality: number;
  form: number;
  abilityId: number;
  heldItemId: number;
  ppUps: number[];
  nicknameUnsupported: boolean;
  shinyValue: number;
}

export const VANILLA_SHINY_THRESHOLD = 8;
const SHINY_CHECK_PREFIX = Buffer.from("48405040", "hex");
const SHINY_CHECK_SUFFIX = Buffer.from("012000e00020", "hex");

// A Pokemon is shiny when its shiny value is below this threshold. Randomizers rewrite the check as
// `cmp r0,#threshold; bcs` (vanilla, Project PM) or `lsrs r0,r0,#k; bne` (threshold 2^k).
export function readShinyThreshold(arm9: Buffer): number {
  const thresholds = new Set<number>();
  for (
    let offset = arm9.indexOf(SHINY_CHECK_PREFIX);
    offset >= 0 && offset + 14 <= arm9.length;
    offset = arm9.indexOf(SHINY_CHECK_PREFIX, offset + 1)
  ) {
    if (
      arm9[offset + 6] !== 0x01 ||
      !arm9.subarray(offset + 8, offset + 14).equals(SHINY_CHECK_SUFFIX)
    )
      continue;
    const instruction = arm9.readUInt16LE(offset + 4);
    if (arm9[offset + 5] === 0x28 && arm9[offset + 7] === 0xd2)
      thresholds.add(instruction & 0xff);
    else if ((instruction & 0xf83f) === 0x0800 && arm9[offset + 7] === 0xd1)
      thresholds.add(1 << ((instruction >>> 6) & 31));
  }
  return thresholds.size === 1 ? [...thresholds][0] : VANILLA_SHINY_THRESHOLD;
}

// The game was rewriting the record while it was read; reading it again shortly is expected to work.
export class SnapshotError extends Error {}

export function cryptPk4(data: Buffer, seed: number): Buffer {
  const output = Buffer.from(data);
  for (let offset = 0; offset < output.length; offset += 2) {
    seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
    output.writeUInt16LE(output.readUInt16LE(offset) ^ (seed >>> 16), offset);
  }
  return output;
}

export function decodeGen4Text(data: Buffer): string | undefined {
  const result: string[] = [];
  const punctuation: Record<number, string> = {
    0x1a8: "$",
    0x1ab: "!",
    0x1ac: "?",
    0x1ad: ",",
    0x1ae: ".",
    0x1af: "\u2026",
    0x1b1: "/",
    0x1b2: "'",
    0x1b3: "'",
    0x1b9: "(",
    0x1ba: ")",
    0x1bb: "\u2642",
    0x1bc: "\u2640",
    0x1bd: "+",
    0x1be: "-",
    0x1bf: "*",
    0x1c0: "#",
    0x1c1: "=",
    0x1c2: "&",
    0x1c3: "~",
    0x1c4: ":",
    0x1c5: ";",
    0x1de: " ",
  };
  for (let offset = 0; offset + 1 < data.length; offset += 2) {
    const code = data.readUInt16LE(offset);
    if (code === 0xffff) break;
    if (code >= 0x121 && code <= 0x12a)
      result.push(String.fromCharCode(code - 0x121 + 48));
    else if (code >= 0x12b && code <= 0x144)
      result.push(String.fromCharCode(code - 0x12b + 65));
    else if (code >= 0x145 && code <= 0x15e)
      result.push(String.fromCharCode(code - 0x145 + 97));
    else if (code >= 0x15f && code <= 0x19e)
      result.push(String.fromCharCode(code - 0x15f + 0xc0));
    else if (punctuation[code]) result.push(punctuation[code]);
    else return undefined;
  }
  return result.join("").trim() || undefined;
}

/** Stat order of Gen 4 IVs, EVs and personal base stats. */
export const PK4_STATS = [
  "hp",
  "attack",
  "defense",
  "speed",
  "special-attack",
  "special-defense",
] as const;

/** Values a box record lacks, rebuilt from the ROM's personal data. */
export interface BoxRecordInput {
  species: number;
  form: number;
  experience: number;
  nature: number;
  ivs: number[];
  evs: number[];
}
export interface BoxRecordStats {
  level: number;
  maxHp: number;
}
export type BoxStatsResolver = (
  input: BoxRecordInput,
) => BoxRecordStats | undefined;

interface Pk4Tail {
  level: number;
  hp: number;
  maxHp: number;
  status: number;
  stats?: LivePokemon["stats"];
}

function decodeRecord(
  data: Buffer,
  tailOf: (core: BoxRecordInput, personality: number) => Pk4Tail,
): DecodedPk4 | null {
  const personality = data.readUInt32LE(0);
  const flags = data.readUInt16LE(4);
  if (flags & ~3)
    throw new Error("The game reported an invalid Pokemon record.");
  const checksum = data.readUInt16LE(6);
  const body =
    flags & 2
      ? data.subarray(8, 136)
      : cryptPk4(data.subarray(8, 136), checksum);
  let actual = 0;
  for (let offset = 0; offset < body.length; offset += 2)
    actual = (actual + body.readUInt16LE(offset)) & 0xffff;
  if (actual !== checksum)
    throw new SnapshotError(
      "Pokemon checksum changed during the read. No partial team was sent.",
    );
  const order = orders[((personality >>> 13) & 31) % 24];
  const block = (name: string) =>
    body.subarray(order.indexOf(name) * 32, (order.indexOf(name) + 1) * 32);
  const growth = block("A");
  const attacks = block("B");
  const ivs = attacks.readUInt32LE(16);
  if (ivs & 0x40000000) return null;
  const species = growth.readUInt16LE(0);
  if (species < 1 || species > 493)
    throw new Error("This ROM's party species layout is not supported.");
  const experience = growth.readUInt32LE(8);
  const { level, hp, maxHp, status, stats } = tailOf(
    {
      species,
      form: attacks[24] >>> 3,
      experience,
      nature: personality % 25,
      ivs: PK4_STATS.map((_, index) => (ivs >>> (index * 5)) & 31),
      evs: PK4_STATS.map((_, index) => growth[16 + index]),
    },
    personality,
  );
  if (!level || level > 100 || !maxHp || maxHp > 9999 || hp > maxHp)
    throw new SnapshotError(
      "Pokemon level or HP changed during the read. No partial team was sent.",
    );
  const otId = growth.readUInt32LE(4);
  const hasNickname = Boolean(ivs & 0x80000000);
  const name = hasNickname
    ? decodeGen4Text(block("C").subarray(0, 22))
    : undefined;
  const gender = (attacks[24] >>> 1) & 3;
  const shinyValue =
    (personality & 0xffff) ^
    (personality >>> 16) ^
    (otId & 0xffff) ^
    (otId >>> 16);
  const moves = [];
  const ppUps = [];
  for (let index = 0; index < 4; index++) {
    const id = attacks.readUInt16LE(index * 2);
    if (!id) continue;
    moves.push({ id, pp: attacks[8 + index] });
    ppUps.push(attacks[12 + index] & 3);
  }
  return {
    personality,
    form: attacks[24] >>> 3,
    abilityId: growth[13],
    heldItemId: growth.readUInt16LE(2),
    ppUps,
    nicknameUnsupported: hasNickname && !name,
    shinyValue,
    pokemon: {
      identity: `${personality.toString(16).padStart(8, "0")}-${otId.toString(16).padStart(8, "0")}`,
      pokemonId: species,
      nickname: name,
      level,
      hp,
      maxHp,
      status:
        hp === 0
          ? "fainted"
          : status & 7
            ? "sleep"
            : status & 0x80
              ? "toxic"
              : status & 0x08
                ? "poison"
                : status & 0x10
                  ? "burn"
                  : status & 0x20
                    ? "freeze"
                    : status & 0x40
                      ? "paralysis"
                      : "healthy",
      isEgg: false,
      isShiny: shinyValue < VANILLA_SHINY_THRESHOLD,
      gender: gender === 0 ? "male" : gender === 1 ? "female" : "unknown",
      nature: natures[personality % 25],
      experience,
      friendship: growth[12],
      hiddenPower: hiddenPowerFromIvs(ivs & 0x3fffffff),
      ...(stats ? { stats } : {}),
      moves,
    },
  };
}

export function decodePk4(data: Buffer): DecodedPk4 | null {
  if (data.length !== 236)
    throw new Error("A Platinum party record must contain 236 bytes.");
  return decodeRecord(data, (_, personality) => {
    const tail =
      data.readUInt16LE(4) & 1
        ? data.subarray(136)
        : cryptPk4(data.subarray(136), personality);
    return {
      level: tail[4],
      hp: tail.readUInt16LE(6),
      maxHp: tail.readUInt16LE(8),
      status: tail.readUInt32LE(0),
      stats: {
        attack: tail.readUInt16LE(10),
        defense: tail.readUInt16LE(12),
        speed: tail.readUInt16LE(14),
        "special-attack": tail.readUInt16LE(16),
        "special-defense": tail.readUInt16LE(18),
      },
    };
  });
}

/** True for an empty PC slot, which the game leaves zeroed. */
export function isEmptyBoxRecord(data: Buffer): boolean {
  return (
    data.readUInt32LE(0) === 0 &&
    data.readUInt16LE(4) === 0 &&
    data.readUInt16LE(6) === 0
  );
}

/**
 * PC boxes keep 136-byte records without the battle part: level and HP are rebuilt from the ROM.
 * Stored Pokémon are always healed, so their HP is full.
 */
export function decodeBoxPk4(
  data: Buffer,
  resolve: BoxStatsResolver,
): DecodedPk4 | null {
  if (data.length !== 136)
    throw new Error("A Platinum box record must contain 136 bytes.");
  return decodeRecord(data, (core) => {
    const computed = resolve(core);
    if (!computed)
      throw new Error("This ROM's personal-data table is unsupported.");
    return { ...computed, hp: computed.maxHp, status: 0 };
  });
}

const cube = (level: number) => level ** 3;
// Gen 4 growth rates, by the personal-data index.
const growthCurves: ((level: number) => number)[] = [
  cube,
  (n) =>
    n <= 50
      ? (cube(n) * (100 - n)) / 50
      : n <= 68
        ? (cube(n) * (150 - n)) / 100
        : n <= 98
          ? (cube(n) * Math.floor((1911 - 10 * n) / 3)) / 500
          : (cube(n) * (160 - n)) / 100,
  (n) =>
    n <= 15
      ? (cube(n) * (Math.floor((n + 1) / 3) + 24)) / 50
      : n <= 36
        ? (cube(n) * (n + 14)) / 50
        : (cube(n) * (Math.floor(n / 2) + 32)) / 50,
  (n) => (6 * cube(n)) / 5 - 15 * n * n + 100 * n - 140,
  (n) => (4 * cube(n)) / 5,
  (n) => (5 * cube(n)) / 4,
];

/** Level reached with this experience on a growth rate; undefined for an unknown rate. */
export function levelFromExperience(
  growthRate: number,
  experience: number,
): number | undefined {
  const curve = growthCurves[growthRate];
  if (!curve) return undefined;
  let level = 1;
  while (level < 100 && Math.floor(curve(level + 1)) <= experience) level++;
  return level;
}

/** Gen 3+ HP formula; Shedinja (species 292) always has 1 HP. */
export function maxHpFor(
  species: number,
  baseHp: number,
  iv: number,
  ev: number,
  level: number,
): number {
  if (species === 292) return 1;
  return (
    Math.floor(((2 * baseHp + iv + Math.floor(ev / 4)) * level) / 100) +
    level +
    10
  );
}
