import { test } from "node:test";
import assert from "node:assert/strict";
import { GameText } from "../src/lib/game-text";
import { hpColor } from "../src/lib/tracker/hp";
import {
  lightFocusMember,
  opponentMember,
  overlayData,
} from "../src/lib/tracker/overlay";
import {
  saveKnowledgeView,
  viewRunForPlayer,
  withSpeciesNotes,
  withSpeciesTypes,
  withoutPrivateNotes,
} from "../src/lib/tracker/knowledge";
import {
  getTypeDefensesForGeneration,
  getTypeOffensesForGeneration,
} from "../src/lib/type-chart";
import { ingestFrame } from "../src/lib/tracker/live";
import type { LivePokemon } from "../src/lib/tracker/types";
import gameTextData from "../public/data/game-text.json";
import { capture, frame, pokemon, record } from "./fixtures";

const gameText = new GameText(
  gameTextData as unknown as ConstructorParameters<typeof GameText>[0],
);

function livePokemon(overrides: Partial<LivePokemon> = {}): LivePokemon {
  return { ...frame().party[0], ...overrides };
}

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
