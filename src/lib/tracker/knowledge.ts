import type { Capture, Run, RunKnowledge, TypeObservation } from "../types";

export function getPlayerId(run: Run, playerIndex = 0): string {
  return (
    run.soulLinkPlayers?.find((player) => player.playerIndex === playerIndex)
      ?.id ?? "solo"
  );
}

export function getPlayerIndex(run: Run, playerId: string): number {
  if (!run.isSoulLinkMode && playerId === "solo") return 0;
  const player = run.soulLinkPlayers?.find((entry) => entry.id === playerId);
  if (!player) throw new Error("This player does not belong to the run.");
  return player.playerIndex;
}

export function pickKnowledge(run: RunKnowledge): RunKnowledge {
  return {
    customTypesByPokemonId: run.customTypesByPokemonId,
    customAbilitiesByPokemonId: run.customAbilitiesByPokemonId,
    statAnnotationsByPokemonId: run.statAnnotationsByPokemonId,
    pokedexObservationsByPokemonId: run.pokedexObservationsByPokemonId,
    pokedexNotesByPokemonId: run.pokedexNotesByPokemonId,
    evolutionHistoryByPokemonId: run.evolutionHistoryByPokemonId,
  };
}

export function isolateKnowledge(run: Run, playerId = getPlayerId(run)): Run {
  if (run.playerKnowledge) return run;
  return {
    ...run,
    ...pickKnowledge({}),
    playerKnowledge: { [playerId]: pickKnowledge(run) },
  };
}

export function knowledgeForPlayer(run: Run, playerId: string): RunKnowledge {
  return run.playerKnowledge
    ? (run.playerKnowledge[playerId] ?? {})
    : pickKnowledge(run);
}

export function knowledgeForCapture(run: Run, capture: Capture): RunKnowledge {
  return knowledgeForPlayer(run, getPlayerId(run, capture.playerIndex));
}

export function viewRunForPlayer(run: Run, playerId: string): Run {
  return { ...run, ...pickKnowledge(knowledgeForPlayer(run, playerId)) };
}

export function withSpeciesNotes(
  run: Run,
  pokemonId: number,
  notes: string,
): Run {
  const next = { ...run.pokedexNotesByPokemonId };
  if (notes.trim()) next[pokemonId] = notes.trim();
  else delete next[pokemonId];
  return {
    ...run,
    pokedexNotesByPokemonId: Object.keys(next).length ? next : undefined,
  };
}

const MANUAL_CLUE_PREFIX = "manual-";

/** Type clue entered by the player when the tracker missed a battle result. */
export function manualTypeObservation(
  type: TypeObservation["type"],
  attackType: string,
  now = Date.now(),
): TypeObservation {
  return {
    id: `${MANUAL_CLUE_PREFIX}${now}`,
    type,
    observationType: attackType,
    createdAt: now,
  };
}

export function isManualObservation(observation: TypeObservation): boolean {
  return observation.id.startsWith(MANUAL_CLUE_PREFIX);
}

/** Replaces the type clues of a species in a player view (see viewRunForPlayer). */
export function withSpeciesObservations(
  run: Run,
  pokemonId: number,
  observations: TypeObservation[],
): Run {
  const next = { ...run.pokedexObservationsByPokemonId };
  if (observations.length) next[pokemonId] = observations;
  else delete next[pokemonId];
  return {
    ...run,
    pokedexObservationsByPokemonId: Object.keys(next).length ? next : undefined,
  };
}

export function withSpeciesTypes(
  run: Run,
  playerId: string,
  pokemonId: number,
  types: string[],
): Run {
  const compact = types.filter(Boolean);
  const next = { ...run.customTypesByPokemonId };
  if (compact.length) next[pokemonId] = compact;
  else delete next[pokemonId];
  const owns = (capture: Capture) =>
    capture.pokemon.id === pokemonId &&
    (!run.playerKnowledge ||
      getPlayerId(run, capture.playerIndex) === playerId);
  const withTypes = (capture: Capture): Capture =>
    owns(capture)
      ? { ...capture, customTypes: compact.length ? compact : undefined }
      : capture;
  return {
    ...run,
    customTypesByPokemonId: Object.keys(next).length ? next : undefined,
    team: run.team.map(withTypes),
    ...(run.playerTeams
      ? {
          playerTeams: Object.fromEntries(
            Object.entries(run.playerTeams).map(([index, captures]) => [
              index,
              captures.map(withTypes),
            ]),
          ),
        }
      : {}),
    zones: run.zones.map((zone) => ({
      ...zone,
      captures: zone.captures.map(withTypes),
    })),
  };
}

export function saveKnowledgeView(run: Run, playerId: string): Run {
  if (!run.playerKnowledge) return run;
  return {
    ...run,
    ...pickKnowledge({}),
    playerKnowledge: {
      ...run.playerKnowledge,
      [playerId]: pickKnowledge(run),
    },
  };
}

export function withoutPrivateNotes(run: Run): Run {
  return {
    ...run,
    pokedexNotesByPokemonId: undefined,
    playerKnowledge: run.playerKnowledge
      ? Object.fromEntries(
          Object.entries(run.playerKnowledge).map(([id, knowledge]) => [
            id,
            { ...knowledge, pokedexNotesByPokemonId: undefined },
          ]),
        )
      : undefined,
  };
}

export function preservePrivateNotes(incoming: Run, local?: Run): Run {
  if (!local) return incoming;
  const playerKnowledge = { ...incoming.playerKnowledge };
  for (const [id, knowledge] of Object.entries(local.playerKnowledge ?? {})) {
    playerKnowledge[id] = {
      ...playerKnowledge[id],
      pokedexNotesByPokemonId: knowledge.pokedexNotesByPokemonId,
    };
  }
  return {
    ...incoming,
    pokedexNotesByPokemonId: local.pokedexNotesByPokemonId,
    ...(incoming.playerKnowledge ? { playerKnowledge } : {}),
  };
}
