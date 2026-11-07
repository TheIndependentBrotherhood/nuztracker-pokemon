import type { Capture, PokemonData, Run } from "../src/lib/types";
import type { GameFrame } from "../src/lib/tracker/types";
import { createRecord } from "../src/lib/tracker/records";

export function pokemon(id = 1): PokemonData {
  return {
    id,
    technicalName: `pokemon-${id}`,
    generation: 1,
    types: ["grass"],
    abilities: [],
    stats: [],
    height: 1,
    weight: 1,
    sprites: {
      normal: { default: "", alternatives: [] },
      shiny: { default: "", alternatives: [] },
    },
  };
}

export function capture(id: string, playerIndex = 0): Capture {
  return {
    id,
    playerIndex,
    pokemon: pokemon(),
    isDead: false,
    isShiny: false,
    gender: "unknown",
    createdAt: 1,
  };
}

export function run(soulLink = false): Run {
  return {
    id: "run-1",
    gameName: "Test run",
    region: "kanto",
    difficulty: "normal",
    isShinyHuntMode: false,
    isRandomMode: false,
    status: "in-progress",
    typeChartGeneration: "gen2-5",
    team: [],
    zones: [
      {
        id: "route-1",
        zoneName: "Route 1",
        regionArea: "Kanto",
        status: "not-visited",
        captures: [],
        updatedAt: 1,
      },
    ],
    createdAt: 1,
    updatedAt: 1,
    ...(soulLink
      ? {
          isSoulLinkMode: true,
          soulLinkPlayers: [
            { id: "p1", name: "Player 1", playerIndex: 0 as const },
            { id: "p2", name: "Player 2", playerIndex: 1 as const },
          ],
          playerTeams: {},
        }
      : {}),
  };
}

export function record(soulLink = false) {
  return createRecord(run(soulLink), 1);
}

export function frame(sequence = 1): GameFrame {
  return {
    protocolVersion: 1,
    connector: "test",
    sessionId: "session-1",
    sequence,
    frame: sequence * 10,
    game: {
      gameCode: "BPRE",
      revision: 0,
      language: "en",
      romHash: "rom-1",
      trainerId: "123",
    },
    party: [
      {
        identity: "pokemon-identity-1",
        pokemonId: 1,
        level: 5,
        hp: 20,
        maxHp: 20,
        status: "healthy",
        isEgg: false,
        isShiny: false,
        gender: "unknown",
        moves: [{ id: 33, pp: 35 }],
      },
    ],
    location: { id: "map-1" },
    observations: [],
  };
}
