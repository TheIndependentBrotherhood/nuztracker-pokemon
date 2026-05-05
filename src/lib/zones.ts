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

export async function loadRegions(): Promise<Region[]> {
  if (cachedRegions) return cachedRegions;

  try {
    const response = await fetch("/data/regions.json");
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
        })) || [],
    }));

    // Populate regionZones from the loaded regions: flatten location-areas as zones
    mappedRegions.forEach((region) => {
      if (region.locations && !regionZones[region.id]) {
        const zones: ZoneTemplate[] = [];
        region.locations.forEach((loc) => {
          const locationLabel = loc.names?.en || loc.name;
          if (loc.areas && loc.areas.length > 0) {
            // Filter areas that have both fr and en names
            const validAreas = loc.areas.filter(
              (area) => area.names?.fr && area.names?.en,
            );

            if (validAreas.length > 0) {
              // Use valid areas
              validAreas.forEach((area) => {
                zones.push({
                  id: area.name,
                  zoneNames: area.names,
                  regionArea: locationLabel,
                });
              });
            } else {
              // No valid areas, fallback to location
              zones.push({
                id: loc.name,
                zoneNames: loc.names,
                regionArea: "",
              });
            }
          } else {
            // Fallback: no areas, use the location itself
            zones.push({
              id: loc.name,
              zoneNames: loc.names,
              regionArea: "",
            });
          }
        });
        regionZones[region.id] = zones;
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
  // Always load regions to ensure translations are available.
  const loadedRegions = await loadRegions();
  const foundRegion = loadedRegions.find((r) => r.id === region);

  if (!foundRegion || !foundRegion.locations) {
    return []; // Fallback to empty array
  }

  // Flatten location-areas as zones
  const templatesFromJson: ZoneTemplate[] = [];
  foundRegion.locations.forEach((loc) => {
    const locationLabel = loc.names?.en || loc.name;
    if (loc.areas && loc.areas.length > 0) {
      // Filter areas that have both fr and en names
      const validAreas = loc.areas.filter(
        (area) => area.names?.fr && area.names?.en,
      );

      if (validAreas.length > 0) {
        // Use valid areas
        validAreas.forEach((area) => {
          templatesFromJson.push({
            id: area.name,
            zoneNames: area.names,
            regionArea: locationLabel,
          });
        });
      } else {
        // No valid areas, fallback to location
        templatesFromJson.push({
          id: loc.name,
          zoneNames: loc.names,
          regionArea: "",
        });
      }
    } else {
      templatesFromJson.push({
        id: loc.name,
        zoneNames: loc.names,
        regionArea: "",
      });
    }
  });

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
