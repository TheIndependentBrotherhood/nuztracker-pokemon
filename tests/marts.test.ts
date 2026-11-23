import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findMartStocks,
  specialtyStocks,
} from "../desktop/games/platinum/marts";
import { ingestFrame } from "../src/lib/tracker/live";
import { latestVisitedMarts, martItemRows } from "../src/lib/tracker/marts";
import { gameKey } from "../src/lib/tracker/shared-rom";
import { matchesSearch } from "../src/lib/search";
import { frame, pokemon, record } from "./fixtures";

const ARM9_RAM = 0x02000000;
const OVERLAY_RAM = 0x0226aa80;
const ANCHORS = new Map<number, number[]>([
  [13, [36, 34, 35, 37]],
  [17, [17, 26, 25, 24, 28, 18, 22, 19, 20, 21, 27]],
  [19, Array.from({ length: 18 }, (_, index) => 470 + index)],
  [28, [159, 160, 161, 162, 163]],
]);

function items(list: number[]): Buffer {
  const data = Buffer.alloc((list.length + 1) * 2);
  list.forEach((item, index) => data.writeUInt16LE(item, index * 2));
  data.writeUInt16LE(0xffff, list.length * 2);
  return data;
}

// A pointer table of 29 marts; the Jubilife specialty stock lives in the expanded shop overlay.
function martRom(stock: (index: number) => number[]) {
  const lists: Buffer[] = [];
  const pointers = Buffer.alloc(29 * 4);
  let cursor = 0x100 + pointers.length;
  const overlay = Buffer.concat([Buffer.alloc(8), items(stock(9))]);
  for (let index = 0; index < 29; index++) {
    if (index === 9) {
      pointers.writeUInt32LE(OVERLAY_RAM + 8, index * 4);
      continue;
    }
    const list = items(ANCHORS.get(index) ?? stock(index));
    pointers.writeUInt32LE(ARM9_RAM + cursor, index * 4);
    lists.push(list);
    cursor += list.length;
  }
  const arm9 = Buffer.concat([Buffer.alloc(0x100), pointers, ...lists]);
  return { arm9, overlay: { ram: OVERLAY_RAM, data: overlay } };
}

test("specialty shop stocks are read from the ARM9 table and the shop overlay", () => {
  const { arm9, overlay } = martRom((index) => [index + 1, 82]);
  const lists = findMartStocks(arm9, ARM9_RAM, overlay);
  assert.deepEqual(lists[9], [10, 82]);
  assert.deepEqual(lists[27], [28, 82]);
  const stocks = specialtyStocks(lists);
  assert.deepEqual(stocks?.get("jubilife"), [10, 82]);
  assert.deepEqual(stocks?.get("pokemonLeague"), [28, 82]);
  // Without an evolution stone at every specialty clerk, the shops are vanilla.
  const vanilla = martRom((index) => [index + 1]);
  assert.equal(
    specialtyStocks(findMartStocks(vanilla.arm9, ARM9_RAM, vanilla.overlay)),
    undefined,
  );
});

test("entering a shop records its stock once per game", () => {
  const inShop = {
    ...frame(2),
    randomizedMarts: true,
    location: {
      id: "platinum-4",
      name: "Jubilife City Mart",
      mart: { id: "jubilife" as const, items: [17, 82] },
    },
  };
  let current = ingestFrame(record(), "solo", inShop, pokemon, 100);
  current = ingestFrame(
    current,
    "solo",
    { ...inShop, sequence: 3, frame: 30 },
    pokemon,
    101,
  );
  current = ingestFrame(
    current,
    "solo",
    { ...frame(4), frame: 40 },
    pokemon,
    102,
  );
  const tracking = current.tracking.solo;
  assert.equal(tracking.visitedMarts?.length, 1);
  assert.deepEqual(
    latestVisitedMarts(tracking.visitedMarts, gameKey(tracking.game)).map(
      (mart) => [mart.id, mart.items, mart.visitedAt],
    ),
    [["jubilife", [17, 82], 100]],
  );
});

test("shop items merge across cities and match searches without accents", () => {
  const names: Record<number, string> = {
    17: "Potion",
    82: "Pierre Feu",
    26: "Super Potion",
    83: "Pierre Éclat",
  };
  const marts = [
    { id: "jubilife" as const, gameKey: "g", items: [17, 82], visitedAt: 1 },
    {
      id: "oreburgh" as const,
      gameKey: "g",
      items: [26, 82, 83],
      visitedAt: 2,
    },
  ];
  const rows = martItemRows(marts, "all", "", (id) => names[id]);
  assert.deepEqual(
    rows.map((row) => [row.itemId, row.marts]),
    [
      [17, ["jubilife"]],
      [82, ["jubilife", "oreburgh"]],
      [26, ["oreburgh"]],
      [83, ["oreburgh"]],
    ],
  );
  assert.deepEqual(
    martItemRows(marts, "all", "eclat", (id) => names[id]).map(
      (row) => row.itemId,
    ),
    [83],
  );
  assert.deepEqual(
    martItemRows(marts, "jubilife", "POTION", (id) => names[id]).map(
      (row) => row.itemId,
    ),
    [17],
  );
  assert.ok(matchesSearch("evoli", "Évoli"));
  assert.ok(matchesSearch("  ", "anything"));
  assert.ok(!matchesSearch("pikachu", "Évoli", undefined));
});
