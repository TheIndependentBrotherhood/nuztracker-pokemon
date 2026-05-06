export interface CaptureSelectedSprite {
  url: string;
  source: "alternatives" | "default";
  label?: string;
  unownLetter?: string;
}

export interface Capture {
  id: string;
  pokemon: PokemonData;
  nickname?: string;
  gender: "male" | "female" | "unknown";
  isShiny: boolean;
  isDead: boolean;
  /** User-discovered types for randomizer type mode (max two). */
  customTypes?: string[];
  /** The single ability of this captured Pokémon. In randomizer mode this is user-defined; in classic mode it is the ability observed in-game. */
  ability?: string;
  selectedSprite?: CaptureSelectedSprite;
  createdAt: number;
}

export interface RandomizerOptions {
  randomizeTypes: boolean;
  randomizeAbilities: boolean;
  randomizeEncounters: boolean;
  randomizeEvolvedForms: boolean;
}

export interface Zone {
  id: string;
  zoneName: string;
  zoneNames?: {
    fr?: string;
    en?: string;
  };
  regionArea: string;
  status: "not-visited" | "visited" | "captured";
  captures: Capture[];
  updatedAt: number;
}

export interface Run {
  id: string;
  gameName: string;
  region: string;
  difficulty: "easy" | "normal" | "hard";
  isShinyHuntMode: boolean;
  isRandomMode: boolean;
  randomizerOptions?: RandomizerOptions;
  /** User-discovered types for randomizer type mode, indexed by pokemon id. */
  customTypesByPokemonId?: Record<number, string[]>;
  /** Player-defined ability panel (up to 3) per Pokémon species in randomizer mode. */
  customAbilitiesByPokemonId?: Record<number, string[]>;
  status: "in-progress" | "completed" | "abandoned";
  zones: Zone[];
  team: Capture[];
  typeChartGeneration: "gen1" | "gen2-5" | "gen6+";
  createdAt: number;
  updatedAt: number;
}

export type ZoneStatus = "not-visited" | "visited" | "captured";

export interface PokemonStat {
  base_stat: number;
  stat: { name: string };
}

export interface PokemonAbility {
  ability: { name: string; url: string };
  is_hidden: boolean;
  slot: number;
}

export interface PokemonData {
  id: number;
  technicalName: string;
  alternativeTechnicalNames?: string[];
  names?: { fr?: string; en?: string };
  generation: number;
  types: string[];
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  height: number;
  weight: number;
  sprites: {
    normal: { default: string; alternatives: string[]; excludeUrls?: string[] };
    shiny: { default: string; alternatives: string[]; excludeUrls?: string[] };
  };
}

export interface TypeEffectiveness {
  [attackingType: string]: number;
}
