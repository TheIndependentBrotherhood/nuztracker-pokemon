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
 * Get ability's immunity types from its name
 * Maps ability names to types they provide immunity to
 * Special case: "wonder-guard" creates immunity to all non-super-effective types
 */
function getAbilityImmunities(abilityName: string): string[] {
  const IMMUNITY_MAP: Record<string, string[]> = {
    "water-absorb": ["water"],
    "flash-fire": ["fire"],
    levitate: ["ground"],
    "sap-sipper": ["grass"],
    "lightning-rod": ["electric"],
    "volt-absorb": ["electric"],
    "dry-skin": ["water"],
    "storm-drain": ["water"],
    "earth-eater": ["ground"],
  };
  return IMMUNITY_MAP[abilityName] ?? [];
}

/**
 * Check if an ability is Wonder Guard (Garde Mystik)
 */
function isWonderGuard(abilityName: string): boolean {
  return abilityName === "wonder-guard";
}

/**
 * Check if a type combination matches all observations
 * Considers both type-based and ability-based immunities
 */
async function typeComboMatchesObservations(
  types: string[],
  observations: TypeObservation[],
  abilityPanel: string[] = [],
  generation: "gen1" | "gen2-5" | "gen6+" = "gen6+",
): Promise<boolean> {
  if (observations.length === 0) return true;

  // Load type data for the generation
  const typeData = await loadTypeData(generation);

  // Calculate the combined defense for this type combo
  const defenses = buildTypeDefensesFromJson(types, typeData);

  // Check if Garde Mystik is in the panel
  const hasWonderGuard = abilityPanel.some((ability) => isWonderGuard(ability));

  // Check if all observations match this combined defense or ability panel
  for (const obs of observations) {
    const defenseValue = defenses[obs.observationType] ?? 1;

    switch (obs.type) {
      case "immunity":
        // Immunity: should deal 0x damage from type
        // OR should be immunized by ability
        const typeImmune = defenseValue === 0;

        // Check specific type immunities
        const specificAbilityImmune = abilityPanel.some((ability) => {
          const immunities = getAbilityImmunities(ability);
          return immunities.includes(obs.observationType);
        });

        // Check Wonder Guard: immunizes all types except those that are super-effective (weakness >= 2x)
        const wonderGuardImmune = hasWonderGuard && defenseValue < 2; // < 2 means not a weakness (includes 0, 0.25, 0.5, 1)

        if (!typeImmune && !specificAbilityImmune && !wonderGuardImmune) {
          return false;
        }
        break;

      case "weakness":
        // Weakness: should deal 2x+ damage (from type, not from ability)
        // This includes 2x, 4x (double weakness), etc.
        if (defenseValue < 2) return false;
        break;

      case "resistance":
        // Resistance: should deal reduced damage (0 < defenseValue < 1)
        // This includes 0.5x, 0.25x, etc.
        if (defenseValue <= 0 || defenseValue >= 1) return false;
        break;

      case "neutral":
        // Neutral: should deal exactly 1x damage
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
    if (
      await typeComboMatchesObservations(
        combo,
        observations,
        abilityPanel,
        generation,
      )
    ) {
      validCombos.push(combo);
    }
  }

  // Load type data for displaying ability impacts
  const typeData = await loadTypeData(generation);

  return validCombos.map((types) => ({
    types,
    abilityImpacts: abilityPanel.map((ability) => {
      const specificImmunities = getAbilityImmunities(ability);
      let immunitiesAdded = specificImmunities;

      // For Wonder Guard, show that it immunizes all non-weakness types
      if (isWonderGuard(ability)) {
        const defenses = buildTypeDefensesFromJson(types, typeData);
        immunitiesAdded = TYPES.filter((type) => {
          const defenseValue = defenses[type] ?? 1;
          return defenseValue < 2; // Everything except super-effective (weakness >= 2x)
        });
      }

      return {
        abilityName: ability,
        immunitiesAdded,
        weaknessesAdded: [],
        resistancesAdded: [],
      };
    }),
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
