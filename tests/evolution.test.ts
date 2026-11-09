import { test } from "node:test";
import assert from "node:assert/strict";
import { evolutionSummary } from "../src/lib/tracker/evolution";

const species = (id: number) =>
  ({ 2: "Ivysaur", 26: "Raichu", 186: "Politoed", 62: "Poliwrath" })[id];

test("level evolutions show the level and turn ready once reached", () => {
  const evolutions = [{ method: 4, param: 16, target: 2 }];
  assert.deepEqual(evolutionSummary(evolutions, 12, 4, "en", { species }), {
    label: "16",
    ready: false,
    details: ["Level 16 → Ivysaur"],
  });
  assert.equal(evolutionSummary(evolutions, 16, 4, "en")?.ready, true);
});

test("species without evolution show nothing", () => {
  assert.equal(evolutionSummary([], 50, 4, "en"), undefined);
  assert.equal(evolutionSummary(undefined, 50, 4, "en"), undefined);
});

test("items use Ironmon abbreviations per generation and language", () => {
  const stone = (id: number) => [{ method: 7, param: id, target: 26 }];
  assert.equal(evolutionSummary(stone(83), 5, 4, "en")?.label, "THUNDR");
  assert.equal(evolutionSummary(stone(96), 5, 3, "en")?.label, "THUNDR");
  assert.equal(evolutionSummary(stone(83), 5, 4, "fr")?.label, "FOUDRE");
  assert.equal(
    evolutionSummary(stone(83), 5, 4, "fr", {
      item: () => "Pierre Foudre",
      species,
    })?.details[0],
    "Utiliser Pierre Foudre → Raichu",
  );
});

test("two evolutions are joined, with short forms when too long", () => {
  const poliwhirl = [
    { method: 7, param: 84, target: 62 },
    { method: 6, param: 221, target: 186 },
  ];
  assert.equal(evolutionSummary(poliwhirl, 30, 4, "en")?.label, "WTR/RCK");
  const gloom = [
    { method: 7, param: 85, target: 45 },
    { method: 7, param: 80, target: 182 },
  ];
  assert.equal(evolutionSummary(gloom, 30, 4, "en")?.label, "LEAF/SUN");
  const kirlia = [
    { method: 4, param: 30, target: 282 },
    { method: 16, param: 109, target: 475 },
  ];
  assert.equal(evolutionSummary(kirlia, 20, 4, "en")?.label, "30/DAWN");
});

test("gendered levels merge and many branches become various", () => {
  const burmy = [
    { method: 23, param: 20, target: 413 },
    { method: 22, param: 20, target: 414 },
  ];
  assert.equal(evolutionSummary(burmy, 10, 4, "en")?.label, "20 M/F");
  const wurmple = [
    { method: 11, param: 7, target: 266 },
    { method: 12, param: 7, target: 268 },
  ];
  assert.equal(evolutionSummary(wurmple, 7, 3, "en")?.label, "7");
  const eevee = [
    { method: 7, param: 83, target: 135 },
    { method: 7, param: 84, target: 134 },
    { method: 7, param: 82, target: 136 },
    { method: 2, param: 0, target: 196 },
  ];
  assert.equal(evolutionSummary(eevee, 5, 4, "fr")?.label, "DIVERS");
});
