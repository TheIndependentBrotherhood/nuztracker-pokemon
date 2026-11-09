import type { LivePokemon } from "../src/lib/tracker/types";

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

export function decodePk4(data: Buffer): DecodedPk4 | null {
  if (data.length !== 236)
    throw new Error("A Platinum party record must contain 236 bytes.");
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
  const tail =
    flags & 1 ? data.subarray(136) : cryptPk4(data.subarray(136), personality);
  const level = tail[4];
  const hp = tail.readUInt16LE(6);
  const maxHp = tail.readUInt16LE(8);
  if (!level || level > 100 || !maxHp || maxHp > 9999 || hp > maxHp)
    throw new SnapshotError(
      "Pokemon level or HP changed during the read. No partial team was sent.",
    );
  const otId = growth.readUInt32LE(4);
  const hasNickname = Boolean(ivs & 0x80000000);
  const name = hasNickname
    ? decodeGen4Text(block("C").subarray(0, 22))
    : undefined;
  const status = tail.readUInt32LE(0);
  const gender = (attacks[24] >>> 1) & 3;
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
      isShiny:
        ((personality & 0xffff) ^
          (personality >>> 16) ^
          (otId & 0xffff) ^
          (otId >>> 16)) <
        8,
      gender: gender === 0 ? "male" : gender === 1 ? "female" : "unknown",
      nature: natures[personality % 25],
      experience: growth.readUInt32LE(8),
      friendship: growth[12],
      stats: {
        attack: tail.readUInt16LE(10),
        defense: tail.readUInt16LE(12),
        speed: tail.readUInt16LE(14),
        "special-attack": tail.readUInt16LE(16),
        "special-defense": tail.readUInt16LE(18),
      },
      moves,
    },
  };
}
