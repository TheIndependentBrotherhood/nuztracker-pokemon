import type { Run } from "../types";
import type {
  OverlayCommand,
  OverlayControl,
  OverlayControlConfig,
} from "./overlay-control";

export interface GameIdentity {
  gameCode: string;
  revision: number;
  language: string;
  romHash: string;
  trainerId: string;
}

export type MoveCategory = "physical" | "special" | "status";

export interface LiveMove {
  id: number;
  name?: string;
  pp: number;
  maxPp?: number;
  type?: string;
  category?: MoveCategory;
  power?: number;
  accuracy?: number;
  // The ROM replaced this move id (hacks): its name and data come from the ROM, not vanilla tables.
  custom?: boolean;
}

/** Battle stats that in-game moves and abilities raise or lower by stages. */
export const STAT_STAGE_NAMES = [
  "attack",
  "defense",
  "speed",
  "special-attack",
  "special-defense",
  "accuracy",
  "evasion",
] as const;
export type StatStageName = (typeof STAT_STAGE_NAMES)[number];
/** In-battle stat stages from -6 to +6; neutral stats are omitted. */
export type StatStages = Partial<Record<StatStageName, number>>;

export interface LivePokemon {
  identity: string;
  pokemonId: number;
  nickname?: string;
  level: number;
  hp: number;
  maxHp: number;
  status: string;
  isEgg: boolean;
  isShiny: boolean;
  gender: "male" | "female" | "unknown";
  nature?: string;
  ability?: string;
  abilityId?: number;
  // The ROM replaced this ability id: `ability` holds its ROM name.
  customAbility?: boolean;
  types?: string[];
  heldItem?: string;
  heldItemId?: number;
  experience?: number;
  friendship?: number;
  hiddenPower?: HiddenPower;
  stats?: Record<string, number>;
  // Only while the Pokémon is on the field in battle.
  statStages?: StatStages;
  /** In-battle weight in hectograms, as used by weight-based moves. */
  weight?: number;
  moves: LiveMove[];
  // Level of every level-up move of the species, read from the ROM (randomizer-aware).
  learnLevels?: number[];
  // Evolution methods of the species, read from the ROM (randomizer-aware).
  evolutions?: LiveEvolution[];
}

export interface HiddenPower {
  type: string;
  power: number;
}

/** Raw evolution entry: game method code, its parameter (level, item, move or species) and the target species. */
export interface LiveEvolution {
  method: number;
  param: number;
  target: number;
  // ROM name of the required move when a hack replaced or added it.
  moveName?: string;
}

export interface BattleOpponent {
  identity: string;
  pokemonId: number;
  level: number;
  position?: number;
  gender?: "male" | "female" | "unknown";
  statStages?: StatStages;
  learnLevels?: number[];
  evolutions?: LiveEvolution[];
  weight?: number;
  /** Only moves actually revealed during this battle, never the hidden moveset. */
  movePp?: RevealedMovePp[];
}

export interface RevealedMovePp {
  id: number;
  pp: number;
  maxPp: number;
}

export interface GameObservation {
  id: string;
  encounterId: string;
  pokemonId: number;
  kind: "move" | "ability" | "effectiveness";
  value: string;
  attackType?: string;
  moveId?: number;
  abilityId?: number;
  // The ROM replaced this move or ability id: `value` and `move` describe it instead of vanilla tables.
  custom?: boolean;
  move?: Pick<LiveMove, "type" | "category" | "power" | "accuracy">;
}

export type EncounterMethod =
  "grass" | "surf" | "old-rod" | "good-rod" | "super-rod";
/** Grass slots that only apply at a time of day, during a swarm, with the Poké Radar or a GBA cartridge. */
export type EncounterCondition =
  | "morning"
  | "day"
  | "night"
  | "swarm"
  | "radar"
  | "ruby"
  | "sapphire"
  | "emerald"
  | "firered"
  | "leafgreen";
/** One species of a map's wild table; `rate` is the sum of its slot chances, in percent. */
export interface ZoneEncounter {
  method: EncounterMethod;
  condition?: EncounterCondition;
  pokemonId: number;
  rate: number;
  minLevel: number;
  maxLevel: number;
}

export interface GameFrame {
  protocolVersion: 1;
  connector: string;
  sessionId: string;
  sequence: number;
  frame: number;
  game: GameIdentity;
  party: LivePokemon[];
  location?: {
    id: string;
    name?: string;
    // Maps sharing a wild table share this id; absent when the connector cannot read the ROM tables.
    encounterTableId?: number;
    encounters?: ZoneEncounter[];
  };
  battle?: {
    id: string;
    kind: "wild" | "trainer";
    opponents: BattleOpponent[];
    activePlayerIdentity?: string;
    activePlayerIdentities?: string[];
    allies?: BattleOpponent[];
    isDouble?: boolean;
  };
  observations: GameObservation[];
  stateLoaded?: boolean;
  // Total items in the Poké Ball pocket, when the connector can read the bag.
  pokeBalls?: number;
  warnings?: string[];
}

export interface SavedObservation extends GameObservation {
  playerId: string;
  gameKey: string;
  observedAt: number;
}

// Why a new party Pokémon could not be linked to a zone automatically.
export type PendingReason =
  "zone-taken" | "unknown-zone" | "ambiguous-zone" | "no-encounter";

export interface PendingDetail {
  reason: PendingReason;
  zoneId?: string;
}

export interface RewindCheckpoint {
  frame: number;
  party: { identity: string; pokemonId: number; level: number }[];
}

export interface PlayerTracking {
  game: GameIdentity;
  sessionId: string;
  sequence: number;
  frame: number;
  lastSeenAt: number;
  latest: GameFrame;
  suspended: boolean;
  // Team snapshot taken before a rewind; tracking resumes once the game matches it again.
  rewindCheckpoint?: RewindCheckpoint;
  // Set once the player first holds a Poké Ball; deaths before it need the player's decision.
  nuzlockeStartedAt?: number;
  pendingPokemon: LivePokemon[];
  pendingDetails?: Record<string, PendingDetail>;
  ignoredIdentities: string[];
  zoneMappings: Record<string, string>;
  retiredSessions: string[];
  seenEncounters?: {
    id: string;
    gameKey: string;
    locationId: string;
    locationName?: string;
    encounterTableId?: number;
    pokemonId: number;
    level: number;
    observedAt: number;
  }[];
}

export interface HistoryEntry {
  id: string;
  at: number;
  playerId: string;
  kind:
    | "manual"
    | "capture"
    | "death"
    | "evolution"
    | "observation"
    | "connection"
    | "rollback";
  message: string;
}

export interface RunRecord {
  formatVersion: 1;
  revision: number;
  run: Run;
  history: HistoryEntry[];
  tracking: Record<string, PlayerTracking>;
  observations: SavedObservation[];
}

export interface RunEdit {
  id: string;
  runId: string;
  playerId: string;
  before: Run;
  after: Run;
}

export interface RoomParticipant {
  playerId: string;
  name: string;
  connected: boolean;
}

export interface RoomStatus {
  mode:
    | "offline"
    | "hosting"
    | "joining"
    | "connected"
    | "disconnected"
    | "conflict";
  runId?: string;
  playerId?: string;
  address?: string;
  // Every reachable room address when the host has several network interfaces.
  addresses?: string[];
  invitation?: string;
  // True when the room is encrypted (WSS).
  secure?: boolean;
  participants: RoomParticipant[];
  pendingCount: number;
  error?: string;
}

export interface BridgeStatus {
  url: string;
  token: string;
  runId?: string;
  playerId?: string;
  lastSeenAt?: number;
  error?: string;
}

export interface DesktopStatus {
  room: RoomStatus;
  bridge: BridgeStatus;
  storagePath: string;
  melonDs?: {
    romName: string;
    gameCode: string;
    revision: number;
    port?: number;
    state: "disconnected" | "waiting" | "tracking";
    attached: boolean;
    layout?: "standard" | "project-pm";
  };
}

export type DesktopEvent =
  | { type: "record"; record: RunRecord }
  | { type: "deleted"; runId: string }
  | { type: "status"; status: DesktopStatus }
  | { type: "battle-focus"; runId: string; playerId: string; battleId: string }
  | { type: "error"; message: string };

export interface HostRoomOptions {
  runId: string;
  playerId: string;
  port: number;
  allowLan: boolean;
  // Encrypt the room with WSS so partners can join over the Internet.
  secure?: boolean;
  // Public IP or domain partners use, e.g. after forwarding the port on the router.
  publicHost?: string;
  resetCredentials?: boolean;
}

export interface JoinRoomOptions {
  address: string;
  invitation: string;
  playerId: string;
}

export interface LinkPokemonInput {
  runId: string;
  playerId: string;
  identity: string;
  zoneId: string;
  captureId?: string;
  soulLinkGroupId?: string;
}

export interface MapZoneInput {
  runId: string;
  playerId: string;
  locationId: string;
  zoneId: string;
}

/** Desktop window chrome: custom title bar beside the system buttons and always-on-top pin. */
export interface DesktopWindowState {
  alwaysOnTop: boolean;
  titleBar: boolean;
}

export interface TrackerDesktopApi {
  listRuns(): Promise<RunRecord[]>;
  createRun(record: RunRecord): Promise<RunRecord>;
  editRun(edit: RunEdit): Promise<RunRecord>;
  deleteRun(runId: string): Promise<void>;
  importRuns(records: RunRecord[]): Promise<RunRecord[]>;
  getStatus(): Promise<DesktopStatus>;
  hostRoom(options: HostRoomOptions): Promise<DesktopStatus>;
  joinRoom(options: JoinRoomOptions): Promise<DesktopStatus>;
  reconnectRoom(): Promise<DesktopStatus>;
  leaveRoom(): Promise<DesktopStatus>;
  bindBridge(input: {
    runId: string;
    playerId: string;
  }): Promise<DesktopStatus>;
  saveConnector(): Promise<boolean>;
  selectMelonDsRom(): Promise<boolean>;
  connectMelonDs(input: {
    runId: string;
    playerId: string;
    port: number;
    confirmRomMatch: true;
  }): Promise<DesktopStatus>;
  disconnectMelonDs(): Promise<DesktopStatus>;
  linkPokemon(input: LinkPokemonInput): Promise<RunRecord>;
  mapZone(input: MapZoneInput): Promise<RunRecord>;
  resumeTracking(input: {
    runId: string;
    playerId: string;
  }): Promise<RunRecord>;
  openCompact(runId: string): Promise<void>;
  getOverlayUrl(runId: string): Promise<string>;
  copyText(text: string): Promise<void>;
  getOverlayControlConfig(runId: string): Promise<OverlayControlConfig>;
  getOverlayControl(runId: string): Promise<OverlayControl>;
  commandOverlay(input: {
    runId: string;
    command: OverlayCommand;
  }): Promise<OverlayControl>;
  getWindowState(): Promise<DesktopWindowState>;
  setAlwaysOnTop(value: boolean): Promise<DesktopWindowState>;
  subscribe(listener: (event: DesktopEvent) => void): () => void;
}

declare global {
  interface Window {
    nuztracker?: TrackerDesktopApi;
  }
}
