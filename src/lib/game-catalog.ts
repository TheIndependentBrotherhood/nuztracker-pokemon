export const GAME_VERSIONS = [
  { id: "red-blue", name: "Red / Blue", region: "kanto", generation: 1, console: "Game Boy" },
  { id: "yellow", name: "Yellow", region: "kanto", generation: 1, console: "Game Boy" },
  { id: "gold-silver", name: "Gold / Silver", region: "johto", generation: 2, console: "Game Boy Color" },
  { id: "crystal", name: "Crystal", region: "johto", generation: 2, console: "Game Boy Color" },
  { id: "ruby-sapphire", name: "Ruby / Sapphire", region: "hoenn", generation: 3, console: "GBA" },
  { id: "emerald", name: "Emerald", region: "hoenn", generation: 3, console: "GBA" },
  { id: "firered", name: "FireRed", region: "kanto", generation: 3, console: "GBA" },
  { id: "leafgreen", name: "LeafGreen", region: "kanto", generation: 3, console: "GBA" },
  { id: "diamond-pearl", name: "Diamond / Pearl", region: "sinnoh", generation: 4, console: "NDS" },
  { id: "platinum", name: "Platinum", region: "sinnoh", generation: 4, console: "NDS" },
  { id: "heartgold-soulsilver", name: "HeartGold / SoulSilver", region: "johto", generation: 4, console: "NDS" },
  { id: "black-white", name: "Black / White", region: "unova", generation: 5, console: "NDS" },
  { id: "black2-white2", name: "Black 2 / White 2", region: "unova", generation: 5, console: "NDS" },
  { id: "x-y", name: "X / Y", region: "kalos", generation: 6, console: "3DS" },
  { id: "omega-ruby-alpha-sapphire", name: "Omega Ruby / Alpha Sapphire", region: "hoenn", generation: 6, console: "3DS" },
  { id: "sun-moon", name: "Sun / Moon", region: "alola", generation: 7, console: "3DS" },
  { id: "ultra-sun-ultra-moon", name: "Ultra Sun / Ultra Moon", region: "alola", generation: 7, console: "3DS" },
  { id: "sword-shield", name: "Sword / Shield", region: "galar", generation: 8, console: "Switch" },
  { id: "brilliant-diamond-shining-pearl", name: "Brilliant Diamond / Shining Pearl", region: "sinnoh", generation: 8, console: "Switch" },
  { id: "scarlet-violet", name: "Scarlet / Violet", region: "paldea", generation: 9, console: "Switch" },
] as const;

export type GameVersionId = (typeof GAME_VERSIONS)[number]["id"];

export function getGameVersion(id?: string) {
  return GAME_VERSIONS.find((game) => game.id === id);
}

export function gameTypeChart(id: GameVersionId): "gen1" | "gen2-5" | "gen6+" {
  const generation = getGameVersion(id)!.generation;
  return generation === 1 ? "gen1" : generation < 6 ? "gen2-5" : "gen6+";
}
