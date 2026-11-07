import { test } from "node:test";
import assert from "node:assert/strict";
import {
  connectRun,
  ingestFrame,
  linkPokemon,
  resumeTracking,
} from "../src/lib/tracker/live";
import { applyRunEdit } from "../src/lib/tracker/records";
import { finalizeRun } from "../src/lib/tracker/run-rules";
import { gameFrameSchema } from "../src/lib/tracker/schema";
import { frame, record, pokemon, capture } from "./fixtures";

test("independent participant edits merge and duplicate commands are idempotent", () => {
  const initial = record(true);
  initial.run.zones[0].captures = [capture("a", 0), capture("b", 1)];
  initial.run = finalizeRun(initial.run);
  const first = structuredClone(initial.run);
  first.zones[0].captures[0].nickname = "First";
  const second = structuredClone(initial.run);
  second.zones[0].captures[1].nickname = "Second";
  const command = {
    id: "edit-a",
    playerId: "p1",
    runId: initial.run.id,
    before: initial.run,
    after: first,
  };
  const updated = applyRunEdit(initial, command, { enforceOwnership: true });
  const merged = applyRunEdit(
    updated,
    {
      id: "edit-b",
      playerId: "p2",
      runId: initial.run.id,
      before: initial.run,
      after: second,
    },
    { enforceOwnership: true },
  );
  assert.equal(merged.run.zones[0].captures[0].nickname, "First");
  assert.equal(merged.run.zones[0].captures[1].nickname, "Second");
  assert.deepEqual(
    applyRunEdit(merged, command, { enforceOwnership: true }),
    merged,
  );
});

test("conflicting edits and attempts to modify another player are rejected", () => {
  const initial = record(true);
  initial.run.zones[0].captures = [capture("a", 0), capture("b", 1)];
  initial.run = finalizeRun(initial.run);
  const changed = structuredClone(initial.run);
  changed.zones[0].captures[1].nickname = "Not mine";
  assert.throws(
    () =>
      applyRunEdit(
        initial,
        {
          id: "bad",
          playerId: "p1",
          runId: initial.run.id,
          before: initial.run,
          after: changed,
        },
        { enforceOwnership: true },
      ),
    /only edit their own/,
  );
  changed.zones[0].captures[1].nickname = undefined;
  changed.zones[0].captures[0].nickname = "First";
  const updated = applyRunEdit(initial, {
    id: "first",
    playerId: "p1",
    runId: initial.run.id,
    before: initial.run,
    after: changed,
  });
  changed.zones[0].captures[0].nickname = "Conflicting";
  assert.throws(
    () =>
      applyRunEdit(updated, {
        id: "second",
        playerId: "p1",
        runId: initial.run.id,
        before: initial.run,
        after: changed,
      }),
    /Conflicting changes/,
  );
});

test("an explicitly linked Pokémon keeps its identity through evolution and records fainting", () => {
  let current = ingestFrame(record(), "solo", frame(), pokemon, 100);
  assert.equal(current.run.zones[0].captures.length, 0);
  assert.equal(current.tracking.solo.pendingPokemon.length, 1);
  current = linkPokemon(
    current,
    {
      runId: current.run.id,
      playerId: "solo",
      identity: frame().party[0].identity,
      zoneId: "route-1",
    },
    pokemon,
    101,
  );
  const captureId = current.run.zones[0].captures[0].id;
  assert.equal(current.run.team[0].id, captureId);
  const evolved = frame(2);
  evolved.party[0].pokemonId = 2;
  current = ingestFrame(current, "solo", evolved, pokemon, 102);
  assert.equal(current.run.zones[0].captures[0].id, captureId);
  assert.equal(current.run.zones[0].captures[0].pokemon.id, 2);
  assert.equal(
    current.run.playerKnowledge?.solo.evolutionHistoryByPokemonId?.[1].length,
    2,
  );
  const fainted = structuredClone(evolved);
  fainted.sequence = 3;
  fainted.frame = 30;
  fainted.party[0].hp = 0;
  current = ingestFrame(current, "solo", fainted, pokemon, 103);
  assert.equal(current.run.zones[0].captures[0].isDead, true);
  assert.equal(current.run.team.length, 0);
  const healed = { ...evolved, sequence: 4, frame: 40 };
  current = ingestFrame(current, "solo", healed, pokemon, 104);
  assert.equal(current.run.zones[0].captures[0].isDead, true);
});

test("SoulLink losses propagate by explicit group rather than matching route names", () => {
  const initial = record(true);
  initial.run.zones[0].captures = [
    { ...capture("a", 0), isDead: true, soulLinkGroupId: "pair-a" },
  ];
  initial.run.zones.push({
    id: "other-route",
    zoneName: "Other route",
    regionArea: "Other",
    status: "captured",
    updatedAt: 1,
    captures: [
      { ...capture("b", 1), soulLinkGroupId: "pair-a" },
      { ...capture("c", 1), soulLinkGroupId: "pair-b" },
    ],
  });
  const updated = finalizeRun(initial.run, 10);
  assert.equal(updated.zones[1].captures[0].linkedDeath, true);
  assert.equal(updated.zones[1].captures[1].isDead, false);
});

test("observations survive restart data, remain seed-scoped and never reveal hidden opponent fields", () => {
  let current = connectRun(record(true), "p1");
  const first = frame();
  first.observations = [
    {
      id: "move-1",
      encounterId: "encounter-1",
      pokemonId: 4,
      kind: "move",
      value: "Ember",
      moveId: 52,
    },
  ];
  current = ingestFrame(current, "p1", first, pokemon, 100);
  assert.equal(
    ingestFrame(current, "p1", first, pokemon, 101).observations.length,
    1,
  );
  const other = frame();
  other.game.romHash = "different-seed";
  current = ingestFrame(current, "p2", other, pokemon, 102);
  assert.equal(
    current.observations.filter((entry) => entry.playerId === "p2").length,
    0,
  );
  assert.throws(
    () => ingestFrame(current, "p1", other, pokemon),
    /does not match/,
  );
  assert.equal(
    gameFrameSchema.safeParse({
      ...first,
      battle: {
        id: "battle",
        kind: "wild",
        opponents: [
          {
            identity: "enemy",
            pokemonId: 4,
            level: 5,
            moves: [52],
          },
        ],
      },
    }).success,
    false,
  );
});

test("save-state rollback pauses mutations and requires explicit reconciliation", () => {
  let current = ingestFrame(record(), "solo", frame(10), pokemon, 100);
  const rewind = frame(11);
  rewind.frame = 1;
  rewind.stateLoaded = true;
  current = ingestFrame(current, "solo", rewind, pokemon, 101);
  assert.equal(current.tracking.solo.suspended, true);
  assert.equal(current.history.at(-1)?.kind, "rollback");
  const pausedFrame = frame(12);
  pausedFrame.observations = [
    {
      id: "during-reconciliation",
      encounterId: "encounter-2",
      pokemonId: 4,
      kind: "effectiveness",
      value: "weakness",
      attackType: "water",
    },
  ];
  current = ingestFrame(current, "solo", pausedFrame, pokemon, 102);
  assert.equal(current.tracking.solo.suspended, true);
  assert.equal(current.observations.length, 1);
  assert.equal(
    current.run.playerKnowledge?.solo.pokedexObservationsByPokemonId?.[4][0]
      .type,
    "weakness",
  );
  const resumed = resumeTracking(current, "solo", 102);
  assert.equal(resumed.tracking.solo.suspended, false);
  assert.equal(
    resumed.history.filter((entry) => entry.kind === "rollback").length,
    1,
  );
});
