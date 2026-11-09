import { test } from "node:test";
import assert from "node:assert/strict";
import {
  connectRun,
  ingestFrame,
  linkPokemon,
  resumeTracking,
} from "../src/lib/tracker/live";
import { applyRunEdit } from "../src/lib/tracker/records";
import {
  finalizeRun,
  resolvePendingFaint,
  reviveCapture,
} from "../src/lib/tracker/run-rules";
import { gameFrameSchema } from "../src/lib/tracker/schema";
import {
  getZoneOutcomeForPlayer,
  soulLinkCaptureSlot,
} from "../src/lib/zone-progress";
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
  current = {
    ...current,
    run: reviveCapture(current.run, captureId, 105),
  };
  assert.equal(current.run.zones[0].captures[0].isDead, false);
  assert.equal(current.run.zones[0].captures[0].diedAt, undefined);
  assert.equal(current.run.team[0].id, captureId);
  current = ingestFrame(
    current,
    "solo",
    { ...healed, sequence: 5, frame: 50 },
    pokemon,
    106,
  );
  assert.equal(current.run.zones[0].captures[0].isDead, false);
  assert.equal(current.run.team[0].id, captureId);
  assert.throws(() => reviveCapture(current.run, captureId));
});

test("the first and only party Pokémon is linked to the Starter zone automatically", () => {
  const initial = record();
  initial.run.zones.unshift({
    id: "starter",
    zoneName: "Starter",
    regionArea: "Kanto",
    status: "not-visited",
    captures: [],
    updatedAt: 1,
  });
  let current = ingestFrame(initial, "solo", frame(), pokemon, 100);
  const starter = current.run.zones.find((zone) => zone.id === "starter")!;
  assert.equal(starter.captures.length, 1);
  assert.equal(starter.captures[0].gameIdentity, "pokemon-identity-1");
  assert.equal(current.run.team.length, 1);
  assert.equal(current.tracking.solo.pendingPokemon.length, 0);
  const second = frame(2);
  second.party.push({ ...second.party[0], identity: "pokemon-identity-2" });
  current = ingestFrame(current, "solo", second, pokemon, 101);
  assert.equal(starter.captures.length, 1);
  assert.equal(current.tracking.solo.pendingPokemon.length, 1);
});

test("faints before the first Poké Ball wait for the player's decision", () => {
  const initial = record();
  initial.run.zones.unshift({
    id: "starter",
    zoneName: "Starter",
    regionArea: "Kanto",
    status: "not-visited",
    captures: [],
    updatedAt: 1,
  });
  const at = (sequence: number, hp: number, pokeBalls: number) => {
    const next = frame(sequence);
    next.frame = sequence * 10;
    next.party[0].hp = hp;
    next.pokeBalls = pokeBalls;
    return next;
  };
  let current = ingestFrame(initial, "solo", at(1, 20, 0), pokemon, 100);
  const starter = () =>
    current.run.zones.find((zone) => zone.id === "starter")!.captures[0];
  current = ingestFrame(current, "solo", at(2, 0, 0), pokemon, 101);
  assert.equal(starter().isDead, false);
  assert.equal(starter().faintPendingAt, 101);
  assert.equal(current.run.team.length, 1);
  assert.equal(current.tracking.solo.nuzlockeStartedAt, undefined);
  current = {
    ...current,
    run: resolvePendingFaint(current.run, starter().id, false, 102),
  };
  assert.equal(starter().faintPendingAt, undefined);
  assert.equal(starter().isDead, false);
  current = ingestFrame(current, "solo", at(3, 20, 0), pokemon, 103);
  current = ingestFrame(current, "solo", at(4, 0, 0), pokemon, 104);
  current = {
    ...current,
    run: resolvePendingFaint(current.run, starter().id, true, 105),
  };
  assert.equal(starter().isDead, true);
  assert.equal(starter().diedAt, 104);
  assert.equal(current.run.team.length, 0);
  current = {
    ...current,
    run: reviveCapture(current.run, starter().id, 106),
  };
  current = ingestFrame(current, "solo", at(5, 20, 5), pokemon, 107);
  assert.equal(current.tracking.solo.nuzlockeStartedAt, 107);
  current = ingestFrame(current, "solo", at(6, 20, 0), pokemon, 108);
  current = ingestFrame(current, "solo", at(7, 0, 0), pokemon, 109);
  assert.equal(current.tracking.solo.nuzlockeStartedAt, 107);
  assert.equal(starter().isDead, true);
  assert.equal(starter().faintPendingAt, undefined);
});

function wildRun() {
  const initial = record();
  initial.run.zones = [
    {
      id: "starter",
      zoneName: "Starter",
      regionArea: "",
      status: "not-visited",
      captures: [],
      updatedAt: 1,
    },
    ...[
      "sinnoh-route-201-area",
      "lake-verity-before-galactic-intervention",
      "lake-verity-after-galactic-intervention",
    ].map((id) => ({
      id,
      zoneName: id,
      regionArea: "",
      status: "not-visited" as const,
      captures: [],
      updatedAt: 1,
    })),
  ];
  return ingestFrame(initial, "solo", frame(), pokemon, 100);
}

function withWildCapture(
  current: ReturnType<typeof wildRun>,
  mapName: string,
  pid: string,
  sequence: number,
) {
  const battle = frame(sequence);
  battle.location = {
    id: `map-${mapName.replaceAll(" ", "-")}`,
    name: mapName,
  };
  battle.battle = {
    id: `battle-${sequence}`,
    kind: "wild",
    opponents: [{ identity: `${pid}-1`, pokemonId: 2, level: 3 }],
  };
  current = ingestFrame(current, "solo", battle, pokemon, 100 + sequence);
  const caught = frame(sequence + 1);
  caught.location = {
    id: "map-pokecenter",
    name: "Jubilife City Pokecenter 1F",
  };
  caught.party.push({
    ...caught.party[0],
    identity: `${pid}-00000123`,
    pokemonId: 2,
  });
  return ingestFrame(current, "solo", caught, pokemon, 101 + sequence);
}

test("a caught wild Pokémon is linked to the zone of its wild battle", () => {
  const current = withWildCapture(wildRun(), "Route 201", "0000abcd", 2);
  const route = current.run.zones.find(
    (zone) => zone.id === "sinnoh-route-201-area",
  )!;
  assert.equal(route.captures[0]?.gameIdentity, "0000abcd-00000123");
  assert.equal(current.tracking.solo.pendingPokemon.length, 0);
  assert.equal(current.run.team.length, 2);
});

test("doubtful captures stay pending with a reason and a suggestion", () => {
  let current = withWildCapture(wildRun(), "Route 201", "0000abcd", 2);
  current = withWildCapture(current, "Route 201", "0000beef", 4);
  assert.deepEqual(
    current.tracking.solo.pendingDetails?.["0000beef-00000123"],
    {
      reason: "zone-taken",
      zoneId: "sinnoh-route-201-area",
    },
  );
  current = withWildCapture(current, "Lake Verity", "0000cafe", 6);
  assert.equal(
    current.tracking.solo.pendingDetails?.["0000cafe-00000123"]?.reason,
    "ambiguous-zone",
  );
  const gift = frame(8);
  gift.location = { id: "map-201", name: "Route 201" };
  gift.party = [
    ...current.tracking.solo.latest.party,
    { ...gift.party[0], identity: "0000f00d-00000123" },
  ];
  current = ingestFrame(current, "solo", gift, pokemon, 200);
  assert.deepEqual(
    current.tracking.solo.pendingDetails?.["0000f00d-00000123"],
    {
      reason: "no-encounter",
      zoneId: "sinnoh-route-201-area",
    },
  );
  current = linkPokemon(
    current,
    {
      runId: current.run.id,
      playerId: "solo",
      identity: "0000cafe-00000123",
      zoneId: "lake-verity-before-galactic-intervention",
    },
    pokemon,
    201,
  );
  assert.equal(
    current.tracking.solo.pendingDetails?.["0000cafe-00000123"],
    undefined,
  );
  assert.equal(current.tracking.solo.pendingPokemon.length, 2);
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

test("SoulLink shiny hunt keeps one linked shiny second chance per player and zone", () => {
  const initial = connectRun(record(true), "p1");
  initial.run.isShinyHuntMode = true;
  initial.run.zones[0].captures = [
    capture("a", 0),
    { ...capture("b", 1), isDead: true, failedCapture: true },
  ];
  const zone = initial.run.zones[0];
  assert.equal(
    soulLinkCaptureSlot({ ...zone, captures: [] }, 0, true, true),
    "shiny",
    "A first shiny takes the shiny second chance",
  );
  assert.equal(
    soulLinkCaptureSlot(
      {
        ...zone,
        captures: [{ ...capture("s", 0), isShiny: true, shinyChance: true }],
      },
      0,
      true,
      true,
    ),
    "regular",
    "A second shiny falls back to the free regular encounter",
  );
  assert.equal(
    soulLinkCaptureSlot({ ...zone, captures: [] }, 0, true, false),
    "regular",
  );
  assert.equal(soulLinkCaptureSlot(zone, 0, false, true), undefined);
  assert.equal(soulLinkCaptureSlot(zone, 0, true, false), undefined);
  assert.equal(soulLinkCaptureSlot(zone, 1, true, true), "shiny");

  const party = frame();
  party.party = [
    party.party[0],
    { ...party.party[0], identity: "pokemon-identity-2", isShiny: true },
  ];
  let current = ingestFrame(initial, "p1", party, pokemon, 100);
  const link = (identity: string) =>
    linkPokemon(
      current,
      { runId: current.run.id, playerId: "p1", identity, zoneId: "route-1" },
      pokemon,
      101,
    );
  assert.throws(() => link("pokemon-identity-1"), /no eligible encounter/);
  const emptyZone = structuredClone(current);
  emptyZone.run.zones[0].captures = [];
  const linkShiny = (start: typeof current) =>
    linkPokemon(
      start,
      {
        runId: start.run.id,
        playerId: "p1",
        identity: "pokemon-identity-2",
        zoneId: "route-1",
      },
      pokemon,
      101,
    ).run.zones[0].captures;
  const [firstShiny] = linkShiny(emptyZone);
  assert.equal(firstShiny.shinyChance, true);
  assert.equal(firstShiny.soulLinkGroupId, "route-1:shiny");
  const secondChanceUsed = structuredClone(emptyZone);
  secondChanceUsed.run.zones[0].captures = [
    { ...capture("s", 0), isShiny: true, shinyChance: true },
  ];
  const secondShiny = linkShiny(secondChanceUsed).find(
    (entry) => entry.gameIdentity === "pokemon-identity-2",
  );
  assert.equal(secondShiny?.shinyChance, undefined);
  assert.equal(secondShiny?.soulLinkGroupId, "route-1");
  current = link("pokemon-identity-2");
  const shiny = current.run.zones[0].captures.find(
    (entry) => entry.gameIdentity === "pokemon-identity-2",
  );
  assert.equal(shiny?.shinyChance, true);
  assert.equal(shiny?.soulLinkGroupId, "route-1:shiny");
  assert.equal(shiny?.isDead, false);
  assert.equal(getZoneOutcomeForPlayer(current.run.zones[0], 0), "captured");

  current.run.zones[0].captures.push({
    ...capture("c", 1),
    isShiny: true,
    shinyChance: true,
    isDead: true,
  });
  const updated = finalizeRun(current.run, 200);
  const linked = updated.zones[0].captures.find(
    (entry) => entry.id === shiny?.id,
  );
  assert.equal(linked?.linkedDeath, true);
  assert.equal(linked?.killedByPlayerIndex, 1);
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
  rewind.party[0].level = 4;
  current = ingestFrame(current, "solo", rewind, pokemon, 101);
  assert.equal(current.tracking.solo.suspended, true);
  assert.equal(current.history.at(-1)?.kind, "rollback");
  const pausedFrame = frame(12);
  pausedFrame.party[0].level = 4;
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
  assert.equal(resumed.tracking.solo.rewindCheckpoint, undefined);
  assert.equal(
    resumed.history.filter((entry) => entry.kind === "rollback").length,
    1,
  );
});

test("a loaded state that matches the tracked team keeps or resumes tracking", () => {
  let current = ingestFrame(record(), "solo", frame(10), pokemon, 100);
  const sameTeam = frame(11);
  sameTeam.frame = 1;
  sameTeam.stateLoaded = true;
  current = ingestFrame(current, "solo", sameTeam, pokemon, 101);
  assert.equal(current.tracking.solo.suspended, false);
  assert.equal(current.history.at(-1)?.kind, "rollback");

  const older = frame(12);
  older.frame = 0;
  older.stateLoaded = true;
  older.party[0].level = 3;
  current = ingestFrame(current, "solo", older, pokemon, 102);
  assert.equal(current.tracking.solo.suspended, true);
  assert.equal(current.tracking.solo.rewindCheckpoint?.party[0].level, 5);

  const caughtUp = frame(13);
  caughtUp.frame = 5;
  current = ingestFrame(current, "solo", caughtUp, pokemon, 103);
  assert.equal(current.tracking.solo.suspended, false);
  assert.equal(current.tracking.solo.rewindCheckpoint, undefined);
  assert.equal(current.history.at(-1)?.kind, "connection");
});

test("a loaded state that revives a dead Pokémon stays paused", () => {
  const base = record();
  base.run.zones[0].captures.push({
    ...capture("dead"),
    gameIdentity: "pokemon-identity-1",
    isDead: true,
  });
  let current = ingestFrame(base, "solo", frame(10), pokemon, 100);
  const revived = frame(11);
  revived.frame = 1;
  revived.stateLoaded = true;
  current = ingestFrame(current, "solo", revived, pokemon, 101);
  assert.equal(current.tracking.solo.suspended, true);
});
