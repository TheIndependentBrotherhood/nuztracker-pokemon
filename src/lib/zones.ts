export interface ZoneTemplate {
  id: string;
  zoneName: string;
  regionArea: string;
}

export interface Location {
  id: number;
  name: string;
  names?: {
    fr?: string;
    en?: string;
  };
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

export const kantoZones: ZoneTemplate[] = [
  { id: "pallet-town", zoneName: "Pallet Town", regionArea: "South" },
  { id: "route-1", zoneName: "Route 1", regionArea: "South" },
  { id: "viridian-city", zoneName: "Viridian City", regionArea: "South" },
  { id: "route-2", zoneName: "Route 2", regionArea: "South" },
  { id: "pewter-city", zoneName: "Pewter City", regionArea: "West" },
  { id: "route-3", zoneName: "Route 3", regionArea: "West" },
  { id: "mt-moon", zoneName: "Mt. Moon", regionArea: "West" },
  { id: "route-4", zoneName: "Route 4", regionArea: "West" },
  { id: "cerulean-city", zoneName: "Cerulean City", regionArea: "North" },
  { id: "route-5", zoneName: "Route 5", regionArea: "Central" },
  { id: "route-6", zoneName: "Route 6", regionArea: "Central" },
  { id: "vermilion-city", zoneName: "Vermilion City", regionArea: "South" },
  { id: "route-7", zoneName: "Route 7", regionArea: "Central" },
  { id: "celadon-city", zoneName: "Celadon City", regionArea: "Central" },
  { id: "route-8", zoneName: "Route 8", regionArea: "Central" },
  { id: "lavender-town", zoneName: "Lavender Town", regionArea: "East" },
  { id: "route-9", zoneName: "Route 9", regionArea: "East" },
  { id: "route-10", zoneName: "Route 10", regionArea: "East" },
  { id: "route-11", zoneName: "Route 11", regionArea: "East" },
  { id: "route-12", zoneName: "Route 12", regionArea: "East" },
  { id: "fuchsia-city", zoneName: "Fuchsia City", regionArea: "South" },
  { id: "route-13", zoneName: "Route 13", regionArea: "South" },
  { id: "route-14", zoneName: "Route 14", regionArea: "South" },
  { id: "route-15", zoneName: "Route 15", regionArea: "South" },
  { id: "route-16", zoneName: "Route 16", regionArea: "West" },
  { id: "route-17", zoneName: "Route 17", regionArea: "West" },
  { id: "route-18", zoneName: "Route 18", regionArea: "West" },
  { id: "saffron-city", zoneName: "Saffron City", regionArea: "Central" },
  { id: "route-19", zoneName: "Route 19", regionArea: "South" },
  { id: "route-20", zoneName: "Route 20", regionArea: "South" },
  { id: "cinnabar-island", zoneName: "Cinnabar Island", regionArea: "South" },
  { id: "route-21", zoneName: "Route 21", regionArea: "South" },
  { id: "route-22", zoneName: "Route 22", regionArea: "West" },
  { id: "route-23", zoneName: "Route 23", regionArea: "North" },
  { id: "victory-road", zoneName: "Victory Road", regionArea: "North" },
  { id: "pokemon-league", zoneName: "Pokémon League", regionArea: "North" },
  { id: "safari-zone", zoneName: "Safari Zone", regionArea: "South" },
  { id: "seafoam-islands", zoneName: "Seafoam Islands", regionArea: "South" },
];

export const regionZones: Record<string, ZoneTemplate[]> = {
  kanto: kantoZones,
};

export const regions = [
  { id: "kanto", name: "Kanto", game: "Red/Blue/Yellow/FireRed/LeafGreen" },
];

let cachedRegions: Region[] | null = null;

export async function loadRegions(): Promise<Region[]> {
  if (cachedRegions) return cachedRegions;

  try {
    const response = await fetch("/data/regions.json");
    const data = await response.json();

    // Map JSON regions to our Region interface
    cachedRegions = data.regions.map((r: any) => ({
      id: r.name, // Use the name as id (e.g., "kanto")
      name: r.name.charAt(0).toUpperCase() + r.name.slice(1), // Capitalize first letter
      names: r.names,
      locations: r.locations.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        names: loc.names,
      })),
    }));

    return cachedRegions;
  } catch (error) {
    console.error("Failed to load regions:", error);
    return regions; // Fallback to hardcoded regions
  }
}

export function getZonesForRegion(region: string): ZoneTemplate[] {
  return regionZones[region] ?? kantoZones;
}
