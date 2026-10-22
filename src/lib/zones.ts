import { publicPath } from "@/lib/base-path";

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
  const zones: ZoneTemplate[] = [];

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
    return templatesFromJson;
  }

  // Merge existing runtime zones with JSON translations by id.
  const namesById = new Map(templatesFromJson.map((z) => [z.id, z.zoneNames]));
  const enrichedExisting = existing.map((z) => ({
    ...z,
    zoneNames: z.zoneNames ?? namesById.get(z.id),
  }));

  regionZones[region] = enrichedExisting;
  return enrichedExisting;
}

export function getZonesForRegion(region: string): ZoneTemplate[] {
  return regionZones[region] ?? [];
}

export function getZoneDisplayName(
  zone: { zoneNames?: { fr?: string; en?: string } },
  lang: "fr" | "en",
): string {
  return zone.zoneNames?.[lang] ?? zone.zoneNames?.en ?? "";
}
