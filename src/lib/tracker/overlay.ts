import type {
  BattleOpponent,
  BridgeStatus,
  LiveEvolution,
  LivePokemon,
  RunRecord,
} from "./types";
import type {
  Capture,
  PokemonData,
  PokemonStat,
  Run,
  StatAnnotations,
} from "../types";
import {
  getPlayerId,
  knowledgeForCapture,
  knowledgeForPlayer,
} from "./knowledge";
import { pokemonForGame } from "../game-reference";
import { getCaptureTypesForRun } from "../capture-types";
import { defaultOverlayControl, type OverlayControl } from "./overlay-control";
import { overlayControlSchema } from "./overlay-control";
import { livePokemonSchema } from "./schema";
import { z } from "zod";
import { POKEMON_STAT_NAMES } from "../types";
import { GAME_VERSIONS, type GameVersionId } from "../game-catalog";
import { zoneIdForMapName } from "../zones";
import { gameKey } from "./live";

export interface OverlayMember {
  id: string;
  pokemonId: number;
  identity?: string;
  isDead?: boolean;
  isShiny?: boolean;
  name: string;
  /** Localized species names, only when the Pokémon has no nickname. */
  names?: { fr?: string; en?: string };
  spriteUrl: string;
  fallbackSpriteUrl: string;
  types: string[];
  live?: LivePokemon;
  /** Opponent only: level of every level-up move, from the ROM. */
  learnLevels?: number[];
  /** Opponent only: evolution methods, from the ROM. */
  evolutions?: LiveEvolution[];
  /** Opponent only: moves seen used by this species, most recent first. */
  seenMoves?: number[];
  /** Opponent only: abilities the game revealed for this species, most recent first. */
  seenAbilities?: number[];
  bst: number;
  baseStats?: PokemonStat[];
  annotations?: StatAnnotations;
  randomStats: boolean;
}
export interface OverlayTeam {
  playerId: string;
  name: string;
  playerIndex: number;
  lastSeenAt: number;
  activeIdentity?: string;
  inBattle: boolean;
  suspended: boolean;
  sourceError: boolean;
  location?: string;
  locationNames?: { fr?: string; en?: string };
  members: OverlayMember[];
}
export interface OverlayData {
  gameName: string;
  gameVersion?: GameVersionId;
  updatedAt: number;
  deaths: number;
  control: OverlayControl;
  teams: OverlayTeam[];
}

export const overlaySchema: z.ZodType<OverlayData> = z.object({
  gameName: z.string(),
  gameVersion: z.enum(GAME_VERSIONS.map((game) => game.id)).optional(),
  updatedAt: z.number(),
  deaths: z.number(),
  control: overlayControlSchema,
  teams: z.array(
    z.object({
      playerId: z.string(),
      name: z.string(),
      playerIndex: z.number(),
      lastSeenAt: z.number(),
      activeIdentity: z.string().optional(),
      inBattle: z.boolean(),
      suspended: z.boolean(),
      sourceError: z.boolean(),
      location: z.string().optional(),
      locationNames: z
        .object({ fr: z.string().optional(), en: z.string().optional() })
        .optional(),
      members: z.array(
        z.object({
          id: z.string(),
          pokemonId: z.number(),
          identity: z.string().optional(),
          isDead: z.boolean().optional(),
          isShiny: z.boolean().optional(),
          name: z.string(),
          names: z
            .object({ fr: z.string().optional(), en: z.string().optional() })
            .optional(),
          spriteUrl: z.string(),
          fallbackSpriteUrl: z.string(),
          types: z.array(z.string()),
          live: livePokemonSchema.optional(),
          bst: z.number(),
          randomStats: z.boolean(),
          baseStats: z
            .array(
              z.object({
                base_stat: z.number(),
                stat: z.object({ name: z.string() }),
              }),
            )
            .optional(),
          annotations: z
            .partialRecord(z.enum(POKEMON_STAT_NAMES), z.enum(["high", "low"]))
            .optional(),
        }),
      ),
    }),
  ),
});

// The in-game map name is English; a matching run zone provides its localized names.
function teamLocation(
  record: RunRecord,
  playerId: string,
): Pick<OverlayTeam, "location" | "locationNames"> {
  const tracking = record.tracking[playerId];
  const location = tracking?.latest.location;
  if (!location) return {};
  const mappedId = tracking.zoneMappings[location.id];
  const matchedId =
    mappedId ??
    (location.name
      ? zoneIdForMapName(record.run.zones, location.name)
      : undefined);
  const zone = record.run.zones.find((entry) => entry.id === matchedId);
  const names = zone?.zoneNames;
  return {
    location: location.name ?? zone?.zoneName ?? location.id,
    ...(names?.fr || names?.en
      ? {
          locationNames: {
            ...(names.fr ? { fr: names.fr } : {}),
            ...(names.en ? { en: names.en } : {}),
          },
        }
      : {}),
  };
}

export function overlayData(
  record: RunRecord,
  bridge?: BridgeStatus,
): OverlayData {
  const { run } = record;
  const players =
    run.isSoulLinkMode && run.soulLinkPlayers
      ? run.soulLinkPlayers
      : [{ id: getPlayerId(run), name: run.gameName, playerIndex: 0 }];
  return {
    gameName: run.gameName,
    gameVersion: run.gameVersion,
    updatedAt: run.updatedAt,
    deaths: run.zones
      .flatMap((zone) => zone.captures)
      .filter((capture) => capture.isDead && !capture.failedCapture).length,
    control: defaultOverlayControl(),
    teams: players.map((player) => ({
      playerId: player.id,
      name: player.name,
      playerIndex: player.playerIndex,
      lastSeenAt:
        bridge?.runId === run.id && bridge.playerId === player.id
          ? (bridge.lastSeenAt ?? 0)
          : (record.tracking[player.id]?.lastSeenAt ?? 0),
      activeIdentity:
        record.tracking[player.id]?.latest.battle?.activePlayerIdentity,
      inBattle: Boolean(record.tracking[player.id]?.latest.battle),
      suspended: Boolean(record.tracking[player.id]?.suspended),
      sourceError: Boolean(
        bridge?.runId === run.id &&
        bridge.playerId === player.id &&
        bridge.error,
      ),
      ...teamLocation(record, player.id),
      members: partyMembers(record, player).map((capture) => ({
        id: capture.id,
        pokemonId: capture.pokemon.id,
        identity: capture.gameIdentity,
        ...(capture.isDead ? { isDead: true } : {}),
        ...(capture.isShiny ? { isShiny: true } : {}),
        ...(!capture.nickname && capture.pokemon.names
          ? { names: capture.pokemon.names }
          : {}),
        name:
          capture.nickname ??
          capture.pokemon.names?.en ??
          capture.pokemon.technicalName,
        spriteUrl:
          capture.selectedSprite?.url ??
          (capture.isShiny
            ? capture.pokemon.sprites.shiny.default
            : capture.pokemon.sprites.normal.default),
        fallbackSpriteUrl: capture.isShiny
          ? capture.pokemon.sprites.shiny.default
          : capture.pokemon.sprites.normal.default,
        types:
          run.isRandomMode && run.randomizerOptions?.randomizeTypes
            ? (capture.customTypes ??
              knowledgeForCapture(run, capture).customTypesByPokemonId?.[
                capture.pokemon.id
              ] ??
              [])
            : getCaptureTypesForRun(capture, run, capture.pokemon.types),
        live: record.tracking[player.id]?.latest.party.find(
          (pokemon) => pokemon.identity === capture.gameIdentity,
        ),
        bst: pokemonForGame(capture.pokemon, run.gameVersion).stats.reduce(
          (sum, stat) => sum + stat.base_stat,
          0,
        ),
        baseStats:
          run.isRandomMode && run.randomizerOptions?.randomizeStats
            ? undefined
            : pokemonForGame(capture.pokemon, run.gameVersion).stats,
        annotations: knowledgeForCapture(run, capture)
          .statAnnotationsByPokemonId?.[capture.pokemon.id],
        randomStats: Boolean(
          run.isRandomMode && run.randomizerOptions?.randomizeStats,
        ),
      })),
    })),
  };
}

export type SpriteMember = Pick<
  OverlayMember,
  | "id"
  | "name"
  | "names"
  | "spriteUrl"
  | "fallbackSpriteUrl"
  | "types"
  | "isDead"
>;

export function opponentMember(
  run: Run,
  playerId: string,
  opponent: BattleOpponent,
  reference: PokemonData,
  seenMoves: number[] = [],
  seenAbilities: number[] = [],
): OverlayMember {
  const pokemon = pokemonForGame(reference, run.gameVersion);
  const knowledge = knowledgeForPlayer(run, playerId);
  const randomStats = Boolean(
    run.isRandomMode && run.randomizerOptions?.randomizeStats,
  );
  return {
    id: `opponent-${opponent.identity}`,
    identity: opponent.identity,
    pokemonId: pokemon.id,
    name: pokemon.names?.en ?? pokemon.technicalName,
    names: pokemon.names,
    spriteUrl: pokemon.sprites.normal.default,
    fallbackSpriteUrl: pokemon.sprites.normal.default,
    types:
      run.isRandomMode && run.randomizerOptions?.randomizeTypes
        ? (knowledge.customTypesByPokemonId?.[pokemon.id] ?? [])
        : pokemon.types,
    bst: pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0),
    baseStats: randomStats ? undefined : pokemon.stats,
    annotations: knowledge.statAnnotationsByPokemonId?.[pokemon.id],
    randomStats,
    ...(opponent.learnLevels ? { learnLevels: opponent.learnLevels } : {}),
    ...(opponent.evolutions ? { evolutions: opponent.evolutions } : {}),
    seenMoves,
    ...(seenAbilities.length ? { seenAbilities } : {}),
  };
}

function seenIds(
  record: RunRecord,
  playerId: string,
  pokemonId: number,
  kind: "move" | "ability",
): number[] {
  const game = record.tracking[playerId]?.game;
  const source = game && gameKey(game);
  const latest = new Map<number, number>();
  for (const observation of record.observations) {
    const id = kind === "move" ? observation.moveId : observation.abilityId;
    if (
      observation.kind !== kind ||
      !id ||
      observation.playerId !== playerId ||
      observation.pokemonId !== pokemonId ||
      (source && observation.gameKey !== source)
    )
      continue;
    latest.set(id, Math.max(latest.get(id) ?? 0, observation.observedAt));
  }
  return [...latest]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .map(([id]) => id);
}

/** Moves a species was seen using in this player's current game, most recent first. */
export function seenMoveIds(
  record: RunRecord,
  playerId: string,
  pokemonId: number,
): number[] {
  return seenIds(record, playerId, pokemonId, "move");
}

/** Abilities the game revealed for a species in this player's current game, most recent first. */
export function seenAbilityIds(
  record: RunRecord,
  playerId: string,
  pokemonId: number,
): number[] {
  return seenIds(record, playerId, pokemonId, "ability");
}

/** Level-up moves already reachable at a level, their total and the next learning level. */
export function learnProgress(
  learnLevels: number[] | undefined,
  level: number | undefined,
): { learned: number; total: number; next?: number } | undefined {
  if (!learnLevels?.length || level === undefined) return undefined;
  const next = learnLevels
    .filter((entry) => entry > level)
    .reduce<number | undefined>(
      (lowest, entry) =>
        lowest === undefined || entry < lowest ? entry : lowest,
      undefined,
    );
  return {
    learned: learnLevels.filter((entry) => entry <= level).length,
    total: learnLevels.length,
    ...(next === undefined ? {} : { next }),
  };
}

export function lightFocusMember(
  team: OverlayTeam,
  opponent: OverlayMember | undefined,
  selectedId?: string,
): OverlayMember | undefined {
  if (selectedId)
    return team.members.find((member) => member.id === selectedId);
  if (team.inBattle) return opponent;
  return (
    team.members.find(
      (member) => member.identity && member.identity === team.activeIdentity,
    ) ??
    team.members.find((member) => !member.isDead) ??
    team.members[0]
  );
}

/** Tracked team plus dead Pokémon still carried in the game party, in party order. */
function partyMembers(
  record: RunRecord,
  player: { id: string; playerIndex: number },
): Capture[] {
  const { run } = record;
  const team = run.isSoulLinkMode
    ? (run.playerTeams?.[player.playerIndex] ?? [])
    : run.team;
  const party = record.tracking[player.id]?.latest.party ?? [];
  if (!party.length) return team;
  const order = new Map(
    party.map((pokemon, index) => [pokemon.identity, index]),
  );
  const dead = run.zones
    .flatMap((zone) => zone.captures)
    .filter(
      (capture) =>
        capture.isDead &&
        (capture.playerIndex ?? 0) === player.playerIndex &&
        capture.gameIdentity !== undefined &&
        order.has(capture.gameIdentity) &&
        !team.some((member) => member.id === capture.id),
    );
  const position = (capture: Capture) =>
    capture.gameIdentity !== undefined
      ? (order.get(capture.gameIdentity) ?? party.length)
      : party.length;
  return [...team, ...dead]
    .map((capture, index) => ({ capture, index }))
    .sort(
      (left, right) =>
        position(left.capture) - position(right.capture) ||
        left.index - right.index,
    )
    .map(({ capture }) => capture);
}

// Frames arrive several times per second; these margins absorb short read hiccups and screen transitions.
export const LIVE_STALE_MS = 8000;
export const LIVE_ERROR_GRACE_MS = 3000;
const CLOCK_SKEW_MS = 2000;

export function isTrackingLive(
  lastSeenAt: number | undefined,
  now: number,
  sourceError = false,
): boolean {
  if (!lastSeenAt || !now || now < lastSeenAt - CLOCK_SKEW_MS) return false;
  const age = Math.max(0, now - lastSeenAt);
  return age < (sourceError ? LIVE_ERROR_GRACE_MS : LIVE_STALE_MS);
}

export function isOverlayTeamLive(team: OverlayTeam, now: number): boolean {
  return (
    !team.suspended && isTrackingLive(team.lastSeenAt, now, team.sourceError)
  );
}
