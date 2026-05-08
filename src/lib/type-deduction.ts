import { TypeObservation } from "./types";
import { getTypeDefenses, TYPES } from "./type-chart";

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
 * Check if a single type matches an observation
 */
function typeMatchesObservation(
  type: string,
  observation: TypeObservation,
): boolean {
  const defense = getTypeDefenses([type]);

  switch (observation.type) {
    case "immunity":
      // Immunity: the observed type should deal 0x damage
      return (defense[observation.observationType] ?? 1) === 0;

    case "weakness":
      // Weakness: the observed type should deal 2x damage
      return (defense[observation.observationType] ?? 1) === 2;

    case "resistance":
      // Resistance: the observed type should deal 0.5x damage
      return (defense[observation.observationType] ?? 1) === 0.5;

    default:
      return false;
  }
}

/**
 * Check if a type combination matches all observations
 */
function typeComboMatchesObservations(
  types: string[],
  observations: TypeObservation[],
): boolean {
  if (observations.length === 0) return true;

  for (const obs of observations) {
    let matches = false;

    // For each type in the combo, check if it matches the observation
    for (const type of types) {
      if (typeMatchesObservation(type, obs)) {
        matches = true;
        break;
      }
    }

    // If no type in the combo matches this observation, the combo is invalid
    if (!matches) return false;
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
export function deducePossibleTypes(
  observations: TypeObservation[],
  abilityPanel: string[] = [],
): TypePossibility[] {
  if (observations.length === 0) {
    // No observations yet, all types are possible
    return generateAllTypeCombos().map((types) => ({
      types,
      abilityImpacts: [],
      matchScore: 0,
    }));
  }

  const validCombos = generateAllTypeCombos().filter((combo) =>
    typeComboMatchesObservations(combo, observations),
  );

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
export function scoreTypeCombo(
  types: string[],
  observations: TypeObservation[],
): number {
  let explained = 0;

  for (const obs of observations) {
    for (const type of types) {
      if (typeMatchesObservation(type, obs)) {
        explained++;
        break;
      }
    }
  }

  return observations.length > 0 ? (explained / observations.length) * 100 : 0;
}
