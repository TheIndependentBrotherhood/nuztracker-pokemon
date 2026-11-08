import { z } from "zod";
import { publicPath } from "./base-path";
import type { GameVersionId } from "./game-catalog";

const entrySchema = z.object({
  pokemonId: z.number().int().positive(),
  version: z.string(), method: z.string(),
  minLevel: z.number().int().nonnegative(),
  maxLevel: z.number().int().nonnegative(),
  conditions: z.array(z.string()), chance: z.number().min(0).max(100),
});
const referencesSchema = z.object({
  sources: z.array(z.string()),
  areas: z.array(z.object({
    game: z.string(), locationId: z.string(), areaId: z.string(),
    name: z.string(), area: z.string(), entries: z.array(entrySchema),
  })),
});
export type EncounterArea = z.infer<typeof referencesSchema>["areas"][number];
let references: Promise<z.infer<typeof referencesSchema>> | undefined;

export function loadEncounterReferences() {
  references ??= fetch(publicPath("/data/game-encounters.json")).then(async (response) => {
    if (!response.ok) throw new Error("Original encounter reference data could not be loaded.");
    return referencesSchema.parse(await response.json());
  }).catch((error) => { references = undefined; throw error; });
  return references;
}

export function encounterAreasForZone(
  areas: EncounterArea[],
  game: GameVersionId | undefined,
  zone: { id: string; zoneNames?: { en?: string }; zoneName: string },
): EncounterArea[] {
  if (!game) return [];
  const exact = areas.filter((area) => area.game === game && (area.areaId === zone.id || area.locationId === zone.id));
  if (exact.length) return exact;
  const name = (zone.zoneNames?.en ?? zone.zoneName).trim().toLowerCase();
  return areas.filter((area) => area.game === game && area.name.toLowerCase() === name);
}
