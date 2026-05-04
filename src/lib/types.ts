export interface CaptureSelectedSprite {
  url: string;
  source: "deviantart" | "animated-catalog" | "static";
  label?: string;
  unownLetter?: string;
  flabebeColor?: "red" | "orange" | "yellow" | "blue" | "white";
}

export interface Capture {
  id: string;
  pokemonId: number;
  pokemonName: string;
  pokemonNames?: {
    fr?: string;
    en?: string;
  };
  nickname?: string;
  gender: "male" | "female" | "unknown";
  isShiny: boolean;
  isDead: boolean;
  /** User-discovered types for randomizer type mode (max two). */
  customTypes?: string[];
  selectedSprite?: CaptureSelectedSprite;
  /** For Unown captures: the chosen letter form, e.g. "a"–"z", "!", "?" */
  unownLetter?: string;
  /** For Flabebe captures: the chosen flower color form. */
  flabebeColor?: "red" | "orange" | "yellow" | "blue" | "white";
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
  status: "in-progress" | "completed" | "abandoned";
  zones: Zone[];
  team: Capture[];
  typeChartGeneration: "gen1" | "gen2-5" | "gen6+";
  createdAt: number;
  updatedAt: number;
}

export type ZoneStatus = "not-visited" | "visited" | "captured";

export interface PokemonType {
  name: string;
  url: string;
}

export interface PokemonStat {
  base_stat: number;
  stat: { name: string };
}

export interface PokemonApiData {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    front_shiny: string;
  };
  types: Array<{ type: PokemonType }>;
  stats: PokemonStat[];
  base_experience: number;
  height: number;
  weight: number;
}

export interface TypeEffectiveness {
  [attackingType: string]: number;
}
