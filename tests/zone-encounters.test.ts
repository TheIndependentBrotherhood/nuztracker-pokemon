import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findMapHeaders,
  parseEncounterTable,
} from "../desktop/platinum-encounters";
import { ingestFrame } from "../src/lib/tracker/live";
import { overlayData } from "../src/lib/tracker/overlay";
import { gameFrameSchema } from "../src/lib/tracker/schema";
import type { GameFrame } from "../src/lib/tracker/types";
import { frame, pokemon, record } from "./fixtures";

function table(): Buffer {
  const data = Buffer.alloc(0x1a8);
  data.writeUInt32LE(30, 0);
  for (let slot = 0; slot < 12; slot++) {
    data.writeInt8(3, 4 + slot * 8);
    data.writeUInt32LE(slot < 2 ? 396 : 399, 8 + slot * 8);
  }
  // Day keeps the morning species, night replaces slot 2; slot 3 never changes.
  data.writeUInt32LE(399, 0x6c);
  data.writeUInt32LE(399, 0x70);
  data.writeUInt32LE(401, 0x74);
  data.writeUInt32LE(399, 0x78);
  data.writeUInt32LE(84, 0x64);
  data.writeUInt32LE(396, 0x68);
  data.writeUInt32LE(10, 0xcc);
  for (let slot = 0; slot < 5; slot++) {
    data.writeInt8(30, 0xd0 + slot * 8);
    data.writeInt8(20, 0xd1 + slot * 8);
    data.writeUInt32LE(slot ? 55 : 54, 0xd4 + slot * 8);
  }
  data.writeUInt32LE(25, 0x150);
  for (let slot = 0; slot < 5; slot++) {
    data.writeInt8(25, 0x154 + slot * 8);
    data.writeInt8(10, 0x155 + slot * 8);
    data.writeUInt32LE(129, 0x158 + slot * 8);
  }
  return data;
}

test("a Platinum wild table lists each species once per method and condition with its chance", () => {
  const entries = parseEncounterTable(table());
  const find = (method: string, pokemonId: number, condition?: string) =>
    entries.find(
      (entry) =>
        entry.method === method &&
        entry.pokemonId === pokemonId &&
        entry.condition === condition,
    );
  assert.equal(find("grass", 396)?.rate, 40);
  // Slot 3 is the same all day: it merges into the unconditional total.
  assert.equal(find("grass", 399)?.rate, 50);
  assert.equal(find("grass", 399, "morning")?.rate, 10);
  assert.equal(find("grass", 399, "day")?.rate, 10);
  assert.equal(find("grass", 401, "night")?.rate, 10);
  // Swarm, Poké Radar and GBA replacements are not listed.
  assert.equal(
    entries.some((entry) => entry.pokemonId === 84),
    false,
  );
  assert.deepEqual(find("surf", 54), {
    method: "surf",
    pokemonId: 54,
    rate: 60,
    minLevel: 20,
    maxLevel: 30,
  });
  assert.equal(find("surf", 55)?.rate, 40);
  assert.equal(find("good-rod", 129)?.rate, 100);
  assert.equal(
    entries.some((entry) => entry.method === "old-rod"),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.method === "super-rod"),
    false,
  );
});

test("the map header table is found by its shape", () => {
  const arm9 = Buffer.alloc(32 + 24 * 520 + 24, 0xff);
  for (let map = 0; map < 520; map++) {
    const entry = 32 + map * 24;
    arm9.writeUInt16LE(0, entry + 4);
    arm9.writeUInt16LE(0, entry + 16);
    arm9[entry + 20] = 0;
    arm9.writeUInt16LE(map % 7 ? 0xffff : map % 100, entry + 14);
  }
  assert.deepEqual(
    findMapHeaders(arm9, { scripts: 10, events: 10, encounters: 100 }),
    { offset: 32, count: 520 },
  );
});

test("zone encounters only name species met in a wild battle on this map or caught in the zone", () => {
  const route: GameFrame = {
    ...frame(),
    location: {
      id: "platinum-342",
      name: "Route 201",
      encounters: [
        {
          method: "grass",
          pokemonId: 396,
          rate: 40,
          minLevel: 2,
          maxLevel: 3,
        },
        {
          method: "grass",
          condition: "night",
          pokemonId: 401,
          rate: 10,
          minLevel: 3,
          maxLevel: 3,
        },
        {
          method: "old-rod",
          pokemonId: 129,
          rate: 100,
          minLevel: 3,
          maxLevel: 15,
        },
      ],
    },
  };
  assert.equal(gameFrameSchema.safeParse(route).success, true);
  const wild = (id: string, pokemonId: number, locationId: string) => ({
    ...route,
    location: { ...route.location!, id: locationId },
    battle: {
      id,
      kind: "wild" as const,
      opponents: [{ identity: id, pokemonId, level: 3 }],
    },
  });
  // Meeting a species elsewhere, even on a map with the same table, does not reveal it here.
  let current = ingestFrame(
    record(),
    "solo",
    { ...wild("wild-1", 396, "platinum-343"), sequence: 2, frame: 20 },
    pokemon,
    100,
  );
  current = ingestFrame(
    current,
    "solo",
    { ...wild("wild-2", 401, "platinum-342"), sequence: 3, frame: 30 },
    pokemon,
    101,
  );
  current = ingestFrame(
    current,
    "solo",
    { ...route, sequence: 4, frame: 40 },
    pokemon,
    102,
  );
  const zone = overlayData(current).teams[0].zoneEncounters;
  assert.equal(zone?.seen, 1);
  assert.equal(zone?.total, 3);
  assert.deepEqual(
    zone?.entries.map((entry) => entry.pokemonId),
    [undefined, 401, undefined],
  );
  assert.equal(zone?.entries[2].method, "old-rod");
});
