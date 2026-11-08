import type { BridgeStatus, LivePokemon, RunRecord } from "./types";
import type { PokemonStat, StatAnnotations } from "../types";
import { getPlayerId, knowledgeForCapture } from "./knowledge";
import { pokemonForGame } from "../game-reference";
import { getCaptureTypesForRun } from "../capture-types";
import { defaultOverlayControl, type OverlayControl } from "./overlay-control";
import { overlayControlSchema } from "./overlay-control";
import { livePokemonSchema } from "./schema";
import { z } from "zod";
import { POKEMON_STAT_NAMES } from "../types";
import { GAME_VERSIONS, type GameVersionId } from "../game-catalog";

export interface OverlayMember {
  id: string;
  pokemonId: number;
  identity?: string;
  name: string;
  spriteUrl: string;
  fallbackSpriteUrl: string;
  types: string[];
  live?: LivePokemon;
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
  teams: z.array(z.object({
    playerId: z.string(),
    name: z.string(),
    playerIndex: z.number(),
    lastSeenAt: z.number(),
    activeIdentity: z.string().optional(),
    inBattle: z.boolean(),
    suspended: z.boolean(),
    sourceError: z.boolean(),
    location: z.string().optional(),
    members: z.array(z.object({
      id: z.string(), pokemonId: z.number(), identity: z.string().optional(),
      name: z.string(), spriteUrl: z.string(), fallbackSpriteUrl: z.string(),
      types: z.array(z.string()), live: livePokemonSchema.optional(),
      bst: z.number(), randomStats: z.boolean(),
      baseStats: z.array(z.object({ base_stat: z.number(), stat: z.object({ name: z.string() }) })).optional(),
      annotations: z.partialRecord(z.enum(POKEMON_STAT_NAMES), z.enum(["high", "low"])).optional(),
    })),
  })),
});

export function overlayData(record: RunRecord, bridge?: BridgeStatus): OverlayData {
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
      lastSeenAt: bridge?.runId === run.id && bridge.playerId === player.id
        ? bridge.lastSeenAt ?? 0 : record.tracking[player.id]?.lastSeenAt ?? 0,
      activeIdentity: record.tracking[player.id]?.latest.battle?.activePlayerIdentity,
      inBattle: Boolean(record.tracking[player.id]?.latest.battle),
      suspended: Boolean(record.tracking[player.id]?.suspended),
      sourceError: Boolean(bridge?.runId === run.id && bridge.playerId === player.id && bridge.error),
      location: record.tracking[player.id]?.latest.location?.name ??
        run.zones.find((zone) => zone.id === record.tracking[player.id]?.zoneMappings[record.tracking[player.id]?.latest.location?.id ?? ""])?.zoneName ??
        record.tracking[player.id]?.latest.location?.id,
      members: (run.isSoulLinkMode
        ? (run.playerTeams?.[player.playerIndex] ?? [])
        : run.team
      ).map((capture) => ({
        id: capture.id,
        pokemonId: capture.pokemon.id,
        identity: capture.gameIdentity,
        name:
          capture.nickname ??
          capture.pokemon.names?.en ??
          capture.pokemon.technicalName,
        spriteUrl:
          capture.selectedSprite?.url ??
          (capture.isShiny
            ? capture.pokemon.sprites.shiny.default
            : capture.pokemon.sprites.normal.default),
        fallbackSpriteUrl: capture.isShiny ? capture.pokemon.sprites.shiny.default : capture.pokemon.sprites.normal.default,
        types:
          run.isRandomMode && run.randomizerOptions?.randomizeTypes
            ? (capture.customTypes ??
              knowledgeForCapture(run, capture).customTypesByPokemonId?.[
                capture.pokemon.id
              ] ??
              [])
            : getCaptureTypesForRun(capture, run, capture.pokemon.types),
        live: record.tracking[player.id]?.latest.party.find((pokemon) => pokemon.identity === capture.gameIdentity),
        bst: pokemonForGame(capture.pokemon, run.gameVersion).stats.reduce((sum, stat) => sum + stat.base_stat, 0),
        baseStats: run.isRandomMode && run.randomizerOptions?.randomizeStats
          ? undefined : pokemonForGame(capture.pokemon, run.gameVersion).stats,
        annotations: knowledgeForCapture(run, capture).statAnnotationsByPokemonId?.[capture.pokemon.id],
        randomStats: Boolean(run.isRandomMode && run.randomizerOptions?.randomizeStats),
      })),
    })),
  };
}

export type SpriteMember = Pick<OverlayMember, "id" | "name" | "spriteUrl" | "fallbackSpriteUrl" | "types">;

export function isOverlayTeamLive(team: OverlayTeam, now: number): boolean {
  return !team.suspended && !team.sourceError && team.lastSeenAt > 0 &&
    now >= team.lastSeenAt && now - team.lastSeenAt < 5000;
}
