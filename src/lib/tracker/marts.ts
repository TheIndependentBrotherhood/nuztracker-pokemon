import { MART_IDS, type MartId } from "../games/platinum/marts";
import { matchesSearch } from "../search";
import type { VisitedMart } from "./types";

// Latest visit of each shop for one game, in route order.
export function latestVisitedMarts(
  visited: VisitedMart[] | undefined,
  gameKey: string,
): VisitedMart[] {
  const latest = new Map<MartId, VisitedMart>();
  for (const entry of visited ?? [])
    if (
      entry.gameKey === gameKey &&
      (latest.get(entry.id)?.visitedAt ?? -1) <= entry.visitedAt
    )
      latest.set(entry.id, entry);
  return MART_IDS.flatMap((id) => latest.get(id) ?? []);
}

export interface MartItemRow {
  itemId: number;
  name: string;
  marts: MartId[];
}

// Items sold in the selected shops, merged across shops and filtered by name.
export function martItemRows(
  marts: VisitedMart[],
  city: MartId | "all",
  query: string,
  itemName: (itemId: number) => string,
): MartItemRow[] {
  const rows = new Map<number, MartItemRow>();
  for (const mart of marts) {
    if (city !== "all" && mart.id !== city) continue;
    for (const itemId of mart.items) {
      const row = rows.get(itemId) ?? {
        itemId,
        name: itemName(itemId),
        marts: [],
      };
      if (!row.marts.includes(mart.id)) row.marts.push(mart.id);
      rows.set(itemId, row);
    }
  }
  return [...rows.values()].filter((row) => matchesSearch(query, row.name));
}
