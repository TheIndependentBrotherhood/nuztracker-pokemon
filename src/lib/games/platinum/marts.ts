// Platinum specialty clerks shuffled by the NuzTracker randomizer, with the map that hosts each one.
export const PLATINUM_SPECIALTY_MARTS = [
  { id: "jubilife", tableIndex: 9, maps: [4] },
  { id: "oreburgh", tableIndex: 10, maps: [46] },
  { id: "floaroma", tableIndex: 11, maps: [427] },
  { id: "eterna", tableIndex: 12, maps: [66] },
  { id: "hearthome", tableIndex: 14, maps: [87] },
  { id: "solaceon", tableIndex: 15, maps: [434] },
  { id: "pastoria", tableIndex: 16, maps: [121] },
  { id: "celestic", tableIndex: 23, maps: [446] },
  { id: "snowpoint", tableIndex: 24, maps: [166] },
  { id: "canalave", tableIndex: 25, maps: [34] },
  { id: "sunyshore", tableIndex: 26, maps: [153] },
  { id: "pokemonLeague", tableIndex: 27, maps: [173, 175] },
] as const;

export type MartId = (typeof PLATINUM_SPECIALTY_MARTS)[number]["id"];

export const MART_IDS = PLATINUM_SPECIALTY_MARTS.map(({ id }) => id) as [
  MartId,
  ...MartId[],
];

export function martForMap(map: number): MartId | undefined {
  return PLATINUM_SPECIALTY_MARTS.find(({ maps }) =>
    (maps as readonly number[]).includes(map),
  )?.id;
}
