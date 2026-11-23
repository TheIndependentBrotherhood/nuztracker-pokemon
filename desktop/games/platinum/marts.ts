import {
  PLATINUM_SPECIALTY_MARTS,
  type MartId,
} from "../../../src/lib/games/platinum/marts";
import type { NdsRom } from "../../formats/nds/rom";

const MART_COUNT = 29;
const SHOP_OVERLAY_ID = 7;
const MAX_STOCK = 40;
const MAX_ITEM_ID = 600;
// Vanilla stocks that identify the Poké Mart pointer table in the ARM9.
const MART_ANCHORS = new Map<number, number[]>([
  [13, [36, 34, 35, 37]],
  [17, [17, 26, 25, 24, 28, 18, 22, 19, 20, 21, 27]],
  [19, Array.from({ length: 18 }, (_, index) => 470 + index)],
  [28, [159, 160, 161, 162, 163]],
]);
// Evolution stones the randomizer places at specialty clerks (rom_extras.STONES).
const EVOLUTION_STONES = new Set([80, 81, 82, 83, 84, 85, 107, 108, 109, 490]);

export type MartStocks = Map<MartId, number[]>;

function readItemList(data: Buffer, offset: number): number[] | undefined {
  const items: number[] = [];
  for (let cursor = offset; cursor + 2 <= data.length; cursor += 2) {
    const item = data.readUInt16LE(cursor);
    if (item === 0xffff) return items.length ? items : undefined;
    if (items.length === MAX_STOCK || item < 1 || item >= MAX_ITEM_ID)
      return undefined;
    items.push(item);
  }
  return undefined;
}

function sameItems(left: number[], right: number[]): boolean {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

// Locates the 29 Poké Mart stock pointers like the randomizer does; expanded stocks live in the shop overlay.
export function findMartStocks(
  arm9: Buffer,
  arm9Ram: number,
  overlay?: { ram: number; data: Buffer },
): number[][] {
  const anchorIndex = 13;
  const anchorItems = [...MART_ANCHORS.get(anchorIndex)!, 0xffff];
  const anchor = Buffer.alloc(anchorItems.length * 2);
  anchorItems.forEach((item, index) => anchor.writeUInt16LE(item, index * 2));
  const listAt = (address: number): number[] | undefined => {
    if (address & 1) return undefined;
    if (address >= arm9Ram && address < arm9Ram + arm9.length)
      return readItemList(arm9, address - arm9Ram);
    if (
      overlay &&
      address >= overlay.ram &&
      address < overlay.ram + overlay.data.length
    )
      return readItemList(overlay.data, address - overlay.ram);
    return undefined;
  };
  const candidates: number[][][] = [];
  for (
    let stock = arm9.indexOf(anchor);
    stock >= 0;
    stock = arm9.indexOf(anchor, stock + 1)
  ) {
    const pointer = Buffer.alloc(4);
    pointer.writeUInt32LE(arm9Ram + stock);
    for (
      let reference = arm9.indexOf(pointer);
      reference >= 0;
      reference = arm9.indexOf(pointer, reference + 1)
    ) {
      const start = reference - anchorIndex * 4;
      if (start < 0 || start % 4 || start + MART_COUNT * 4 > arm9.length)
        continue;
      const lists: number[][] = [];
      for (let index = 0; index < MART_COUNT; index++) {
        const list = listAt(arm9.readUInt32LE(start + index * 4));
        const expected = MART_ANCHORS.get(index);
        if (!list || (expected && !sameItems(list, expected))) break;
        lists.push(list);
      }
      if (lists.length === MART_COUNT) candidates.push(lists);
    }
  }
  if (candidates.length !== 1)
    throw new Error(
      `Expected one supported Poké Mart stock table, found ${candidates.length}.`,
    );
  return candidates[0];
}

// The randomizer guarantees an evolution stone at every specialty clerk; vanilla Platinum sells none there.
export function specialtyStocks(lists: number[][]): MartStocks | undefined {
  const stocks: MartStocks = new Map(
    PLATINUM_SPECIALTY_MARTS.map(({ id, tableIndex }) => [
      id,
      lists[tableIndex],
    ]),
  );
  return [...stocks.values()].every((items) =>
    items.some((item) => EVOLUTION_STONES.has(item)),
  )
    ? stocks
    : undefined;
}

export async function loadPlatinumMarts(
  rom: Pick<NdsRom, "arm9" | "arm9Ram" | "overlay">,
): Promise<MartStocks | undefined> {
  const [arm9, overlay] = await Promise.all([
    rom.arm9(),
    rom.overlay(SHOP_OVERLAY_ID),
  ]);
  return specialtyStocks(findMartStocks(arm9, rom.arm9Ram, overlay));
}
