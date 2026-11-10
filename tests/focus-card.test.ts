import { test } from "node:test";
import assert from "node:assert/strict";
import { GameText } from "../src/lib/game-text";
import { hpColor } from "../src/lib/tracker/hp";
import { hiddenPowerFromIvs } from "../src/lib/tracker/hidden-power";
import { encounterOrder, nextEncounterPlayer } from "../src/lib/team-utils";
import {
  learnProgress,
  lightFocusMember,
  opponentMember,
  customSeenWords,
  overlayData,
  seenAbilityIds,
  seenMoveIds,
} from "../src/lib/tracker/overlay";
import {
  saveKnowledgeView,
  viewRunForPlayer,
  withSpeciesObservations,
  manualTypeObservation,
  isManualObservation,
  withSpeciesNotes,
  withSpeciesTypes,
  withoutPrivateNotes,
} from "../src/lib/tracker/knowledge";
import {
  getTypeDefensesForGeneration,
  getTypeOffensesForGeneration,
} from "../src/lib/type-chart";
import { connectRun, ingestFrame } from "../src/lib/tracker/live";
import type { LivePokemon } from "../src/lib/tracker/types";
import gameTextData from "../public/data/game-text.json";
import { capture, frame, pokemon, record } from "./fixtures";

const gameText = new GameText(
  gameTextData as unknown as ConstructorParameters<typeof GameText>[0],
);

function livePokemon(overrides: Partial<LivePokemon> = {}): LivePokemon {
  return { ...frame().party[0], ...overrides };
}

test("learn progress counts reachable level-up moves and the next learning level", () => {
  assert.deepEqual(learnProgress([1, 1, 7, 26, 26, 40], 10), {
    learned: 3,
    total: 6,
    next: 26,
  });
  assert.deepEqual(learnProgress([1, 7], 50), { learned: 2, total: 2 });
  assert.equal(learnProgress([], 10), undefined);
  assert.equal(learnProgress([1, 7], undefined), undefined);
});

test("seen opponent moves are deduplicated and listed most recent first", () => {
  let current = connectRun(record(true), "p1");
  const observe = (sequence: number, moveId: number, at: number) => {
    const next = frame(sequence);
    next.observations = [
      {
        id: `move-${sequence}-${moveId}`,
        encounterId: `battle-${sequence}`,
        pokemonId: 48,
        kind: "move",
        value: `Move ${moveId}`,
        moveId,
      },
    ];
    current = ingestFrame(current, "p1", next, pokemon, at);
  };
  observe(1, 52, 100);
  observe(2, 33, 200);
  observe(3, 52, 300);
  observe(4, 10, 150);
  assert.deepEqual(seenMoveIds(current, "p1", 48), [52, 33, 10]);
  assert.deepEqual(seenMoveIds(current, "p1", 4), []);
});

test("revealed opponent abilities are kept per species, separate from moves", () => {
  let current = connectRun(record(true), "p1");
  const next = frame(1);
  next.observations = [
    {
      id: "ability-battle-1-22",
      encounterId: "battle-1",
      pokemonId: 48,
      kind: "ability",
      value: "Intimidate",
      abilityId: 22,
    },
  ];
  current = ingestFrame(current, "p1", next, pokemon, 100);
  assert.deepEqual(seenAbilityIds(current, "p1", 48), [22]);
  assert.deepEqual(seenMoveIds(current, "p1", 48), []);
  assert.deepEqual(seenAbilityIds(current, "p1", 4), []);
});

test("HP bar colors follow the in-game thresholds", () => {
  assert.equal(hpColor(45, 45), "#22c55e");
  assert.equal(hpColor(23, 45), "#22c55e");
  assert.equal(hpColor(22, 45), "#facc15");
  assert.equal(hpColor(10, 45), "#facc15");
  assert.equal(hpColor(9, 45), "#ef4444");
  assert.equal(hpColor(0, 45), "#ef4444");
});

test("game words are localized by in-game id with an English fallback", () => {
  assert.deepEqual(
    [
      gameText.move({ id: 33, pp: 35 }, "fr").name,
      gameText.move({ id: 33, pp: 35 }, "en").name,
    ],
    ["Charge", "Tackle"],
  );
  // Gen 4 splits categories per move; earlier games derive them from the type.
  assert.equal(gameText.move({ id: 44, pp: 25 }, "fr", 4).category, "physical");
  assert.equal(
    gameText.move({ id: 44, pp: 25, type: "dark" }, "fr", 3).category,
    "special",
  );
  assert.equal(
    gameText.move({ id: 33, pp: 35, category: "special" }, "fr").category,
    "special",
  );
  assert.equal(
    gameText.ability(livePokemon({ abilityId: 65 }), "fr")?.name,
    "Engrais",
  );
  assert.equal(
    gameText.ability(livePokemon({ ability: "Overgrow" }), "fr")?.name,
    "Engrais",
  );
  assert.equal(
    gameText.item(livePokemon({ heldItemId: 17 }), "fr", 4)?.name,
    "Potion",
  );
  assert.equal(
    gameText.item(livePokemon({ heldItemId: 13 }), "en", 3)?.name,
    "Potion",
  );
  assert.deepEqual(gameText.nature(livePokemon({ nature: "Adamant" }), "fr"), {
    name: "Rigide",
    increased: "attack",
    decreased: "special-attack",
  });
  assert.equal(
    gameText.move({ id: 9999, pp: 1, name: "Custom" }, "fr").name,
    "Custom",
  );
});

test("a dead Pokémon still in the in-game party stays visible in party order", () => {
  const current = record();
  const fallen = {
    ...capture("fallen"),
    isDead: true,
    diedAt: 5,
    gameIdentity: "identity-fallen",
  };
  const alive = {
    ...capture("alive"),
    pokemon: pokemon(4),
    gameIdentity: "identity-alive",
  };
  current.run.zones[0].captures = [fallen, alive];
  current.run.team = [alive];
  const party = frame();
  party.party = [
    {
      ...party.party[0],
      identity: "identity-fallen",
      hp: 0,
      status: "fainted",
    },
    { ...party.party[0], identity: "identity-alive", pokemonId: 4 },
  ];
  current.tracking.solo = ingestFrame(
    current,
    "solo",
    party,
    pokemon,
    10000,
  ).tracking.solo;
  const members = overlayData(current).teams[0].members;
  assert.deepEqual(
    members.map((member) => [member.id, Boolean(member.isDead)]),
    [
      ["fallen", true],
      ["alive", false],
    ],
  );
});

test("The compact tracker receives the current zone in both languages", () => {
  const current = record();
  current.run.zones[0] = {
    ...current.run.zones[0],
    zoneNames: { fr: "Route 1 (FR)", en: "Route 1" },
  };
  current.tracking.solo = ingestFrame(
    current,
    "solo",
    { ...frame(), location: { id: "map-1", name: "ROUTE 1" } },
    pokemon,
    10000,
  ).tracking.solo;
  current.tracking.solo.zoneMappings = { "map-1": "route-1" };
  const team = overlayData(current).teams[0];
  assert.deepEqual(team.locationNames, { fr: "Route 1 (FR)", en: "Route 1" });
});

test("Live focuses on the opponent in battle, while party selection pins the player's card", () => {
  const current = record();
  current.run.team = [capture("lead"), capture("second")];
  const team = overlayData(current).teams[0];
  assert.equal(lightFocusMember(team, undefined)?.id, "lead");
  const enemy = opponentMember(
    current.run,
    "solo",
    { identity: "enemy-1", pokemonId: 48, level: 3 },
    pokemon(48),
  );
  team.inBattle = true;
  assert.equal(
    lightFocusMember(team, undefined),
    undefined,
    "Do not show the player while the opponent loads.",
  );
  assert.equal(lightFocusMember(team, enemy)?.id, "opponent-enemy-1");
  assert.equal(lightFocusMember(team, enemy, "second")?.id, "second");
  assert.equal(
    lightFocusMember(team, enemy)?.id,
    "opponent-enemy-1",
    "Live clears the party selection.",
  );
  assert.equal(lightFocusMember(team, enemy, "missing"), undefined);
  const replacement = { ...enemy, id: "opponent-enemy-2" };
  assert.equal(lightFocusMember(team, replacement)?.id, "opponent-enemy-2");
  team.inBattle = false;
  assert.equal(lightFocusMember(team, enemy)?.id, "lead");
});

test("random evolution targets are hidden for both SoulLink teams and opponents", () => {
  const current = record(true);
  current.run.playerTeams = {
    0: [capture("first", 0)],
    1: [capture("second", 1)],
  };
  const enemy = { identity: "enemy", pokemonId: 48, level: 8 };
  for (const [randomMode, randomEvolutions, hidden] of [
    [false, false, false],
    [false, true, false],
    [true, false, false],
    [true, true, true],
  ]) {
    current.run.isRandomMode = randomMode;
    current.run.randomizerOptions = {
      randomizeTypes: false,
      randomizeAbilities: false,
      randomizeEncounters: false,
      randomizeEvolvedForms: randomEvolutions,
    };
    const teams = overlayData(current).teams;
    assert.equal(teams.length, 2);
    for (const team of teams) {
      assert.equal(team.members.length, 1);
      assert.equal(Boolean(team.members[0].hideEvolutionTargets), hidden);
      assert.equal(
        Boolean(
          opponentMember(current.run, team.playerId, enemy, pokemon(48))
            .hideEvolutionTargets,
        ),
        hidden,
      );
    }
  }
});

test("opponent cards use game references and only the selected player's randomized knowledge", () => {
  const current = record(true);
  current.run.gameVersion = "platinum";
  const reference = {
    ...pokemon(81),
    technicalName: "magnemite",
    types: ["electric", "steel"],
  };
  const enemy = { identity: "enemy", pokemonId: 81, level: 8 };
  const standard = opponentMember(current.run, "p1", enemy, reference);
  assert.deepEqual(standard.types, ["electric", "steel"]);
  assert.equal(standard.bst, 325);
  assert.equal(
    standard.live,
    undefined,
    "No fabricated enemy HP, abilities or moves.",
  );
  current.run.isRandomMode = true;
  current.run.randomizerOptions = {
    randomizeStats: true,
    randomizeTypes: true,
    randomizeAbilities: false,
    randomizeEncounters: false,
    randomizeEvolvedForms: false,
  };
  current.run.playerKnowledge = {
    p1: { customTypesByPokemonId: { 81: ["fire"] } },
    p2: { customTypesByPokemonId: { 81: ["water"] } },
  };
  const randomized = opponentMember(current.run, "p1", enemy, reference);
  assert.deepEqual(randomized.types, ["fire"]);
  assert.equal(randomized.baseStats, undefined);
  assert.equal(randomized.bst, 325);
  delete current.run.playerKnowledge.p1.customTypesByPokemonId;
  assert.deepEqual(
    opponentMember(current.run, "p1", enemy, reference).types,
    [],
  );
});

test("compact notes share Pokédex knowledge without changing the other player's private notes", () => {
  const current = record(true);
  current.run.playerKnowledge = {
    p1: { pokedexNotesByPokemonId: { 1: "Existing" } },
    p2: { pokedexNotesByPokemonId: { 1: "Partner note" } },
  };
  const view = viewRunForPlayer(current.run, "p1");
  const edited = withSpeciesNotes(view, 1, "  Updated from compact  ");
  const persisted = saveKnowledgeView(edited, "p1");
  assert.equal(
    persisted.playerKnowledge?.p1.pokedexNotesByPokemonId?.[1],
    "Updated from compact",
  );
  assert.equal(
    persisted.playerKnowledge?.p2.pokedexNotesByPokemonId?.[1],
    "Partner note",
  );
  assert.equal(view.pokedexNotesByPokemonId?.[1], "Existing");
  assert.equal(
    withSpeciesNotes(edited, 1, "  ").pokedexNotesByPokemonId,
    undefined,
  );
  assert.equal(
    withoutPrivateNotes(persisted).playerKnowledge?.p1.pokedexNotesByPokemonId,
    undefined,
  );
});

test("attacker matchups keep the best STAB multiplier for the run's generation", () => {
  const offenses = getTypeOffensesForGeneration(
    ["electric", "ground"],
    "gen2-5",
  );
  assert.equal(offenses.flying, 2);
  assert.equal(offenses.water, 2);
  assert.equal(offenses.electric, 2);
  assert.equal(offenses.grass, 0.5);
  assert.equal(offenses.normal, 1);
  assert.equal("fairy" in offenses, false);
  assert.equal(getTypeOffensesForGeneration(["normal"], "gen2-5").ghost, 0);
  assert.equal(getTypeOffensesForGeneration(["ghost"], "gen2-5").steel, 0.5);
});

test("confirmed types are saved for the species and the player's captures only", () => {
  const current = record(true);
  const own = { ...capture("own", 0), customTypes: undefined };
  const other = capture("other", 1);
  current.run.playerKnowledge = { p1: {}, p2: {} };
  current.run.team = [own, other];
  const view = viewRunForPlayer(current.run, "p1");
  const next = withSpeciesTypes(view, "p1", 1, ["fire", "dragon"]);
  assert.deepEqual(next.customTypesByPokemonId, { 1: ["fire", "dragon"] });
  assert.deepEqual(next.team[0].customTypes, ["fire", "dragon"]);
  assert.equal(next.team[1].customTypes, undefined);
  assert.deepEqual(
    saveKnowledgeView(next, "p1").playerKnowledge?.p1.customTypesByPokemonId,
    { 1: ["fire", "dragon"] },
  );
});

test("manual clues are saved in the player's own knowledge only", () => {
  const current = record(true);
  current.run.playerKnowledge = {
    p1: {},
    p2: {
      pokedexObservationsByPokemonId: {
        1: [manualTypeObservation("weakness", "ice", 5)],
      },
    },
  };
  const clue = manualTypeObservation("immunity", "ground", 10);
  assert.deepEqual(clue, {
    id: "manual-10",
    type: "immunity",
    observationType: "ground",
    createdAt: 10,
  });
  assert.ok(isManualObservation(clue));
  assert.ok(!isManualObservation({ ...clue, id: "eff-1-ground-immunity" }));
  const view = viewRunForPlayer(current.run, "p1");
  const saved = saveKnowledgeView(
    withSpeciesObservations(view, 1, [clue]),
    "p1",
  ).playerKnowledge!;
  assert.deepEqual(saved.p1.pokedexObservationsByPokemonId, { 1: [clue] });
  assert.equal(
    saved.p2.pokedexObservationsByPokemonId?.[1][0].type,
    "weakness",
  );
  assert.equal(
    withSpeciesObservations(view, 1, []).pokedexObservationsByPokemonId,
    undefined,
  );
});

test("type matchups combine both types and preserve the run's generation and immunities", () => {
  const defenses = getTypeDefensesForGeneration(["rock", "ground"], "gen2-5");
  assert.equal(defenses.water, 4);
  assert.equal(defenses.grass, 4);
  assert.equal(defenses.normal, 0.5);
  assert.equal(defenses.electric, 0);
  assert.equal(getTypeDefensesForGeneration(["steel"], "gen2-5").dark, 0.5);
  assert.equal(getTypeDefensesForGeneration(["steel"], "gen6+").dark, 1);
  assert.equal(getTypeDefensesForGeneration(["psychic"], "gen1").ghost, 0);
  assert.equal(getTypeDefensesForGeneration(["psychic"], "gen2-5").ghost, 2);
  assert.equal(
    "fairy" in getTypeDefensesForGeneration(["grass"], "gen2-5"),
    false,
  );
  assert.throws(
    () => getTypeDefensesForGeneration(["fairy"], "gen1"),
    /unavailable/,
  );
});

test("custom ROM moves and abilities seen in battle keep their ROM names and data", () => {
  let current = connectRun(record(true), "p1");
  const next = frame(1);
  next.observations = [
    {
      id: "move-battle-1-461",
      encounterId: "battle-1",
      pokemonId: 48,
      kind: "move",
      value: "Pouvoir Lunaire",
      moveId: 461,
      custom: true,
      move: { type: "fairy", category: "special", power: 95, accuracy: 100 },
    },
    {
      id: "ability-battle-1-125",
      encounterId: "battle-1",
      pokemonId: 48,
      kind: "ability",
      value: "Farceur",
      abilityId: 125,
      custom: true,
    },
  ];
  current = ingestFrame(current, "p1", next, pokemon, 100);
  const seen = customSeenWords(current, "p1", 48);
  assert.equal(seen?.abilities[125], "Farceur");
  const move = gameText.move(seen!.moves[461], "fr");
  assert.equal(move.name, "Pouvoir Lunaire");
  assert.equal(move.type, "fairy");
  assert.equal(move.power, 95);
  assert.equal(gameText.move({ id: 461, pp: 10 }, "fr").name, "Danse Lune");
  // Vanilla moves seen in battle keep their localized name but use the ROM data.
  const vanilla = frame(2);
  vanilla.observations = [
    {
      id: "move-battle-2-17",
      encounterId: "battle-2",
      pokemonId: 48,
      kind: "move",
      value: "Cru-Ailes",
      moveId: 17,
      move: { type: "flying", category: "physical", power: 60, accuracy: 100 },
    },
  ];
  current = ingestFrame(current, "p1", vanilla, pokemon, 200);
  const wing = gameText.move(
    customSeenWords(current, "p1", 48)!.moves[17],
    "en",
  );
  assert.equal(wing.name, "Wing Attack");
  assert.equal(wing.power, 60);
  assert.equal(
    gameText.move({ id: 12, pp: 5, type: "normal", power: 1 }, "en").power,
    undefined,
  );
  assert.equal(customSeenWords(current, "p1", 4), undefined);
});

test("Hidden Power type and power come from the IV word", () => {
  const ivWord = (ivs: number[]) =>
    ivs.reduce((word, iv, stat) => word + iv * 2 ** (stat * 5), 0);
  assert.deepEqual(hiddenPowerFromIvs(ivWord([31, 31, 31, 31, 31, 31])), {
    type: "dark",
    power: 70,
  });
  // HP / Atk / Def / Spe / SpA / SpD: the classic Hidden Power Ice spread.
  assert.deepEqual(hiddenPowerFromIvs(ivWord([31, 30, 30, 31, 31, 31])), {
    type: "ice",
    power: 70,
  });
  assert.deepEqual(hiddenPowerFromIvs(0), { type: "fighting", power: 30 });
});

test("the SoulLink turn order reminder rotates every encountered zone", () => {
  const run = record(true).run;
  assert.equal(nextEncounterPlayer(run), undefined);
  const ordered = { ...run, soulLinkTurnOrder: true };
  const players = [...ordered.soulLinkPlayers!].sort(
    (left, right) => left.playerIndex - right.playerIndex,
  );
  const encountered = (count: number) => ({
    ...ordered,
    zones: Array.from({ length: 3 }, (_, index) => ({
      ...ordered.zones[0],
      id: `zone-${index}`,
      status: index < count ? ("captured" as const) : ("not-visited" as const),
      captures: [],
    })),
  });
  assert.equal(nextEncounterPlayer(encountered(0))?.id, players[0].id);
  assert.equal(nextEncounterPlayer(encountered(1))?.id, players[1].id);
  assert.deepEqual(
    encounterOrder(encountered(1)).map((player) => player.id),
    [...players.slice(1), players[0]].map((player) => player.id),
  );
  assert.deepEqual(encounterOrder(run), []);
  assert.equal(
    nextEncounterPlayer(encountered(players.length))?.id,
    players[0].id,
  );
});

test("the current zone reports the player's own regular and shiny captures", () => {
  const base = connectRun(record(true), "p1");
  const located = frame(1);
  located.location = { id: "route-1", name: "Route 1" };
  let current = ingestFrame(base, "p1", located, pokemon, 100);
  current = {
    ...current,
    tracking: {
      ...current.tracking,
      p1: {
        ...current.tracking.p1!,
        zoneMappings: {
          ...current.tracking.p1!.zoneMappings,
          "route-1": "route-1",
        },
      },
    },
  };
  const zoneCapture = (captures: ReturnType<typeof capture>[]) =>
    overlayData({
      ...current,
      run: {
        ...current.run,
        zones: current.run.zones.map((zone) => ({ ...zone, captures })),
      },
    }).teams.find((team) => team.playerId === "p1")?.zoneCapture;
  assert.deepEqual(zoneCapture([]), { captured: false, shiny: false });
  const own = capture("c1", 0);
  assert.deepEqual(zoneCapture([own]), { captured: true, shiny: false });
  assert.deepEqual(zoneCapture([{ ...own, playerIndex: 1 }]), {
    captured: false,
    shiny: false,
  });
  assert.deepEqual(zoneCapture([{ ...own, failedCapture: true }]), {
    captured: false,
    shiny: false,
  });
  assert.deepEqual(
    zoneCapture([{ ...own, isShiny: true, shinyChance: true }]),
    {
      captured: true,
      shiny: true,
    },
  );
});
