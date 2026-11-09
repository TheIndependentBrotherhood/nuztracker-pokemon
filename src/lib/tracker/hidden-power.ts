import type { HiddenPower } from "./types";

export const HIDDEN_POWER_MOVE_ID = 237;

const HIDDEN_POWER_TYPES = [
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
];

/** Gen 3-5 Hidden Power from the packed IV word (5 bits each: HP, Atk, Def, Spe, SpA, SpD). */
export function hiddenPowerFromIvs(ivWord: number): HiddenPower {
  let typeBits = 0;
  let powerBits = 0;
  for (let stat = 0; stat < 6; stat++) {
    const iv = Math.floor(ivWord / 2 ** (stat * 5)) % 32;
    typeBits += (iv % 2) * 2 ** stat;
    powerBits += (Math.floor(iv / 2) % 2) * 2 ** stat;
  }
  return {
    type: HIDDEN_POWER_TYPES[Math.floor((typeBits * 15) / 63)],
    power: Math.floor((powerBits * 40) / 63) + 30,
  };
}
