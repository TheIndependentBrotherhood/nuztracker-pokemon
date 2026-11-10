import type { LiveMove, StatStages } from "./types";

export interface MovePowerTarget {
  /** Weight in hectograms. */
  weight?: number;
  statStages?: StatStages;
}

interface PowerContext {
  types: string[];
  generation: number;
  hp?: number;
  maxHp?: number;
  friendship?: number;
  abilityId?: number;
  hiddenPowerKnown?: boolean;
  target?: MovePowerTarget;
}

const FIXED_DAMAGE = new Set([12, 32, 49, 69, 82, 90, 101, 149, 162, 283, 329]);
const UNRESOLVED_TYPE = new Set([311, 363, 449]);

/** Projected base power, followed by STAB only; not a complete damage calculation. */
export function movePower(
  move: Pick<LiveMove, "id" | "pp" | "maxPp" | "custom"> & {
    power?: number;
    type?: string;
    category?: LiveMove["category"];
  },
  context: PowerContext,
): { power?: number; basePower?: number; stab: boolean; variable: boolean } {
  if (move.category === "status") return { stab: false, variable: false };
  let power = move.power && move.power > 1 ? move.power : undefined;
  let variable = power === undefined;
  let fixed = false;
  if (!move.custom) {
    fixed = FIXED_DAMAGE.has(move.id);
    if (fixed) {
      power = undefined;
      variable = false;
    } else if (move.id === 67 && context.generation < 3) {
      power = 50;
      variable = false;
    } else if (move.id === 67 || move.id === 447) {
      variable = true;
      const weight = context.target?.weight;
      power =
        weight === undefined
          ? undefined
          : weight < 100
            ? 20
            : weight < 250
              ? 40
              : weight < 500
                ? 60
                : weight < 1000
                  ? 80
                  : weight < 2000
                    ? 100
                    : 120;
    } else if (move.id === 175 || move.id === 179) {
      variable = true;
      if (context.hp !== undefined && context.maxHp) {
        const ratio = Math.floor((48 * context.hp) / context.maxHp);
        power =
          ratio <= 1
            ? 200
            : ratio <= 4
              ? 150
              : ratio <= 9
                ? 100
                : ratio <= 16
                  ? 80
                  : ratio <= 32
                    ? 40
                    : 20;
      } else power = undefined;
    } else if (move.id === 284 || move.id === 323) {
      variable = true;
      power =
        context.hp !== undefined && context.maxHp
          ? Math.max(1, Math.floor((150 * context.hp) / context.maxHp))
          : undefined;
    } else if (move.id === 216 || move.id === 218) {
      variable = true;
      power =
        context.friendship === undefined
          ? undefined
          : Math.max(
              1,
              Math.floor(
                ((move.id === 216
                  ? context.friendship
                  : 255 - context.friendship) *
                  2) /
                  5,
              ),
            );
    } else if (move.id === 376) {
      variable = true;
      const remaining = Math.max(0, move.pp - 1);
      power =
        move.maxPp === undefined
          ? undefined
          : remaining === 0
            ? 200
            : remaining === 1
              ? 80
              : remaining === 2
                ? 60
                : remaining === 3
                  ? 50
                  : 40;
    } else if (move.id === 386) {
      variable = true;
      power =
        context.target === undefined
          ? undefined
          : Math.min(
              200,
              60 +
                20 *
                  Object.values(context.target.statStages ?? {}).reduce(
                    (sum, stage) => sum + Math.max(0, stage),
                    0,
                  ),
            );
    } else if (move.id === 237 && !context.hiddenPowerKnown) {
      power = undefined;
      variable = true;
    }
  }
  const stab =
    !fixed &&
    power !== undefined &&
    Boolean(move.type && context.types.includes(move.type)) &&
    (move.custom || !UNRESOLVED_TYPE.has(move.id)) &&
    (move.custom || move.id !== 237 || Boolean(context.hiddenPowerKnown));
  const multiplier = context.abilityId === 88 ? 2 : 1.5;
  return {
    basePower: power,
    power:
      power === undefined
        ? undefined
        : stab
          ? Math.floor(power * multiplier)
          : power,
    stab,
    variable,
  };
}
