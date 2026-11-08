import { test } from "node:test";
import assert from "node:assert/strict";
import { GameText } from "../src/lib/game-text";
import { hpColor } from "../src/lib/tracker/hp";
import { overlayData } from "../src/lib/tracker/overlay";
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
