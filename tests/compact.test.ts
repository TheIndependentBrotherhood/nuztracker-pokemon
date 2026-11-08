import { test } from "node:test";
import assert from "node:assert/strict";
import { pokemonForGame } from "../src/lib/game-reference";
import { getCaptureTypesForRun } from "../src/lib/capture-types";
import {
  applyOverlayCommand,
  currentOverlayView,
  defaultOverlayControl,
  overlayCommandSchema,
} from "../src/lib/tracker/overlay-control";
import {
  isOverlayTeamLive,
  overlayData,
  overlaySchema,
} from "../src/lib/tracker/overlay";
import { buildShareUrl, decodeTeam, encodeTeam } from "../src/lib/share";
import {
  isolateKnowledge,
  knowledgeForPlayer,
  saveKnowledgeView,
  viewRunForPlayer,
} from "../src/lib/tracker/knowledge";
import { exportArchive, readArchive } from "../src/lib/tracker/archive";
import { ingestFrame, linkPokemon, mapZone } from "../src/lib/tracker/live";
import { applyRoomCommand } from "../desktop/room-protocol";
import { zonesForGame } from "../src/lib/zones";
import { encounterAreasForZone } from "../src/lib/encounter-reference";
import encounterData from "../public/data/game-encounters.json";
import { capture, frame, pokemon, record } from "./fixtures";

test("game references use generation-specific stats, types and abilities without mutating the original", () => {
  const pikachu = { ...pokemon(25), technicalName: "pikachu" };
  const original = structuredClone(pikachu);
  const fourth = pokemonForGame(pikachu, "platinum");
  assert.equal(
    fourth.stats.find((stat) => stat.stat.name === "defense")?.base_stat,
    30,
  );
  assert.equal(
    fourth.stats.find((stat) => stat.stat.name === "special-defense")
      ?.base_stat,
    40,
  );
  assert.equal(
    pokemonForGame(pikachu, "scarlet-violet").stats.find(
      (stat) => stat.stat.name === "defense",
    )?.base_stat,
    40,
  );
  assert.equal(pokemonForGame(pikachu, "red-blue").stats.length, 5);
  assert.equal(pokemonForGame(pikachu, "red-blue").abilities.length, 0);
  const clefairy = { ...pokemon(35), technicalName: "clefairy" };
  assert.deepEqual(pokemonForGame(clefairy, "platinum").types, ["normal"]);
  assert.deepEqual(pokemonForGame(clefairy, "scarlet-violet").types, ["fairy"]);
  assert.equal(
    pokemonForGame({ ...pokemon(94), technicalName: "gengar" }, "platinum")
      .abilities[0].ability.name,
    "levitate",
  );
  assert.equal(
    pokemonForGame({ ...pokemon(906), technicalName: "sprigatito" }, "platinum")
      .stats.length,
    0,
  );
  assert.deepEqual(pikachu, original);
  assert.equal(pokemonForGame(pikachu), pikachu);
  const run = record().run;
  run.gameVersion = "platinum";
  assert.deepEqual(
    getCaptureTypesForRun({ ...capture("test"), pokemon: clefairy }, run),
    ["normal"],
  );
});

test("random stat estimates remain player-scoped, keep canonical BST and survive a portable archive", async () => {
  const current = record(true);
  current.run = isolateKnowledge(current.run, "p1");
  current.run.gameVersion = "platinum";
  current.run.isRandomMode = true;
  current.run.randomizerOptions = {
    randomizeStats: true,
    randomizeTypes: false,
    randomizeAbilities: false,
    randomizeEncounters: false,
    randomizeEvolvedForms: false,
  };
  const first = viewRunForPlayer(current.run, "p1");
  first.statAnnotationsByPokemonId = { 25: { speed: "high", defense: "low" } };
  current.run = saveKnowledgeView(first, "p1");
  assert.equal(
    knowledgeForPlayer(current.run, "p2").statAnnotationsByPokemonId,
    undefined,
  );
  const member = {
    ...capture("pikachu", 0),
    pokemon: { ...pokemon(25), technicalName: "pikachu" },
  };
  current.run.zones[0].captures = [member];
  current.run.playerTeams = { 0: [member] };
  const payload = overlaySchema.parse(overlayData(current));
  assert.equal(payload.teams[0].members[0].bst, 300);
  assert.equal(payload.teams[0].members[0].baseStats, undefined);
  assert.equal(payload.teams[0].members[0].annotations?.speed, "high");
  const [restored] = await readArchive(await exportArchive([current]));
  assert.equal(restored.run.gameVersion, "platinum");
  assert.deepEqual(
    knowledgeForPlayer(restored.run, "p1").statAnnotationsByPokemonId,
    { 25: { speed: "high", defense: "low" } },
  );
});

test("temporary overlay commands expire exactly, replace each other and never revive superseded timers", () => {
  const hidden = applyOverlayCommand(
    defaultOverlayControl(),
    { action: "hide" },
    0,
  );
  const team = applyOverlayCommand(
    hidden,
    { action: "show-team", durationSeconds: 5 },
    1000,
  );
  assert.equal(currentOverlayView(team, 5999).mode, "team");
  assert.equal(currentOverlayView(team, 6000).mode, "hidden");
  const focus = applyOverlayCommand(
    team,
    { action: "show-pokemon", slot: 2, durationSeconds: 0.25 },
    2000,
  );
  assert.equal(currentOverlayView(focus, 2249).slot, 2);
  assert.equal(currentOverlayView(focus, 2250).mode, "hidden");
  const live = applyOverlayCommand(focus, { action: "live" }, 2100);
  assert.equal(currentOverlayView(live, 10000).mode, "live");
  for (const invalid of [
    { action: "show-pokemon" },
    { action: "show-pokemon", slot: 1, captureId: "x" },
    { action: "show-team", durationSeconds: 0 },
    { action: "show-team", durationSeconds: 3601 },
    { action: "show-pokemon", slot: 7 },
    { action: "hide", arbitrary: true },
  ])
    assert.equal(overlayCommandSchema.safeParse(invalid).success, false);
});

test("overlay freshness never reports a disconnected, suspended or future snapshot as live", () => {
  const current = record();
  current.tracking.solo = ingestFrame(
    current,
    "solo",
    frame(),
    pokemon,
    1000,
  ).tracking.solo;
  const team = overlayData(current).teams[0];
  assert.equal(isOverlayTeamLive(team, 999), false);
  assert.equal(isOverlayTeamLive(team, 1000), true);
  assert.equal(isOverlayTeamLive(team, 5999), true);
  assert.equal(isOverlayTeamLive(team, 6000), false);
  assert.equal(isOverlayTeamLive({ ...team, sourceError: true }, 2000), false);
  assert.equal(isOverlayTeamLive({ ...team, suspended: true }, 2000), false);
});

test("static shares preserve game-specific types, keep legacy links readable and reject damaged data", async () => {
  const current = record(true);
  current.run.gameVersion = "platinum";
  const clefairy = {
    ...capture("clefairy"),
    pokemon: { ...pokemon(35), technicalName: "clefairy", types: ["fairy"] },
  };
  const shared = await decodeTeam(await encodeTeam([clefairy], current.run));
  assert.deepEqual(shared[0].customTypes, ["normal"]);
  const legacy = await decodeTeam(await encodeTeam([clefairy]));
  assert.equal(legacy[0].customTypes, undefined);
  const url = new URL(
    buildShareUrl("encoded", { gameVersion: "platinum", randomTypes: true }),
    "https://example.test",
  );
  assert.equal(url.searchParams.get("game"), "platinum");
  assert.equal(url.searchParams.get("randomTypes"), "true");
  await assert.rejects(decodeTeam("damaged"), /invalid or damaged/);
});

test("zone discoveries are deduplicated, retain rewound observations, and mapping does not guess capture locations", async () => {
  const battle = frame();
  battle.battle = {
    id: "encounter-1",
    kind: "wild",
    opponents: [{ identity: "opponent-1", pokemonId: 25, level: 7 }],
  };
  let current = ingestFrame(record(), "solo", battle, pokemon, 100);
  current = ingestFrame(
    current,
    "solo",
    { ...battle, sequence: 2, frame: 20 },
    pokemon,
    200,
  );
  assert.equal(current.tracking.solo.seenEncounters?.length, 1);
  current = mapZone(
    current,
    {
      runId: current.run.id,
      playerId: "solo",
      locationId: "map-1",
      zoneId: "route-1",
    },
    201,
  );
  const rewound = {
    ...battle,
    sequence: 3,
    frame: 5,
    battle: { ...battle.battle!, id: "encounter-2" },
  };
  current = ingestFrame(current, "solo", rewound, pokemon, 300);
  assert.equal(current.tracking.solo.suspended, true);
  assert.equal(current.tracking.solo.seenEncounters?.length, 2);
  const [restored] = await readArchive(await exportArchive([current]));
  assert.equal(restored.tracking.solo.seenEncounters?.length, 2);
  assert.equal(restored.tracking.solo.zoneMappings["map-1"], "route-1");
  assert.throws(
    () =>
      mapZone(current, {
        runId: current.run.id,
        playerId: "solo",
        locationId: "old-map",
        zoneId: "route-1",
      }),
    /location changed/,
  );
  let linked = ingestFrame(record(), "solo", frame(), pokemon, 10);
  linked = linkPokemon(
    linked,
    {
      runId: linked.run.id,
      playerId: "solo",
      identity: frame().party[0].identity,
      zoneId: "route-1",
    },
    pokemon,
    11,
  );
  assert.deepEqual(linked.tracking.solo.zoneMappings, {});
  assert.throws(
    () =>
      applyRoomCommand(
        record(true),
        {
          id: "bad-map",
          kind: "map-zone",
          input: {
            runId: "run-1",
            playerId: "p2",
            locationId: "map-1",
            zoneId: "route-1",
          },
        },
        "p1",
        pokemon,
      ),
    /another player/,
  );
});

test("Platinum zone templates exclude remake-only areas and original encounter slots stay within 0-100 percent", () => {
  const zones = [
    "starter",
    "sinnoh-route-201",
    "jubilife-city",
    "distortion-world",
    "grand-underground",
  ].map((id) => ({ id, regionArea: "" }));
  assert.deepEqual(
    zonesForGame(zones, "platinum").map((zone) => zone.id),
    zones.slice(0, 4).map((zone) => zone.id),
  );
  assert.equal(zonesForGame(zones), zones);
  const matches = encounterAreasForZone(encounterData.areas, "platinum", {
    id: "sinnoh-route-201",
    zoneName: "Route 201",
  });
  assert.ok(matches.length > 0);
  assert.ok(matches.every((area) => area.game === "platinum"));
  assert.ok(
    encounterData.areas.every((area) =>
      area.entries.every((entry) => entry.chance >= 0 && entry.chance <= 100),
    ),
  );
});
