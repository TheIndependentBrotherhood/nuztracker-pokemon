import type { PlatinumBattleData } from "./platinum-data";

// BattleContext fields (pret/pokeplatinum include/battle/battle_context.h).
export const CONTEXT_BATTLERS_OFFSET = 0x64;
export const CONTEXT_FIELD_CONDITIONS_OFFSET = 0x180;
export const CONTEXT_TURN_FLAGS_OFFSET = 0x1d4;
export const CONTEXT_TURN_FLAGS_SIZE = 0x40;
export const CONTEXT_DAMAGE_OFFSET = 0x2184;
export const CONTEXT_MOVE_CUR_OFFSET = 0x3084;
const DAMAGE_TO_MOVE_TYPE = 0x21a0 - CONTEXT_DAMAGE_OFFSET;
const DAMAGE_TO_STATUS_FLAGS = 0x21ac - CONTEXT_DAMAGE_OFFSET;
export const CONTEXT_DAMAGE_BLOCK_SIZE = DAMAGE_TO_STATUS_FLAGS + 4;

const MOVE_STATUS_SUPER_EFFECTIVE = 1 << 1;
const MOVE_STATUS_NOT_VERY_EFFECTIVE = 1 << 2;
const MOVE_STATUS_INEFFECTIVE = 1 << 3;
const MOVE_STATUS_EFFECTIVENESS =
  MOVE_STATUS_SUPER_EFFECTIVE |
  MOVE_STATUS_NOT_VERY_EFFECTIVE |
  MOVE_STATUS_INEFFECTIVE;
// Missed, failed, Levitate, OHKO failure, multi-hit interruption, Protect, semi-invulnerable,
// Focus Punch, Wonder Guard, Sturdy and Magnet Rise: the type chart result is not reliable.
const MOVE_STATUS_NO_TYPE_RESULT = [0, 6, 11, 12, 14, 15, 16, 17, 18, 19, 20]
  .map((bit) => 1 << bit)
  .reduce((mask, flag) => mask | flag, 0);
const FIELD_CONDITION_GRAVITY = 0x7000;
const TURN_FLAG_ROOSTING = 1 << 6;
const VOLATILE_CONDITION_FORESIGHT = 1 << 29;
const MOVE_EFFECT_INGRAIN = 1 << 10;
const MOVE_EFFECT_MIRACLE_EYE = 1 << 22;
const ABILITY_NORMALIZE = 96;
const ABILITY_SCRAPPY = 113;
const ITEM_IRON_BALL = 278;
// Struggle, Future Sight, Beat Up and Doom Desire skip or delay the type chart.
const UNRELIABLE_MOVES = new Set([165, 248, 251, 353]);
// Species whose form changes its types, which the base personal data does not describe.
const FORM_SPECIES = new Set([351, 386, 413, 479, 487, 492, 493]);

export type EffectivenessOutcome =
  "immunity" | "weakness" | "resistance" | "neutral";

export interface EffectivenessMon {
  species: number;
  type1: number;
  type2: number;
  ability: number;
  heldItem: number;
  statusVolatile: number;
  moveEffectsMask: number;
}

export interface EffectivenessSample {
  attacker: number;
  defender: number;
  moveCur: number;
  /** Type override set by Hidden Power, Weather Ball or Natural Gift; 0 keeps the move's type. */
  moveTypeOverride: number;
  moveStatusFlags: number;
  damage: number;
  fieldConditions: number;
  defenderTurnFlags: number;
  attackerMon: EffectivenessMon;
  defenderMon: EffectivenessMon;
}

export function readEffectivenessMon(mon: Buffer): EffectivenessMon {
  return {
    species: mon.readUInt16LE(0x00),
    type1: mon[0x24],
    type2: mon[0x25],
    ability: mon[0x27],
    heldItem: mon.readUInt16LE(0x78),
    statusVolatile: mon.readUInt32LE(0x70),
    moveEffectsMask: mon.readUInt32LE(0x80),
  };
}

/** True when the damage block shows a resolved type-chart check for the current move. */
export function hasMoveResult(damageBlock: Buffer): boolean {
  return (
    damageBlock.readInt32LE(0) < 0 ||
    (damageBlock.readUInt32LE(DAMAGE_TO_STATUS_FLAGS) &
      MOVE_STATUS_EFFECTIVENESS) !==
      0
  );
}

export function damageBlockFields(damageBlock: Buffer) {
  return {
    damage: damageBlock.readInt32LE(0),
    moveTypeOverride: damageBlock.readUInt32LE(DAMAGE_TO_MOVE_TYPE),
    moveStatusFlags: damageBlock.readUInt32LE(DAMAGE_TO_STATUS_FLAGS),
  };
}

/**
 * Classifies the type matchup the game computed for the move being executed, mirroring
 * BattleSystem_ApplyTypeChart. Anything an ability, item, field effect or form could have altered
 * is ignored so that the observation only reflects the defender's types.
 */
export function classifyEffectiveness(
  sample: EffectivenessSample,
  data: PlatinumBattleData,
):
  | { pokemonId: number; attackType: string; outcome: EffectivenessOutcome }
  | undefined {
  const { attackerMon, defenderMon, moveStatusFlags: flags } = sample;
  if (
    !sample.moveCur ||
    UNRELIABLE_MOVES.has(sample.moveCur) ||
    sample.attacker === sample.defender ||
    sample.attacker > 1 ||
    sample.defender > 1 ||
    flags & MOVE_STATUS_NO_TYPE_RESULT
  )
    return undefined;
  const species = defenderMon.species;
  if (species < 1 || species > 493 || FORM_SPECIES.has(species))
    return undefined;
  const move = data.move(sample.moveCur);
  if (!move || move.category === "status" || !move.category) return undefined;
  const attackType =
    attackerMon.ability === ABILITY_NORMALIZE
      ? "normal"
      : sample.moveTypeOverride
        ? data.typeName(sample.moveTypeOverride)
        : move.type;
  if (!attackType || attackType === "???") return undefined;
  const speciesTypes = data.speciesTypes(species);
  const battleTypes = [
    ...new Set([
      data.typeName(defenderMon.type1),
      data.typeName(defenderMon.type2),
    ]),
  ];
  // Conversion, Color Change, Transform or a form change replaced the species' types.
  if (
    !speciesTypes ||
    battleTypes.length !== speciesTypes.length ||
    battleTypes.some((type) => !type || !speciesTypes.includes(type))
  )
    return undefined;
  // Foresight and Scrappy only skip the Ghost immunities; Miracle Eye only the Dark immunity.
  if (
    sample.defenderTurnFlags & TURN_FLAG_ROOSTING ||
    ((attackType === "normal" || attackType === "fighting") &&
      (defenderMon.statusVolatile & VOLATILE_CONDITION_FORESIGHT ||
        attackerMon.ability === ABILITY_SCRAPPY)) ||
    (attackType === "psychic" &&
      defenderMon.moveEffectsMask & MOVE_EFFECT_MIRACLE_EYE)
  )
    return undefined;
  if (
    attackType === "ground" &&
    (sample.fieldConditions & FIELD_CONDITION_GRAVITY ||
      defenderMon.heldItem === ITEM_IRON_BALL ||
      defenderMon.moveEffectsMask & MOVE_EFFECT_INGRAIN)
  )
    return undefined;
  const outcome: EffectivenessOutcome | undefined =
    flags & MOVE_STATUS_INEFFECTIVE
      ? "immunity"
      : flags & MOVE_STATUS_SUPER_EFFECTIVE
        ? "weakness"
        : flags & MOVE_STATUS_NOT_VERY_EFFECTIVE
          ? "resistance"
          : // Fixed-damage moves (power 1) never report a weakness or a resistance.
            sample.damage < 0 && move.power > 1
            ? "neutral"
            : undefined;
  return outcome && { pokemonId: species, attackType, outcome };
}
