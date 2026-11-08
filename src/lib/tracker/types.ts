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
}

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
  types?: string[];
  heldItem?: string;
  heldItemId?: number;
  experience?: number;
  stats?: Record<string, number>;
  moves: LiveMove[];
}

export interface BattleOpponent {
  identity: string;
  pokemonId: number;
  level: number;
}

export interface GameObservation {
  id: string;
  encounterId: string;
  pokemonId: number;
  kind: "move" | "ability" | "effectiveness";
  value: string;
  attackType?: string;
  moveId?: number;
}

export interface GameFrame {
  protocolVersion: 1;
  connector: string;
  sessionId: string;
  sequence: number;
  frame: number;
  game: GameIdentity;
  party: LivePokemon[];
  location?: { id: string; name?: string };
  battle?: {
    id: string;
    kind: "wild" | "trainer";
    opponents: BattleOpponent[];
    activePlayerIdentity?: string;
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

export interface PlayerTracking {
  game: GameIdentity;
  sessionId: string;
  sequence: number;
  frame: number;
  lastSeenAt: number;
  latest: GameFrame;
  suspended: boolean;
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
  invitation?: string;
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
  | { type: "error"; message: string };

export interface HostRoomOptions {
  runId: string;
  playerId: string;
  port: number;
  allowLan: boolean;
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
  getOverlayControlConfig(runId: string): Promise<OverlayControlConfig>;
  getOverlayControl(runId: string): Promise<OverlayControl>;
  commandOverlay(input: {
    runId: string;
    command: OverlayCommand;
  }): Promise<OverlayControl>;
  subscribe(listener: (event: DesktopEvent) => void): () => void;
}

declare global {
  interface Window {
    nuztracker?: TrackerDesktopApi;
  }
}
