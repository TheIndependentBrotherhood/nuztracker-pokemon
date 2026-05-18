export interface CaptureSelectedSprite {
  url: string;
  source: "alternatives" | "default";
  label?: string;
  unownLetter?: string;
}

export interface TypeObservation {
  id: string;
  type: "immunity" | "weakness" | "resistance" | "neutral";
  observationType: string; // The type (fire, water, etc.)
  createdAt: number;
}

export interface EvolutionHistoryEntry {
  pokemonId: number;
  technicalName: string;
  timestamp: number;
}

export interface Capture {
  id: string;
  pokemon: PokemonData;
  nickname?: string;
  gender: "male" | "female" | "unknown";
  isShiny: boolean;
  isDead: boolean;
  /** If true, this is a failed capture (skipped with fail button) and cannot be resurrected */
  failedCapture?: boolean;
  /** User-discovered types for randomizer type mode (max two). */
  customTypes?: string[];
  /** The single ability of this captured Pokémon. In randomizer mode this is user-defined; in classic mode it is the ability observed in-game. */
  ability?: string;
  selectedSprite?: CaptureSelectedSprite;
  createdAt: number;
  /** Timestamp when the Pokémon died (marked as RIP) */
  diedAt?: number;
  /** ID of the original Pokémon species when first captured. Used to track evolution history in random evo mode. */
  originalCapturedPokemonId?: number;
  /** Soul Link: index (0-3) of the player who owns this capture */
  playerIndex?: number;
  /** Soul Link: index (0-3) of the player whose action caused this Pokémon's death */
  killedByPlayerIndex?: number;
}

export interface RandomizerOptions {
  randomizeTypes: boolean;
  randomizeAbilities: boolean;
  randomizeEncounters: boolean;
  randomizeEvolvedForms: boolean;
}

/** A player in a Soul Link run */
export interface SoulLinkPlayer {
  id: string;
  name: string;
  /** 0 = P1 (blue), 1 = P2 (red), 2 = P3 (orange), 3 = P4 (green) */
  playerIndex: 0 | 1 | 2 | 3;
}

/** Colors associated with each Soul Link player index */
export const SOUL_LINK_PLAYER_COLORS: Record<number, string> = {
  0: "#3b82f6", // blue  – P1
  1: "#ef4444", // red   – P2
  2: "#f97316", // orange – P3
  3: "#22c55e", // green  – P4
};

/** MissingNo placeholder Pokémon used when a Soul Link player has no capture in a zone */
export const MISSINGNO_POKEMON: PokemonData = {
  id: -1,
  technicalName: "missingno",
  names: { fr: "???", en: "???" },
  generation: 1,
  types: ["normal"],
  abilities: [],
  stats: [],
  height: 0,
  weight: 0,
  sprites: {
    normal: {
      default:
        "https://projectpokemon.org/home/uploads/monthly_2017_07/missingno.png.4bc4f1920385390a41f267dd8f15b2ed.png",
      alternatives: [],
    },
    shiny: {
      default:
        "https://projectpokemon.org/home/uploads/monthly_2017_07/missingno.png.4bc4f1920385390a41f267dd8f15b2ed.png",
      alternatives: [],
    },
  },
};

export interface Zone {
  id: string;
  zoneName: string;
  zoneNames?: {
    fr?: string;
    en?: string;
  };
  regionArea: string;
  status: "not-visited" | "visited" | "captured" | "lost";
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
  /** Soul Link mode: links up to 4 players' runs together */
  isSoulLinkMode?: boolean;
  /** Soul Link players (P1–P4). Only present when isSoulLinkMode is true. */
  soulLinkPlayers?: SoulLinkPlayer[];
  /** Per-player teams in Soul Link mode. Key = playerIndex (0-3). */
  playerTeams?: Record<number, Capture[]>;
  randomizerOptions?: RandomizerOptions;
  /** User-discovered types for randomizer type mode, indexed by pokemon id. */
  customTypesByPokemonId?: Record<number, string[]>;
  /** Player-defined ability panel (up to 3) per Pokémon species in randomizer mode. */
  customAbilitiesByPokemonId?: Record<number, string[]>;
  /** Type observations for Pokédex exploration, indexed by pokemon id. Used for type deduction. */
  pokedexObservationsByPokemonId?: Record<number, TypeObservation[]>;
  /** Global notes for each Pokémon species in Pokédex, indexed by pokemon id. */
  pokedexNotesByPokemonId?: Record<number, string>;
  /** Evolution history (genealogy) for each Pokémon species, indexed by pokemon id. Tracks all evolution steps from first capture to current form. */
  evolutionHistoryByPokemonId?: Record<number, EvolutionHistoryEntry[]>;
  status: "in-progress" | "completed" | "abandoned";
  zones: Zone[];
  team: Capture[];
  typeChartGeneration: "gen1" | "gen2-5" | "gen6+";
  createdAt: number;
  updatedAt: number;
  /** When true the run is synced to Firebase Firestore in real time. */
  cloudSyncEnabled?: boolean;
  /** Firebase anonymous UID of the run creator. Set on first cloud sync. */
  ownerUid?: string;
}

export type ZoneStatus = "not-visited" | "visited" | "captured" | "lost";

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
