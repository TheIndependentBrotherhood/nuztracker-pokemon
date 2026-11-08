import type { Capture, Run, RunKnowledge } from "../types";

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
