import { publicPath } from "@/lib/base-path";
import type { GameVersionId } from "./game-catalog";
import platinumMaps from "../../public/data/platinum-maps.json";
import platinumEncounterAreas from "../../public/data/platinum-encounter-areas.json";

export interface ZoneTemplate {
  id: string;
  zoneNames?: {
    fr?: string;
    en?: string;
  };
  regionArea: string;
}

export interface LocationArea {
  id: number;
  name: string;
  names?: {
    fr?: string;
    en?: string;
  };
}

export interface Location {
  id: number;
  name: string;
  names?: {
    fr?: string;
    en?: string;
  };
  areas?: LocationArea[];
}

export interface Region {
  id: string;
  name: string;
  names?: {
    fr?: string;
    en?: string;
  };
  locations?: Location[];
}

export const regionZones: Record<string, ZoneTemplate[]> = {};

export const regions = [];

let cachedRegions: Region[] | null = null;

export const STARTER_ZONE_ID = "starter";

// The starter gift is a Nuzlocke encounter of its own and is not a PokeAPI location.
const STARTER_ZONE: ZoneTemplate = {
  id: STARTER_ZONE_ID,
  zoneNames: { fr: "Starter", en: "Starter" },
  regionArea: "",
};

/** Build human readable names from a technical slug (e.g. "lake-verity-area" -> "lake verity area") */
function namesFromSlug(
  slug: string,
  names?: { fr?: string; en?: string },
): { fr: string; en: string } {
  const fallback = slug.split("-").join(" ");
  return {
    fr: names?.fr || names?.en || fallback,
    en: names?.en || names?.fr || fallback,
  };
}

/**
 * Flatten a region's locations into zone templates.
 * - Locations with translated areas produce one zone per translated area.
 * - Locations without areas (frequent in PokeAPI for Sinnoh, Unova, Kalos, Paldea…)
 *   or whose areas have no translation produce a single zone for the location itself.
 */
function buildZoneTemplates(region: Region): ZoneTemplate[] {
  const zones: ZoneTemplate[] = region.id === "custom" ? [] : [STARTER_ZONE];

  region.locations?.forEach((loc) => {
    const locationLabel = loc.names?.en || loc.name;

    const areasWithTranslations = (loc.areas ?? []).filter(
      (area) => area.names?.fr || area.names?.en,
    );

    if (areasWithTranslations.length === 0) {
      zones.push({
        id: loc.name,
        zoneNames: namesFromSlug(loc.name, loc.names),
        regionArea: "",
      });
      return;
    }

    areasWithTranslations.forEach((area) => {
      zones.push({
        id: area.name,
        zoneNames: namesFromSlug(area.name, area.names),
        regionArea: locationLabel,
      });
    });
  });

  return zones;
}

export async function loadRegions(): Promise<Region[]> {
  if (cachedRegions) return cachedRegions;

  try {
    const response = await fetch(publicPath("/data/regions.json"));
    const data = await response.json();

    // Map JSON regions to our Region interface
    const mappedRegions: Region[] = data.regions.map((r: Region) => ({
      id: r.name, // Use the name as id (e.g., "kanto")
      name: r.name.charAt(0).toUpperCase() + r.name.slice(1), // Capitalize first letter
      names: r.names,
      locations:
        r.locations?.map((loc: Location) => ({
          id: loc.id,
          name: loc.name,
          names: loc.names,
          areas: loc.areas || [],
        })) || [],
    }));

    // Add custom region at the end
    const customRegion: Region = {
      id: "custom",
      name: "Custom",
      names: {
        fr: "Personnalisée",
        en: "Custom",
      },
      locations: [],
    };
    mappedRegions.push(customRegion);

    // Populate regionZones from the loaded regions: flatten location-areas as zones
    mappedRegions.forEach((region) => {
      if (region.locations && !regionZones[region.id]) {
        regionZones[region.id] = buildZoneTemplates(region);
      }
    });

    cachedRegions = mappedRegions;

    return mappedRegions;
  } catch (error) {
    console.error("Failed to load regions:", error);
    return regions; // Fallback to hardcoded regions
  }
}

// Initialize regions on module load (important for SSR/hydration)
if (typeof window !== "undefined") {
  loadRegions().catch((err) =>
    console.error("Failed to initialize regions:", err),
  );
}

export async function getZonesForRegionAsync(
  region: string,
  gameVersion?: GameVersionId,
): Promise<ZoneTemplate[]> {
  // Special case: custom region starts with no zones
  if (region === "custom") {
    if (!regionZones["custom"]) {
      regionZones["custom"] = [];
    }
    return regionZones["custom"];
  }

  // Always load regions to ensure translations are available.
  const loadedRegions = await loadRegions();
  const foundRegion = loadedRegions.find((r) => r.id === region);

  if (!foundRegion || !foundRegion.locations) {
    return []; // Fallback to empty array
  }

  // Flatten location-areas as zones
  const templatesFromJson = buildZoneTemplates(foundRegion);

  const existing = regionZones[region];
  if (!existing) {
    regionZones[region] = templatesFromJson;
    return zonesForGame(templatesFromJson, gameVersion);
  }

  // Merge existing runtime zones with JSON translations by id.
  const namesById = new Map(templatesFromJson.map((z) => [z.id, z.zoneNames]));
  const enrichedExisting = existing.map((z) => ({
    ...z,
    zoneNames: z.zoneNames ?? namesById.get(z.id),
  }));

  regionZones[region] = enrichedExisting;
  return zonesForGame(enrichedExisting, gameVersion);
}

export function getZonesForRegion(
  region: string,
  gameVersion?: GameVersionId,
): ZoneTemplate[] {
  return zonesForGame(regionZones[region] ?? [], gameVersion);
}

const encounterAreas = new Set<string>(platinumEncounterAreas);

const mapSlugs = platinumMaps.map((name) =>
  name.toLowerCase().replaceAll(" ", "-"),
);

function zoneSlug(zoneId: string): string {
  return zoneId.replace(/^sinnoh-/, "").replace(/-area(?=-|$)/g, "");
}

/**
 * Find the encounter zone of an in-game map from its name
 * (e.g. "Route 201" -> "sinnoh-route-201-area", "Mt Coronet 2F" -> "mt-coronet-2f").
 * Returns "ambiguous" when several zones fit equally (e.g. Lake Verity before/after Galactic).
 */
export function zoneIdForMapName(
  zones: { id: string }[],
  mapName: string,
): string | "ambiguous" | undefined {
  const map = mapName.toLowerCase().replaceAll(" ", "-");
  const candidates = zones.filter((zone) => zone.id !== STARTER_ZONE_ID);
  const pick = (matches: { id: string }[]) =>
    matches.length === 1
      ? matches[0].id
      : matches.length
        ? "ambiguous"
        : undefined;
  const exact = candidates.filter((zone) => zoneSlug(zone.id) === map);
  if (exact.length) return pick(exact);
  // The map is a part of a zone, e.g. "Eterna Forest Outside" in "eterna-forest".
  const containing = candidates.filter((zone) =>
    map.startsWith(`${zoneSlug(zone.id)}-`),
  );
  if (containing.length) {
    const longest = Math.max(
      ...containing.map((zone) => zoneSlug(zone.id).length),
    );
    return pick(
      containing.filter((zone) => zoneSlug(zone.id).length === longest),
    );
  }
  // The map has several zones, e.g. "Lake Verity" before/after Galactic intervention.
  return pick(
    candidates.filter((zone) => zoneSlug(zone.id).startsWith(`${map}-`)),
  );
}
export function zonesForGame(
  zones: ZoneTemplate[],
  gameVersion?: GameVersionId,
): ZoneTemplate[] {
  if (gameVersion !== "platinum") return zones;
  return zones.filter((zone) => {
    if (zone.id === STARTER_ZONE_ID || encounterAreas.has(zone.id)) return true;
    const slug = zoneSlug(zone.id);
    // Maps and zones may each be the finer one: "Route 204 South" and
    // "route-204-south-towards-jubilife-city", or "Eterna Forest Outside" and "eterna-forest".
    return mapSlugs.some(
      (map) =>
        map === slug ||
        map.startsWith(`${slug}-`) ||
        slug.startsWith(`${map}-`),
    );
  });
}

export function getZoneDisplayName(
  zone: { zoneNames?: { fr?: string; en?: string } },
  lang: "fr" | "en",
): string {
  return zone.zoneNames?.[lang] ?? zone.zoneNames?.en ?? "";
}
