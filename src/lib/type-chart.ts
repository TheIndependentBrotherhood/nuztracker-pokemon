export const TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type TypeName = (typeof TYPES)[number];

export interface TypeData {
  names?: {
    fr?: string;
    en?: string;
  };
  weakTo: string[];
  resistsAgainst: string[];
  immuneTo: string[];
  strongAgainst: string[];
}

export interface TypeChartData {
  [key: string]: TypeData;
}

export async function loadTypeData(
  generation: "gen1" | "gen2-5" | "gen6+" = "gen6+",
): Promise<TypeChartData> {
  try {
    const response = await fetch("/data/type-charts.json");
    const data = await response.json();

    const generationData = data[generation]?.effectiveness ?? {};

    return generationData;
  } catch (error) {
    console.error("Failed to load type data:", error);
    return {};
  }
}

export const typeChart: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
};

export function getEffectiveness(attacking: string, defending: string): number {
  return typeChart[attacking]?.[defending] ?? 1;
}

export function buildTypeDefensesFromJson(
  types: string[],
  typeData: TypeChartData,
): Record<string, number> {
  const defenses: Record<string, number> = {};

  // For each attacking type, calculate how much damage the defending types take
  for (const attackType of TYPES) {
    let mult = 1;

    // For each defending type, check effectiveness and multiply
    for (const defType of types) {
      const defenderData = typeData[defType];
      if (!defenderData) continue;

      // Check the defender's properties against this attacking type
      if (defenderData.immuneTo?.includes(attackType)) {
        mult *= 0; // Defender is immune to this attack
      } else if (defenderData.weakTo?.includes(attackType)) {
        mult *= 2; // Defender is weak to this attack
      } else if (defenderData.resistsAgainst?.includes(attackType)) {
        mult *= 0.5; // Defender resists this attack
      }
    }

    defenses[attackType] = mult;
  }

  return defenses;
}

export function buildTypeOffensesFromJson(
  types: string[],
  typeData: TypeChartData,
): Record<string, number> {
  const offenses: Record<string, number> = {};

  // For each defending type, calculate how much damage our attacking types do
  for (const defendType of TYPES) {
    let maxMult = 1;

    // For each attacking type, check effectiveness
    for (const atkType of types) {
      const attackerData = typeData[atkType];
      if (!attackerData) continue;

      // Check the attacker's strong points against this defender
      if (attackerData.strongAgainst?.includes(defendType)) {
        maxMult = Math.max(maxMult, 2);
      }
    }

    offenses[defendType] = maxMult;
  }

  return offenses;
}

export function getTypeDefenses(types: string[]): Record<string, number> {
  const defenses: Record<string, number> = {};
  for (const attackType of TYPES) {
    let mult = 1;
    for (const defType of types) {
      mult *= getEffectiveness(attackType, defType);
    }
    defenses[attackType] = mult;
  }
  return defenses;
}

export function getTypeOffenses(types: string[]): Record<string, number> {
  const offenses: Record<string, number> = {};
  for (const defendType of TYPES) {
    let maxMult = 1;
    for (const atkType of types) {
      maxMult = Math.max(maxMult, getEffectiveness(atkType, defendType));
    }
    offenses[defendType] = maxMult;
  }
  return offenses;
}

export const typeColors: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

export type EffectivenessLabelKey =
  | "hyperEffective"
  | "superEffective"
  | "neutral"
  | "notVeryEffective"
  | "veryNotEffective"
  | "noEffect"
  | "unknown"
  | "veryWeak"
  | "weak"
  | "resistant"
  | "veryResistant"
  | "immune";

export function getEffectivenessLabel(
  multiplier: number,
  context: "attack" | "defense",
): { labelKey: EffectivenessLabelKey; color: string } {
  if (context === "attack") {
    switch (multiplier) {
      case 4:
        return { labelKey: "hyperEffective", color: "#166534" };
      case 2:
        return { labelKey: "superEffective", color: "#16a34a" };
      case 1:
        return { labelKey: "neutral", color: "#666666" };
      case 0.5:
        return { labelKey: "notVeryEffective", color: "#ea580c" };
      case 0.25:
        return { labelKey: "veryNotEffective", color: "#7f1d1d" };
      case 0:
        return { labelKey: "noEffect", color: "#374151" };
      default:
        return { labelKey: "unknown", color: "#000000" };
    }
  } else {
    // defense
    switch (multiplier) {
      case 4:
        return { labelKey: "veryWeak", color: "#7f1d1d" };
      case 2:
        return { labelKey: "weak", color: "#dc2626" };
      case 1:
        return { labelKey: "neutral", color: "#666666" };
      case 0.5:
        return { labelKey: "resistant", color: "#16a34a" };
      case 0.25:
        return { labelKey: "veryResistant", color: "#166534" };
      case 0:
        return { labelKey: "immune", color: "#60a5fa" };
      default:
        return { labelKey: "unknown", color: "#000000" };
    }
  }
}
