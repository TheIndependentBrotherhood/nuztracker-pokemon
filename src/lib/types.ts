export interface Capture {
  id: string;
  pokemonId: number;
  pokemonName: string;
  nickname?: string;
  level: number;
  gender: "male" | "female" | "unknown";
  isShiny: boolean;
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
  status: "in-progress" | "completed" | "abandoned";
  zones: Zone[];
  team: Capture[];
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
