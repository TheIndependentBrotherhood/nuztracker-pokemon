import { TypeObservation } from "./types";
import {
  getTypeDefenses,
  TYPES,
  loadTypeData,
  buildTypeDefensesFromJson,
} from "./type-chart";

/**
 * Type deduction logic for Pokédex exploration mode
 * Given observations (immunity, weakness, resistance), determine possible types
 */

export interface AbilityImpact {
  abilityName: string;
  immunitiesAdded: string[];
  weaknessesAdded: string[];
  resistancesAdded: string[];
}

export interface TypePossibility {
  types: string[]; // 1 or 2 types
  abilityImpacts: AbilityImpact[]; // How abilities from panel affect this typing
  matchScore: number; // How many observations this fully explains (0-100%)
}

/**
 * Check if a type combination matches all observations
 */
async function typeComboMatchesObservations(
  types: string[],
  observations: TypeObservation[],
  generation: "gen1" | "gen2-5" | "gen6+" = "gen6+",
): Promise<boolean> {
  if (observations.length === 0) return true;

  // Load type data for the generation
  const typeData = await loadTypeData(generation);

  // Calculate the combined defense for this type combo
  const defenses = buildTypeDefensesFromJson(types, typeData);

  // Check if all observations match this combined defense
  for (const obs of observations) {
    const defenseValue = defenses[obs.observationType] ?? 1;

    switch (obs.type) {
      case "immunity":
        // Immunity: should deal 0x damage
        if (defenseValue !== 0) return false;
        break;
      case "weakness":
        // Weakness: should deal 2x damage
        if (defenseValue !== 2) return false;
        break;
      case "resistance":
        // Resistance: should deal 0.5x damage
        if (defenseValue !== 0.5) return false;
        break;
      case "neutral":
        // Neutral: should deal 1x damage
        if (defenseValue !== 1) return false;
        break;
    }
  }

  return true;
}

/**
 * Get all possible type combinations (mono or dual type)
 */
function generateAllTypeCombos(): string[][] {
  const combos: string[][] = [];

  // Mono types
  for (const type of TYPES) {
    combos.push([type]);
  }

  // Dual types
  for (let i = 0; i < TYPES.length; i++) {
    for (let j = i + 1; j < TYPES.length; j++) {
      combos.push([TYPES[i], TYPES[j]]);
    }
  }

  return combos;
}

/**
 * Get ability impact on type effectiveness (from applyAbilityModifiers logic)
 * Returns the effectiveness multiplier for a specific type matchup
 */
function getAbilityModifierForTypeMatchup(
  abilityName: string,
  defendingType: string,
  incomingAttackType: string,
): number {
  // This is a simplified version - in a full implementation, you'd check the ability database
  // For now, we return 1 (no change) - the actual impact checking is done elsewhere
  return 1;
}

/**
 * Deduce possible types from observations
 * Returns matching type combinations, ordered by how well they match
 */
export async function deducePossibleTypes(
  observations: TypeObservation[],
  abilityPanel: string[] = [],
  generation: "gen1" | "gen2-5" | "gen6+" = "gen6+",
): Promise<TypePossibility[]> {
  if (observations.length === 0) {
    // No observations yet, all types are possible
    return generateAllTypeCombos().map((types) => ({
      types,
      abilityImpacts: [],
      matchScore: 0,
    }));
  }

  const validCombos: string[][] = [];
  for (const combo of generateAllTypeCombos()) {
    if (await typeComboMatchesObservations(combo, observations, generation)) {
      validCombos.push(combo);
    }
  }

  return validCombos.map((types) => ({
    types,
    abilityImpacts: abilityPanel.map((ability) => ({
      abilityName: ability,
      immunitiesAdded: [],
      weaknessesAdded: [],
      resistancesAdded: [],
    })),
    matchScore: 100, // Perfect match
  }));
}

/**
 * Check how many observations a type combo actually explains
 * (used for filtering/scoring when user has contradictory notes)
 */
export async function scoreTypeCombo(
  types: string[],
  observations: TypeObservation[],
  generation: "gen1" | "gen2-5" | "gen6+" = "gen6+",
): Promise<number> {
  const typeData = await loadTypeData(generation);
  const defenses = buildTypeDefensesFromJson(types, typeData);

  let explained = 0;

  for (const obs of observations) {
    const defenseValue = defenses[obs.observationType] ?? 1;
    let matches = false;

    switch (obs.type) {
      case "immunity":
        matches = defenseValue === 0;
        break;
      case "weakness":
        matches = defenseValue === 2;
        break;
      case "resistance":
        matches = defenseValue === 0.5;
        break;
      case "neutral":
        matches = defenseValue === 1;
        break;
    }

    if (matches) explained++;
  }

  return observations.length > 0 ? (explained / observations.length) * 100 : 0;
}
