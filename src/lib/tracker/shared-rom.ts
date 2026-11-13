import type { Run, RunKnowledge, TypeObservation } from "../types";
import { typeClueKey, uniqueTypeObservations } from "./knowledge";
import type { GameIdentity, PlayerTracking, RunRecord } from "./types";

type Tracking = Pick<RunRecord, "tracking">;
type SeenEncounter = NonNullable<PlayerTracking["seenEncounters"]>[number];
type SpeciesMap = Record<number, unknown>;

/**
 * Knowledge that only depends on the ROM (randomized types, abilities, stats and type clues).
 * Notes and evolution histories stay personal.
 */
const ROM_KNOWLEDGE_FIELDS = [
  "customTypesByPokemonId",
  "customAbilitiesByPokemonId",
  "statAnnotationsByPokemonId",
  "pokedexObservationsByPokemonId",
] as const satisfies readonly (keyof RunKnowledge)[];

/** Identifies a ROM regardless of the trainer playing it. */
export function romKey(game: GameIdentity): string {
  return `${game.gameCode}.${game.revision}.${game.language}.${game.romHash}`;
}

/** ROM part of a gameKey (see live.ts), which ends with the trainer id. */
export function romKeyOfGameKey(key: string): string {
  return key.slice(0, key.lastIndexOf("."));
}

/** Other players whose game runs on exactly the same ROM. */
export function sharedRomPlayers(record: Tracking, playerId: string): string[] {
  const own = record.tracking[playerId];
  if (!own) return [];
  const key = romKey(own.game);
  return Object.entries(record.tracking)
    .filter(
      ([id, tracking]) => id !== playerId && romKey(tracking.game) === key,
    )
    .map(([id]) => id);
}

/** Wild encounters seen by this player and by the players sharing their ROM. */
export function sharedSeenEncounters(
  record: Tracking,
  playerId: string,
): SeenEncounter[] {
  const own = record.tracking[playerId];
  if (!own) return [];
  const key = romKey(own.game);
  return [playerId, ...sharedRomPlayers(record, playerId)].flatMap((id) =>
    (record.tracking[id].seenEncounters ?? []).filter(
      (entry) => romKeyOfGameKey(entry.gameKey) === key,
    ),
  );
}

/** Map-to-zone choices of the players sharing this ROM; the player's own choices win. */
export function sharedZoneMappings(
  record: Tracking,
  playerId: string,
): Record<string, string> {
  return Object.assign(
    {},
    ...sharedRomPlayers(record, playerId).map(
      (id) => record.tracking[id].zoneMappings,
    ),
    record.tracking[playerId]?.zoneMappings,
  );
}

const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const observationsOf = (value: unknown) => (value ?? []) as TypeObservation[];

function compact(map: SpeciesMap): SpeciesMap | undefined {
  for (const [id, value] of Object.entries(map))
    if (value === undefined || (Array.isArray(value) && !value.length))
      delete map[Number(id)];
  return Object.keys(map).length ? map : undefined;
}

/**
 * Replays a player's ROM knowledge changes (before → after) on the players sharing their ROM.
 * Type clues are merged by outcome + attack type so that each player keeps the clues only they
 * observed, without duplicating the clues several players observed.
 */
export function shareKnowledgeChange(
  run: Run,
  peers: string[],
  before: RunKnowledge,
  after: RunKnowledge,
): Run {
  if (!peers.length || !run.playerKnowledge) return run;
  const playerKnowledge = { ...run.playerKnowledge };
  let changed = false;
  for (const field of ROM_KNOWLEDGE_FIELDS) {
    const old = (before[field] ?? {}) as SpeciesMap;
    const next = (after[field] ?? {}) as SpeciesMap;
    const species = [
      ...new Set([...Object.keys(old), ...Object.keys(next)]),
    ].filter((id) => !same(old[Number(id)], next[Number(id)]));
    if (!species.length) continue;
    changed = true;
    for (const peer of peers) {
      const knowledge = playerKnowledge[peer] ?? {};
      const map: SpeciesMap = { ...(knowledge[field] as SpeciesMap) };
      for (const key of species) {
        const id = Number(key);
        if (field !== "pokedexObservationsByPokemonId") {
          map[id] = next[id];
          continue;
        }
        const kept = new Set(observationsOf(next[id]).map(typeClueKey));
        const removed = new Set(
          observationsOf(old[id])
            .map(typeClueKey)
            .filter((clue) => !kept.has(clue)),
        );
        map[id] = uniqueTypeObservations([
          ...observationsOf(map[id]).filter(
            (clue) => !removed.has(typeClueKey(clue)),
          ),
          ...observationsOf(next[id]),
        ]);
      }
      playerKnowledge[peer] = { ...knowledge, [field]: compact(map) };
    }
  }
  return changed ? { ...run, playerKnowledge } : run;
}

/**
 * Pools the ROM knowledge of players sharing a ROM, e.g. when one of them connects:
 * type clues are united and every player fills the species they know nothing about.
 */
export function mergeRomKnowledge(run: Run, players: string[]): Run {
  if (players.length < 2 || !run.playerKnowledge) return run;
  const playerKnowledge = { ...run.playerKnowledge };
  for (const field of ROM_KNOWLEDGE_FIELDS) {
    for (const player of players) {
      const map: SpeciesMap = {
        ...(playerKnowledge[player]?.[field] as SpeciesMap),
      };
      for (const peer of players) {
        if (peer === player) continue;
        const source = (run.playerKnowledge[peer]?.[field] ?? {}) as SpeciesMap;
        for (const [key, value] of Object.entries(source)) {
          const id = Number(key);
          if (field !== "pokedexObservationsByPokemonId") {
            if (map[id] === undefined) map[id] = value;
            continue;
          }
          map[id] = uniqueTypeObservations([
            ...observationsOf(map[id]),
            ...observationsOf(value),
          ]);
        }
      }
      if (!same(map, playerKnowledge[player]?.[field] ?? {}))
        playerKnowledge[player] = {
          ...playerKnowledge[player],
          [field]: compact(map),
        };
    }
  }
  return same(playerKnowledge, run.playerKnowledge)
    ? run
    : { ...run, playerKnowledge };
}
