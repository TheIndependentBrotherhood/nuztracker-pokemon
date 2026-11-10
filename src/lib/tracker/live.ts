import type { Capture, PokemonData, TypeObservation } from "../types";
import type {
  GameFrame,
  GameIdentity,
  LinkPokemonInput,
  LivePokemon,
  MapZoneInput,
  PendingDetail,
  PlayerTracking,
  RewindCheckpoint,
  RunRecord,
} from "./types";
import {
  getPlayerIndex,
  isolateKnowledge,
  knowledgeForPlayer,
} from "./knowledge";
import { addHistory, newId, sameValue } from "./records";
import { finalizeRun } from "./run-rules";
import { gameFrameSchema, recordSchema } from "./schema";
import { STARTER_ZONE_ID, zoneIdForMapName } from "../zones";
import { shinyChanceGroup, soulLinkCaptureSlot } from "../zone-progress";

export type PokemonResolver = (pokemonId: number) => PokemonData | undefined;

export function gameKey(game: GameIdentity): string {
  return `${game.gameCode}.${game.revision}.${game.language}.${game.romHash}.${game.trainerId}`;
}

export function connectRun(record: RunRecord, playerId: string): RunRecord {
  getPlayerIndex(record.run, playerId);
  const run = isolateKnowledge(record.run, playerId);
  return run === record.run
    ? record
    : { ...record, run, revision: record.revision + 1 };
}

function saveObservations(
  record: RunRecord,
  playerId: string,
  frame: GameFrame,
  now: number,
): RunRecord {
  let next = { ...record, run: { ...record.run } };
  const known = new Set(
    next.observations.map(
      (observation) =>
        `${observation.playerId}:${observation.gameKey}:${observation.id}`,
    ),
  );
  const source = gameKey(frame.game);
  for (const observation of frame.observations) {
    const key = `${playerId}:${source}:${observation.id}`;
    if (known.has(key)) continue;
    known.add(key);
    next.observations = [
      ...next.observations,
      { ...observation, playerId, gameKey: source, observedAt: now },
    ];
    next = addHistory(
      next,
      playerId,
      "observation",
      `Observed ${observation.kind}: ${observation.value} (species ${observation.pokemonId}).`,
      now,
    );
    if (observation.kind !== "effectiveness") continue;
    const type = observation.value;
    if (
      type !== "immunity" &&
      type !== "weakness" &&
      type !== "resistance" &&
      type !== "neutral"
    ) {
      throw new Error("Unknown effectiveness outcome.");
    }
    if (!observation.attackType)
      throw new Error("The observed attack type is missing.");
    const knowledge = knowledgeForPlayer(next.run, playerId);
    const observed: TypeObservation = {
      id: observation.id,
      type,
      observationType: observation.attackType,
      createdAt: now,
    };
    next.run.playerKnowledge = {
      ...next.run.playerKnowledge,
      [playerId]: {
        ...knowledge,
        pokedexObservationsByPokemonId: {
          ...knowledge.pokedexObservationsByPokemonId,
          [observation.pokemonId]: [
            ...(knowledge.pokedexObservationsByPokemonId?.[
              observation.pokemonId
            ] ?? []),
            observed,
          ],
        },
      },
    };
  }
  return next;
}

function rewindCheckpoint(frame: GameFrame): RewindCheckpoint {
  return {
    frame: frame.frame,
    party: frame.party
      .filter((pokemon) => !pokemon.isEgg)
      .map(({ identity, pokemonId, level }) => ({
        identity,
        pokemonId,
        level,
      })),
  };
}

function deadIdentities(record: RunRecord, index: number): Set<string> {
  return new Set(
    record.run.zones.flatMap((zone) =>
      zone.captures
        .filter(
          (capture) =>
            (capture.playerIndex ?? 0) === index &&
            capture.isDead &&
            capture.gameIdentity,
        )
        .map((capture) => capture.gameIdentity!),
    ),
  );
}

/** A loaded state is safe when no tracked Pokémon lost levels, devolved or came back to life. */
function matchesCheckpoint(
  checkpoint: RewindCheckpoint,
  frame: GameFrame,
  dead: Set<string>,
): boolean {
  const live = frame.party.filter((pokemon) => !pokemon.isEgg);
  if (live.some((pokemon) => dead.has(pokemon.identity) && pokemon.hp > 0))
    return false;
  const overlap = checkpoint.party.flatMap((saved) => {
    const current = live.find((pokemon) => pokemon.identity === saved.identity);
    return current ? [{ saved, current }] : [];
  });
  return (
    overlap.length > 0 &&
    overlap.every(
      ({ saved, current }) =>
        current.level >= saved.level &&
        (current.pokemonId === saved.pokemonId || current.level > saved.level),
    )
  );
}

export function ingestFrame(
  input: RunRecord,
  playerId: string,
  rawFrame: GameFrame,
  resolvePokemon: PokemonResolver,
  now = Date.now(),
  autoLink = true,
): RunRecord {
  const frame = gameFrameSchema.parse(rawFrame);
  const index = getPlayerIndex(input.run, playerId);
  const record = connectRun(input, playerId);
  const previous = record.tracking[playerId];
  if (previous && gameKey(previous.game) !== gameKey(frame.game)) {
    throw new Error(
      "The ROM or trainer does not match this run. Create or select another run; existing knowledge was not changed.",
    );
  }
  if (previous?.retiredSessions.includes(frame.sessionId)) return record;
  if (
    previous?.sessionId === frame.sessionId &&
    frame.sequence <= previous.sequence
  )
    return record;
  const rewound = Boolean(
    previous && (frame.stateLoaded || frame.frame < previous.frame),
  );
  const checkpoint =
    previous?.rewindCheckpoint ??
    (rewound && previous && !previous.suspended
      ? rewindCheckpoint(previous.latest)
      : undefined);
  const paused = Boolean(previous?.suspended || rewound);
  const consistent = Boolean(
    paused &&
    checkpoint &&
    matchesCheckpoint(checkpoint, frame, deadIdentities(record, index)),
  );
  const suspended = paused && !consistent;
  const nuzlockeStartedAt =
    previous?.nuzlockeStartedAt ??
    ((frame.pokeBalls ?? 0) > 0 ||
    record.run.zones.some(
      (zone) =>
        zone.id !== STARTER_ZONE_ID &&
        zone.captures.some((capture) => (capture.playerIndex ?? 0) === index),
    )
      ? now
      : undefined);
  // Connectors that cannot read the bag keep the classic rule: every faint is a death.
  const automaticDeaths =
    nuzlockeStartedAt !== undefined || frame.pokeBalls === undefined;
  const ownCaptures = record.run.zones
    .flatMap((zone) => zone.captures)
    .filter((capture) => (capture.playerIndex ?? 0) === index);
  const capturedIds = new Set(
    ownCaptures.map((capture) => capture.gameIdentity),
  );
  const ignored = new Set(previous?.ignoredIdentities ?? []);
  const pending = new Map(
    (previous?.pendingPokemon ?? []).map((pokemon) => [
      pokemon.identity,
      pokemon,
    ]),
  );
  for (const pokemon of frame.party) {
    if (
      !pokemon.isEgg &&
      !capturedIds.has(pokemon.identity) &&
      !ignored.has(pokemon.identity)
    ) {
      pending.set(pokemon.identity, pokemon);
    }
  }
  for (const identity of capturedIds) if (identity) pending.delete(identity);
  const seenEncounters = [...(previous?.seenEncounters ?? [])];
  if (frame.battle?.kind === "wild" && frame.location) {
    for (const opponent of frame.battle.opponents) {
      const id = JSON.stringify([frame.battle.id, opponent.identity]);
      if (
        !seenEncounters.some(
          (entry) => entry.id === id && entry.gameKey === gameKey(frame.game),
        )
      ) {
        seenEncounters.push({
          id,
          gameKey: gameKey(frame.game),
          locationId: frame.location.id,
          ...(frame.location.name ? { locationName: frame.location.name } : {}),
          pokemonId: opponent.pokemonId,
          level: opponent.level,
          observedAt: now,
        });
      }
    }
  }
  // A wild Pokémon sent straight to the PC never joins the party: it is linked like a party newcomer.
  const wildPids = new Set(
    seenEncounters
      .filter((entry) => entry.gameKey === gameKey(frame.game))
      .map((entry) => opponentPid(entry.id)),
  );
  for (const pokemon of frame.storage ?? []) {
    if (
      !pokemon.isEgg &&
      !capturedIds.has(pokemon.identity) &&
      !ignored.has(pokemon.identity) &&
      wildPids.has(pokemon.identity.split("-")[0])
    )
      pending.set(pokemon.identity, pokemon);
  }

  let next: RunRecord = {
    ...record,
    revision: record.revision + 1,
    tracking: {
      ...record.tracking,
      [playerId]: {
        game: frame.game,
        sessionId: frame.sessionId,
        sequence: frame.sequence,
        frame: frame.frame,
        lastSeenAt: now,
        latest: frame,
        suspended,
        ...(suspended && checkpoint ? { rewindCheckpoint: checkpoint } : {}),
        ...(nuzlockeStartedAt === undefined ? {} : { nuzlockeStartedAt }),
        pendingPokemon: [...pending.values()],
        pendingDetails: Object.fromEntries(
          Object.entries(previous?.pendingDetails ?? {}).filter(([identity]) =>
            pending.has(identity),
          ),
        ),
        ignoredIdentities: [...ignored],
        zoneMappings: previous?.zoneMappings ?? {},
        retiredSessions:
          previous && previous.sessionId !== frame.sessionId
            ? [...previous.retiredSessions, previous.sessionId]
            : (previous?.retiredSessions ?? []),
        seenEncounters,
      },
    },
  };
  if (rewound && !previous?.suspended) {
    next = addHistory(
      next,
      playerId,
      "rollback",
      consistent
        ? "A save state or backward jump was detected. It matches the tracked team, so tracking continues."
        : "A save state or backward jump was detected. Team updates are paused; observations are still saved.",
      now,
    );
  } else if (previous?.suspended && consistent) {
    next = addHistory(
      next,
      playerId,
      "connection",
      "Tracking resumed automatically: the game matches the tracked team again.",
      now,
    );
  }
  next = saveObservations(next, playerId, frame, now);
  if (suspended) return recordSchema.parse(next);

  const liveById = new Map(
    frame.party.map((pokemon) => [pokemon.identity, pokemon]),
  );
  const playerKnowledge = { ...next.run.playerKnowledge };
  const changes: { kind: "evolution" | "death"; message: string }[] = [];
  const zones = next.run.zones.map((zone) => ({
    ...zone,
    captures: zone.captures.map((capture) => {
      if ((capture.playerIndex ?? 0) !== index || !capture.gameIdentity)
        return capture;
      const live = liveById.get(capture.gameIdentity);
      if (!live || live.isEgg) return capture;
      let updated = { ...capture };
      if (live.pokemonId !== capture.pokemon.id) {
        const pokemon = resolvePokemon(live.pokemonId);
        if (!pokemon)
          throw new Error(
            `Species ${live.pokemonId} is missing from the local reference data.`,
          );
        updated = {
          ...updated,
          pokemon,
          originalCapturedPokemonId:
            capture.originalCapturedPokemonId ?? capture.pokemon.id,
          selectedSprite: undefined,
          customTypes: live.types,
        };
        const knowledge = playerKnowledge[playerId] ?? {};
        const original =
          updated.originalCapturedPokemonId ?? capture.pokemon.id;
        const lineage = knowledge.evolutionHistoryByPokemonId?.[original] ?? [
          {
            pokemonId: capture.pokemon.id,
            technicalName: capture.pokemon.technicalName,
            timestamp: capture.createdAt,
          },
        ];
        playerKnowledge[playerId] = {
          ...knowledge,
          evolutionHistoryByPokemonId: {
            ...knowledge.evolutionHistoryByPokemonId,
            [original]: [
              ...lineage,
              {
                pokemonId: pokemon.id,
                technicalName: pokemon.technicalName,
                timestamp: now,
              },
            ],
          },
        };
        changes.push({
          kind: "evolution",
          message: `${capture.pokemon.technicalName} evolved into ${pokemon.technicalName}.`,
        });
      }
      updated.nickname = live.nickname ?? updated.nickname;
      updated.ability = live.ability ?? updated.ability;
      updated.isShiny = live.isShiny;
      updated.gender = live.gender;
      if (
        live.types?.length &&
        next.run.isRandomMode &&
        next.run.randomizerOptions?.randomizeTypes
      ) {
        updated.customTypes = live.types;
        // Party types are visible in-game, so the species is known for opponents and the Pokédex too.
        const knowledge = playerKnowledge[playerId] ?? {};
        const known = knowledge.customTypesByPokemonId?.[live.pokemonId];
        if (
          known?.length !== live.types.length ||
          known.some((type, slot) => type !== live.types![slot])
        )
          playerKnowledge[playerId] = {
            ...knowledge,
            customTypesByPokemonId: {
              ...knowledge.customTypesByPokemonId,
              [live.pokemonId]: live.types,
            },
          };
      }
      const oldLive = previous?.latest.party.find(
        (pokemon) => pokemon.identity === live.identity,
      );
      if (
        !updated.isDead &&
        !updated.faintPendingAt &&
        oldLive &&
        oldLive.hp > 0 &&
        live.hp === 0
      ) {
        const name = updated.nickname ?? updated.pokemon.technicalName;
        if (automaticDeaths) {
          updated = {
            ...updated,
            isDead: true,
            linkedDeath: false,
            diedAt: now,
          };
          changes.push({ kind: "death", message: `${name} fainted.` });
        } else {
          updated = { ...updated, faintPendingAt: now };
          changes.push({
            kind: "death",
            message: `${name} fainted before the first Poké Ball. Waiting for the player's decision.`,
          });
        }
      }
      return updated;
    }),
  }));
  next = { ...next, run: { ...next.run, zones, playerKnowledge } };
  for (const change of changes)
    next = addHistory(next, playerId, change.kind, change.message, now);
  const capturesByGameId = new Map(
    next.run.zones
      .flatMap((zone) => zone.captures)
      .filter(
        (capture) =>
          (capture.playerIndex ?? 0) === index && capture.gameIdentity,
      )
      .map((capture) => [capture.gameIdentity, capture]),
  );
  const team = frame.party.flatMap((pokemon) => {
    const capture = capturesByGameId.get(pokemon.identity);
    return capture && !capture.isDead ? [capture] : [];
  });
  if (capturesByGameId.size > 0) {
    if (next.run.isSoulLinkMode)
      next.run.playerTeams = { ...next.run.playerTeams, [index]: team };
    else next.run.team = team;
  }

  next.run = finalizeRun({ ...next.run, updatedAt: now }, now);
  const parsed = recordSchema.parse(next);
  return autoLink
    ? autoLinkPending(parsed, playerId, resolvePokemon, now)
    : parsed;
}

function opponentPid(encounterId: string): string | undefined {
  try {
    const [, identity] = JSON.parse(encounterId) as [string, string];
    return identity.split("-")[0];
  } catch {
    return undefined;
  }
}

function zoneForLocation(
  record: RunRecord,
  tracking: PlayerTracking,
  location?: { id: string; name?: string },
): PendingDetail | { zoneId: string; reason?: undefined } {
  if (!location) return { reason: "unknown-zone" };
  const mapped = tracking.zoneMappings[location.id];
  if (mapped && record.run.zones.some((zone) => zone.id === mapped))
    return { zoneId: mapped };
  const found = location.name
    ? zoneIdForMapName(record.run.zones, location.name)
    : undefined;
  if (found === "ambiguous") return { reason: "ambiguous-zone" };
  return found ? { zoneId: found } : { reason: "unknown-zone" };
}

/**
 * Guess the encounter zone of a new party Pokémon:
 * - the first and only Pokémon of a player without captures is the starter;
 * - a wild Pokémon keeps its personality value once caught, so the wild battle it was met in gives the zone,
 *   even when it went to the PC and was withdrawn later.
 * Anything else (gift, trade, hatched egg) only gets a suggestion and needs the player's choice.
 */
function guessZone(
  record: RunRecord,
  playerId: string,
  pokemon: LivePokemon,
): PendingDetail | { zoneId: string; reason?: undefined } {
  const tracking = record.tracking[playerId];
  const index = getPlayerIndex(record.run, playerId);
  const party = tracking.latest.party.filter((entry) => !entry.isEgg);
  const hasCapture = record.run.zones.some((zone) =>
    zone.captures.some((capture) => (capture.playerIndex ?? 0) === index),
  );
  if (
    !hasCapture &&
    party.length === 1 &&
    party[0].identity === pokemon.identity &&
    record.run.zones.some((zone) => zone.id === STARTER_ZONE_ID)
  )
    return { zoneId: STARTER_ZONE_ID };
  const pid = pokemon.identity.split("-")[0];
  const key = gameKey(tracking.game);
  const encounter = [...(tracking.seenEncounters ?? [])]
    .reverse()
    .find((entry) => entry.gameKey === key && opponentPid(entry.id) === pid);
  if (encounter)
    return zoneForLocation(record, tracking, {
      id: encounter.locationId,
      name: encounter.locationName,
    });
  const suggestion = zoneForLocation(
    record,
    tracking,
    tracking.latest.location,
  );
  return {
    reason: "no-encounter",
    ...(suggestion.zoneId ? { zoneId: suggestion.zoneId } : {}),
  };
}

// Link new party Pokémon automatically; doubtful ones are kept with a reason so the player can choose.
function autoLinkPending(
  record: RunRecord,
  playerId: string,
  resolvePokemon: PokemonResolver,
  now: number,
): RunRecord {
  const initial = record.tracking[playerId];
  if (!initial || initial.suspended) return record;
  const details: Record<string, PendingDetail> = {};
  let next = record;
  for (const pokemon of initial.pendingPokemon) {
    const known = initial.pendingDetails?.[pokemon.identity];
    if (known) {
      details[pokemon.identity] = known;
      continue;
    }
    const guess = guessZone(next, playerId, pokemon);
    if (guess.reason) {
      details[pokemon.identity] = guess;
      continue;
    }
    try {
      next = linkPokemon(
        next,
        {
          runId: next.run.id,
          playerId,
          identity: pokemon.identity,
          zoneId: guess.zoneId,
        },
        resolvePokemon,
        now,
      );
    } catch {
      details[pokemon.identity] = {
        reason: "zone-taken",
        zoneId: guess.zoneId,
      };
    }
  }
  const tracking = next.tracking[playerId];
  if (sameValue(tracking.pendingDetails ?? {}, details)) return next;
  return recordSchema.parse({
    ...next,
    tracking: {
      ...next.tracking,
      [playerId]: { ...tracking, pendingDetails: details },
    },
  });
}

export function linkPokemon(
  record: RunRecord,
  input: LinkPokemonInput,
  resolvePokemon: PokemonResolver,
  now = Date.now(),
): RunRecord {
  if (record.run.id !== input.runId)
    throw new Error("The capture belongs to another run.");
  const index = getPlayerIndex(record.run, input.playerId);
  const tracking = record.tracking[input.playerId];
  if (!tracking || tracking.suspended)
    throw new Error("Connect and reconcile the game before linking a capture.");
  const live = tracking.pendingPokemon.find(
    (pokemon) => pokemon.identity === input.identity,
  );
  if (!live)
    throw new Error("This Pokémon is no longer awaiting confirmation.");
  const zone = record.run.zones.find((entry) => entry.id === input.zoneId);
  if (!zone) throw new Error("Choose an existing encounter zone.");
  const existing = input.captureId
    ? zone.captures.find((capture) => capture.id === input.captureId)
    : undefined;
  if (input.captureId && (!existing || (existing.playerIndex ?? 0) !== index)) {
    throw new Error(
      "Select one of this player's captures to associate with the game.",
    );
  }
  if (existing?.gameIdentity && existing.gameIdentity !== live.identity)
    throw new Error("This capture is already linked to a different Pokémon.");
  let shinyChance = existing?.shinyChance;
  if (!existing && record.run.isSoulLinkMode) {
    const slot = soulLinkCaptureSlot(
      zone,
      index,
      live.isShiny,
      record.run.isShinyHuntMode,
    );
    if (!slot)
      throw new Error(
        "This zone has no eligible encounter slot. Link an existing capture or use a separate exception zone.",
      );
    shinyChance = slot === "shiny" || undefined;
  } else if (!existing) {
    const own = zone.captures.filter(
      (capture) => (capture.playerIndex ?? 0) === index,
    );
    const limit = record.run.isShinyHuntMode ? 2 : 1;
    if (
      own.length >= limit ||
      (own.length && !own[0].isShiny && !live.isShiny)
    ) {
      throw new Error(
        "This zone has no eligible encounter slot. Link an existing capture or use a separate exception zone.",
      );
    }
  }
  const pokemon = resolvePokemon(live.pokemonId);
  if (!pokemon)
    throw new Error(
      `Species ${live.pokemonId} is missing from the local reference data.`,
    );
  const capture: Capture = {
    ...(existing ?? { id: newId(), createdAt: now, isDead: live.hp === 0 }),
    pokemon,
    nickname: live.nickname ?? existing?.nickname,
    gender: live.gender,
    isShiny: live.isShiny,
    ability: live.ability ?? existing?.ability,
    customTypes: live.types ?? existing?.customTypes,
    gameIdentity: live.identity,
    ...(record.run.isSoulLinkMode
      ? {
          playerIndex: index,
          soulLinkGroupId:
            input.soulLinkGroupId ??
            existing?.soulLinkGroupId ??
            (shinyChance ? shinyChanceGroup(zone.id) : zone.id),
          ...(shinyChance ? { shinyChance } : {}),
        }
      : {}),
  };
  let next: RunRecord = {
    ...record,
    revision: record.revision + 1,
    run: {
      ...record.run,
      updatedAt: now,
      zones: record.run.zones.map((entry) =>
        entry.id === zone.id
          ? {
              ...entry,
              updatedAt: now,
              captures: existing
                ? entry.captures.map((item) =>
                    item.id === existing.id ? capture : item,
                  )
                : [...entry.captures, capture],
            }
          : entry,
      ),
    },
    tracking: {
      ...record.tracking,
      [input.playerId]: {
        ...tracking,
        pendingPokemon: tracking.pendingPokemon.filter(
          (item) => item.identity !== live.identity,
        ),
        pendingDetails: Object.fromEntries(
          Object.entries(tracking.pendingDetails ?? {}).filter(
            ([identity]) => identity !== live.identity,
          ),
        ),
      },
    },
  };
  next = addHistory(
    next,
    input.playerId,
    "capture",
    `${pokemon.technicalName} linked to ${zone.zoneName}.`,
    now,
  );
  // Replay the current party once to synchronize team membership, without inventing a new observation.
  next = ingestFrame(
    next,
    input.playerId,
    {
      ...tracking.latest,
      sequence: tracking.sequence + 1,
      observations: [],
      stateLoaded: false,
    },
    resolvePokemon,
    now,
    false,
  );
  next.tracking[input.playerId].sequence = tracking.sequence;
  next.run = finalizeRun(next.run, now);
  return recordSchema.parse(next);
}

export function resumeTracking(
  record: RunRecord,
  playerId: string,
  now = Date.now(),
): RunRecord {
  const tracking = record.tracking[playerId];
  if (!tracking) throw new Error("There is no game state to reconcile.");
  const rest = { ...tracking };
  delete rest.rewindCheckpoint;
  return addHistory(
    {
      ...record,
      revision: record.revision + 1,
      tracking: {
        ...record.tracking,
        [playerId]: {
          ...rest,
          suspended: false,
          pendingPokemon: tracking.pendingPokemon.filter((pokemon) =>
            tracking.latest.party.some(
              (current) => current.identity === pokemon.identity,
            ),
          ),
        },
      },
    },
    playerId,
    "connection",
    "Tracking resumed explicitly. Existing deaths and knowledge were preserved.",
    now,
  );
}

export function mapZone(
  record: RunRecord,
  input: MapZoneInput,
  now = Date.now(),
): RunRecord {
  if (record.run.id !== input.runId)
    throw new Error("The zone belongs to another run.");
  getPlayerIndex(record.run, input.playerId);
  const tracking = record.tracking[input.playerId];
  if (
    !tracking?.latest.location ||
    tracking.latest.location.id !== input.locationId
  )
    throw new Error(
      "The game location changed. Select the current location again.",
    );
  if (!record.run.zones.some((zone) => zone.id === input.zoneId))
    throw new Error("Select an existing encounter zone.");
  return recordSchema.parse({
    ...record,
    revision: record.revision + 1,
    tracking: {
      ...record.tracking,
      [input.playerId]: {
        ...tracking,
        zoneMappings: {
          ...tracking.zoneMappings,
          [input.locationId]: input.zoneId,
        },
      },
    },
    run: { ...record.run, updatedAt: now },
  });
}

export function materiallyChanged(
  previous: GameFrame | undefined,
  next: GameFrame,
): boolean {
  if (
    !previous ||
    next.stateLoaded ||
    next.frame < previous.frame ||
    next.sessionId !== previous.sessionId
  )
    return true;
  return (
    !sameValue(
      {
        game: previous.game,
        party: previous.party,
        location: previous.location,
        battle: previous.battle,
        warnings: previous.warnings,
      },
      {
        game: next.game,
        party: next.party,
        location: next.location,
        battle: next.battle,
        warnings: next.warnings,
      },
    ) || next.observations.length > 0
  );
}
