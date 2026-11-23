import platinumMaps from "../../../../public/data/platinum-maps.json";
import platinumEncounterAreas from "../../../../public/data/platinum-encounter-areas.json";

const encounterAreas = new Set<string>(platinumEncounterAreas);

const mapSlugs = platinumMaps.map((name) =>
  name.toLowerCase().replaceAll(" ", "-"),
);

/** Whether a Sinnoh zone exists in Platinum, excluding remake-only areas. */
export function isPlatinumZone(zoneId: string, slug: string): boolean {
  if (encounterAreas.has(zoneId)) return true;
  // Maps and zones may each be the finer one: "Route 204 South" and
  // "route-204-south-towards-jubilife-city", or "Eterna Forest Outside" and "eterna-forest".
  return mapSlugs.some(
    (map) =>
      map === slug || map.startsWith(`${slug}-`) || slug.startsWith(`${map}-`),
  );
}
