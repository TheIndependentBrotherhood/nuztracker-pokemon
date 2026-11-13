import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureAbility,
  ingestFrame,
  linkPokemon,
} from "../src/lib/tracker/live";
import { applyRunEdit } from "../src/lib/tracker/records";
import {
  manualTypeObservation,
  saveKnowledgeView,
  viewRunForPlayer,
  withSpeciesObservations,
} from "../src/lib/tracker/knowledge";
import {
  mergeRomKnowledge,
  sharedSeenEncounters,
} from "../src/lib/tracker/shared-rom";
import { overlayData } from "../src/lib/tracker/overlay";
import type { GameFrame } from "../src/lib/tracker/types";
import { frame, pokemon, record } from "./fixtures";

function playerFrame(
  player: "p1" | "p2",
  sequence = 1,
  romHash = "rom-1",
): GameFrame {
  const base = frame(sequence);
  return {
    ...base,
    sessionId: `session-${player}`,
    game: { ...base.game, romHash, trainerId: player === "p1" ? "111" : "222" },
    party: base.party.map((entry) => ({
      ...entry,
      identity: `${player}-identity`,
    })),
  };
}

function randomRun() {
  const initial = record(true);
  initial.run.isRandomMode = true;
  initial.run.randomizerOptions = {
    randomizeTypes: true,
    randomizeAbilities: true,
    randomizeEncounters: false,
    randomizeEvolvedForms: false,
    randomizeStats: false,
  };
  return initial;
}

function wildBattle(input: GameFrame, pokemonId: number): GameFrame {
  return {
    ...input,
    location: {
      id: "map-1",
      encounters: [
        { pokemonId, method: "grass", rate: 50, minLevel: 2, maxLevel: 4 },
        { pokemonId: 999, method: "grass", rate: 50, minLevel: 2, maxLevel: 4 },
      ],
    },
    battle: {
      id: `battle-${pokemonId}`,
      kind: "wild",
      opponents: [{ identity: `wild-${pokemonId}`, pokemonId, level: 3 }],
    },
  };
}

test("allies on the same ROM share party types, abilities and battle clues", () => {
  let current = ingestFrame(randomRun(), "p1", playerFrame("p1"), pokemon, 1);
  const allyParty = playerFrame("p2");
  allyParty.party[0].types = ["ice"];
  allyParty.party[0].ability = "Wonder Guard";
  current = ingestFrame(current, "p2", allyParty, pokemon, 2);
  current = linkPokemon(
    current,
    {
      runId: current.run.id,
      playerId: "p2",
      identity: "p2-identity",
      zoneId: "route-1",
    },
    pokemon,
    3,
  );
  const clue = playerFrame("p2", 2);
  clue.party = allyParty.party;
  clue.observations = [
    {
      id: "eff-25-ground-immunity",
      encounterId: "battle-1",
      pokemonId: 25,
      kind: "effectiveness",
      value: "immunity",
      attackType: "ground",
    },
  ];
  current = ingestFrame(current, "p2", clue, pokemon, 4);
  const shared = current.run.playerKnowledge?.p1;
  assert.deepEqual(shared?.customTypesByPokemonId?.[1], ["ice"]);
  assert.deepEqual(shared?.customAbilitiesByPokemonId?.[1], ["wonder-guard"]);
  assert.deepEqual(
    shared?.pokedexObservationsByPokemonId?.[25]?.map((entry) => entry.id),
    ["eff-25-ground-immunity"],
  );
  assert.equal(current.run.zones[0].captures[0].ability, "wonder-guard");
});

test("players on different ROMs keep isolated knowledge", () => {
  let current = ingestFrame(randomRun(), "p1", playerFrame("p1"), pokemon, 1);
  const ally = playerFrame("p2", 1, "rom-2");
  ally.observations = [
    {
      id: "eff-25-ground-immunity",
      encounterId: "battle-1",
      pokemonId: 25,
      kind: "effectiveness",
      value: "immunity",
      attackType: "ground",
    },
  ];
  current = ingestFrame(current, "p2", ally, pokemon, 2);
  assert.equal(
    current.run.playerKnowledge?.p1.pokedexObservationsByPokemonId,
    undefined,
  );
});

test("manual clues and their removal reach allies on the same ROM", () => {
  let current = ingestFrame(randomRun(), "p1", playerFrame("p1"), pokemon, 1);
  current = ingestFrame(current, "p2", playerFrame("p2"), pokemon, 2);
  const before = viewRunForPlayer(current.run, "p1");
  const clue = manualTypeObservation("weakness", "fire", 10);
  const after = withSpeciesObservations(before, 25, [clue]);
  current = applyRunEdit(
    current,
    {
      id: "add-clue",
      runId: current.run.id,
      playerId: "p1",
      before: saveKnowledgeView(before, "p1"),
      after: saveKnowledgeView(after, "p1"),
    },
    { enforceOwnership: true },
  );
  assert.deepEqual(
    current.run.playerKnowledge?.p2.pokedexObservationsByPokemonId?.[25],
    [clue],
  );
  const view = viewRunForPlayer(current.run, "p2");
  current = applyRunEdit(
    current,
    {
      id: "remove-clue",
      runId: current.run.id,
      playerId: "p2",
      before: saveKnowledgeView(view, "p2"),
      after: saveKnowledgeView(withSpeciesObservations(view, 25, []), "p2"),
    },
    { enforceOwnership: true },
  );
  assert.equal(
    current.run.playerKnowledge?.p1.pokedexObservationsByPokemonId,
    undefined,
  );
});

test("connecting pools the knowledge gathered separately on the same ROM", () => {
  const initial = randomRun();
  initial.run.playerKnowledge = {
    p1: { customTypesByPokemonId: { 1: ["fire"] } },
    p2: {
      customTypesByPokemonId: { 1: ["water"], 4: ["rock"] },
      pokedexNotesByPokemonId: { 4: "private" },
    },
  };
  const merged = mergeRomKnowledge(initial.run, ["p1", "p2"]);
  assert.deepEqual(merged.playerKnowledge?.p1.customTypesByPokemonId, {
    1: ["fire"],
    4: ["rock"],
  });
  assert.deepEqual(merged.playerKnowledge?.p2.customTypesByPokemonId, {
    1: ["water"],
    4: ["rock"],
  });
  assert.equal(merged.playerKnowledge?.p1.pokedexNotesByPokemonId, undefined);
});

test("the same outcome against the same type is recorded only once", () => {
  let current = ingestFrame(randomRun(), "p1", playerFrame("p1"), pokemon, 1);
  current = ingestFrame(current, "p2", playerFrame("p2"), pokemon, 2);
  const clue = (player: "p1" | "p2", id: string, value: string) => {
    const next = playerFrame(player, Number(id.slice(-1)) + 2);
    next.observations = [
      {
        id,
        encounterId: `battle-${id}`,
        pokemonId: 25,
        kind: "effectiveness",
        value,
        attackType: "ground",
      },
    ];
    return next;
  };
  current = ingestFrame(
    current,
    "p1",
    clue("p1", "a1", "resistance"),
    pokemon,
    3,
  );
  current = ingestFrame(
    current,
    "p1",
    clue("p1", "a2", "resistance"),
    pokemon,
    4,
  );
  current = ingestFrame(
    current,
    "p2",
    clue("p2", "b3", "resistance"),
    pokemon,
    5,
  );
  current = ingestFrame(current, "p2", clue("p2", "b4", "neutral"), pokemon, 6);
  for (const player of ["p1", "p2"])
    assert.deepEqual(
      current.run.playerKnowledge?.[
        player
      ].pokedexObservationsByPokemonId?.[25]?.map((entry) => entry.type),
      ["resistance", "neutral"],
    );

  const initial = randomRun();
  const duplicate = (id: string) => ({
    id,
    type: "weakness" as const,
    observationType: "fire",
    createdAt: 1,
  });
  initial.run.playerKnowledge = {
    p1: { pokedexObservationsByPokemonId: { 4: [duplicate("x")] } },
    p2: { pokedexObservationsByPokemonId: { 4: [duplicate("y")] } },
  };
  const merged = mergeRomKnowledge(initial.run, ["p1", "p2"]);
  assert.deepEqual(
    merged.playerKnowledge?.p1.pokedexObservationsByPokemonId?.[4],
    [duplicate("x")],
  );
  assert.deepEqual(
    merged.playerKnowledge?.p2.pokedexObservationsByPokemonId?.[4],
    [duplicate("y")],
  );
});

test("wild encounters of an ally on the same ROM count for the zone", () => {
  let current = ingestFrame(randomRun(), "p1", playerFrame("p1"), pokemon, 1);
  current = ingestFrame(
    current,
    "p2",
    wildBattle(playerFrame("p2"), 25),
    pokemon,
    2,
  );
  current = ingestFrame(
    current,
    "p1",
    {
      ...playerFrame("p1", 2),
      location: wildBattle(playerFrame("p1"), 25).location,
    },
    pokemon,
    3,
  );
  assert.deepEqual(
    sharedSeenEncounters(current, "p1").map((entry) => entry.pokemonId),
    [25],
  );
  const team = overlayData(current).teams.find(
    (entry) => entry.playerId === "p1",
  );
  assert.equal(team?.zoneEncounters?.seen, 1);
});

test("party abilities are stored with their localizable id", () => {
  const live = playerFrame("p1").party[0];
  assert.equal(
    captureAbility({ ...live, ability: "Compound Eyes" }),
    "compound-eyes",
  );
  assert.equal(
    captureAbility({ ...live, ability: "Rom Power", customAbility: true }),
    "Rom Power",
  );
});
