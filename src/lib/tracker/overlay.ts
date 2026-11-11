import type {
  BattleOpponent,
  BridgeStatus,
  GameFrame,
  LiveEvolution,
  LiveMove,
  LivePokemon,
  RunRecord,
  StatStages,
  RevealedMovePp,
  ZoneEncounter,
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
import {
  livePokemonSchema,
  revealedMovePpSchema,
  battleWeightSchema,
  statStagesSchema,
  zoneEncounterSchema,
} from "./schema";
import type { MovePowerTarget } from "./move-power";
import { z } from "zod";
import { POKEMON_STAT_NAMES } from "../types";
import { GAME_VERSIONS, type GameVersionId } from "../game-catalog";
import { zoneIdForMapName } from "../zones";
import { isZoneLockedForPlayer } from "../zone-progress";
import { gameKey } from "./live";

// What the game itself reported for seen moves (ROM data) and hack-added abilities (ROM names).
export interface CustomSeen {
  moves: Record<number, LiveMove>;
  abilities: Record<number, string>;
}

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
  // ROM data of seen moves and abilities that a hack put over vanilla ids.
  customSeen?: CustomSeen;
  /** Opponent only: abilities the game revealed for this species, most recent first. */
  seenAbilities?: number[];
  bst: number;
  baseStats?: PokemonStat[];
  annotations?: StatAnnotations;
  randomStats: boolean;
  /** Random evolutions: evolution targets are not named. */
  hideEvolutionTargets?: boolean;
  /** Opponent only: gender and in-battle stat stages of the battler. */
  gender?: LivePokemon["gender"];
  statStages?: StatStages;
  movePp?: RevealedMovePp[];
}
export interface OverlayZoneEncounter extends Omit<ZoneEncounter, "pokemonId"> {
  pokemonId?: number;
}
export interface OverlayZoneEncounters {
  seen: number;
  total: number;
  entries: OverlayZoneEncounter[];
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
  // Captures of this player in the current run zone; absent when the location matches no zone.
  // `lost`: the regular encounter (not the shiny second chance) was failed or locked by a partner.
  zoneCapture?: { captured: boolean; shiny: boolean; lost: boolean };
  // Wild table of the current map; undiscovered species carry no pokemonId so the overlay never spoils them.
  zoneEncounters?: OverlayZoneEncounters;
  members: OverlayMember[];
  powerTarget?: MovePowerTarget;
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
      zoneCapture: z
        .object({
          captured: z.boolean(),
          shiny: z.boolean(),
          lost: z.boolean(),
        })
        .optional(),
      zoneEncounters: z
        .object({
          seen: z.number(),
          total: z.number(),
          entries: z.array(
            zoneEncounterSchema
              .omit({ pokemonId: true })
              .extend({ pokemonId: z.number().optional() }),
          ),
        })
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
          hideEvolutionTargets: z.boolean().optional(),
          movePp: revealedMovePpSchema.optional(),
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
      powerTarget: z
        .object({
          weight: battleWeightSchema.optional(),
          statStages: statStagesSchema.optional(),
        })
        .optional(),
    }),
  ),
});

export function hidesEvolutionTargets(run: Run): boolean {
  return Boolean(
    run.isRandomMode && run.randomizerOptions?.randomizeEvolvedForms,
  );
}

/** Species of the current map's wild table this player met in a wild battle here or caught in the zone; the others stay anonymous. */
function zoneEncounters(
  tracking: RunRecord["tracking"][string],
  location: NonNullable<GameFrame["location"]>,
  captures: Capture[],
): Pick<OverlayTeam, "zoneEncounters"> {
  if (!location.encounters?.length) return {};
  const source = gameKey(tracking.game);
  const known = new Set(
    captures.map(
      (capture) => capture.originalCapturedPokemonId ?? capture.pokemon.id,
    ),
  );
  for (const entry of tracking.seenEncounters ?? [])
    if (entry.gameKey === source && entry.locationId === location.id)
      known.add(entry.pokemonId);
  const species = new Set(location.encounters.map((entry) => entry.pokemonId));
  return {
    zoneEncounters: {
      seen: [...species].filter((id) => known.has(id)).length,
      total: species.size,
      entries: location.encounters.map(({ pokemonId, ...entry }) =>
        known.has(pokemonId) ? { ...entry, pokemonId } : entry,
      ),
    },
  };
}

// The in-game map name is English; a matching run zone provides its localized names.
function teamLocation(
  record: RunRecord,
  playerId: string,
  playerIndex: number,
): Pick<
  OverlayTeam,
  "location" | "locationNames" | "zoneCapture" | "zoneEncounters"
> {
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
  const soulLink = Boolean(record.run.isSoulLinkMode);
  const own = (zone?.captures ?? []).filter(
    (capture) => !soulLink || (capture.playerIndex ?? 0) === playerIndex,
  );
  const captures = own.filter((capture) => !capture.failedCapture);
  const regular = own.filter((capture) => !capture.shinyChance);
  const lost = !zone
    ? false
    : regular.length
      ? regular.every((capture) => capture.failedCapture)
      : soulLink
        ? isZoneLockedForPlayer(zone, playerIndex)
        : zone.status === "lost";
  return {
    ...zoneEncounters(tracking, location, captures),
    ...(zone
      ? {
          zoneCapture: {
            captured: captures.length > 0,
            shiny: captures.some((capture) => capture.isShiny),
            lost,
          },
        }
      : {}),
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
      ...teamLocation(record, player.id, player.playerIndex),
      ...singleBattleTarget(record.tracking[player.id]?.latest.battle),
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
        ...(hidesEvolutionTargets(run) ? { hideEvolutionTargets: true } : {}),
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
  customSeen?: CustomSeen,
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
    ...(customSeen ? { customSeen } : {}),
    ...(opponent.gender ? { gender: opponent.gender } : {}),
    ...(opponent.statStages ? { statStages: opponent.statStages } : {}),
    ...(opponent.movePp ? { movePp: opponent.movePp } : {}),
    ...(hidesEvolutionTargets(run) ? { hideEvolutionTargets: true } : {}),
  };
}

function singleBattleTarget(
  battle: RunRecord["tracking"][string]["latest"]["battle"],
): { powerTarget?: MovePowerTarget } {
  if (
    !battle ||
    battle.isDouble ||
    (battle.activePlayerIdentities?.length ?? 0) > 1 ||
    battle.allies?.length ||
    battle.opponents.length !== 1
  )
    return {};
  const opponent = battle.opponents[0];
  return {
    powerTarget: {
      ...(opponent.weight ? { weight: opponent.weight } : {}),
      ...(opponent.statStages ? { statStages: opponent.statStages } : {}),
    },
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

/** Moves and abilities a hack put over vanilla ids, as observed for a species in this player's current game. */
export function customSeenWords(
  record: RunRecord,
  playerId: string,
  pokemonId: number,
): CustomSeen | undefined {
  const game = record.tracking[playerId]?.game;
  const source = game && gameKey(game);
  const seen: CustomSeen = { moves: {}, abilities: {} };
  let found = false;
  for (const observation of record.observations) {
    if (
      !(observation.custom || observation.move) ||
      observation.playerId !== playerId ||
      observation.pokemonId !== pokemonId ||
      (source && observation.gameKey !== source)
    )
      continue;
    if (observation.kind === "move" && observation.moveId) {
      seen.moves[observation.moveId] = {
        id: observation.moveId,
        name: observation.value,
        pp: 0,
        ...(observation.custom ? { custom: true as const } : {}),
        ...observation.move,
      };
      found = true;
    } else if (
      observation.kind === "ability" &&
      observation.custom &&
      observation.abilityId
    ) {
      seen.abilities[observation.abilityId] = observation.value;
      found = true;
    }
  }
  return found ? seen : undefined;
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
