export const GAME_VERSIONS = [
  {
    id: "red-blue",
    name: "Red / Blue",
    nameFr: "Rouge / Bleu",
    region: "kanto",
    generation: 1,
    console: "Game Boy",
  },
  {
    id: "yellow",
    name: "Yellow",
    nameFr: "Jaune",
    region: "kanto",
    generation: 1,
    console: "Game Boy",
  },
  {
    id: "gold-silver",
    name: "Gold / Silver",
    nameFr: "Or / Argent",
    region: "johto",
    generation: 2,
    console: "Game Boy Color",
  },
  {
    id: "crystal",
    name: "Crystal",
    nameFr: "Cristal",
    region: "johto",
    generation: 2,
    console: "Game Boy Color",
  },
  {
    id: "ruby-sapphire",
    name: "Ruby / Sapphire",
    nameFr: "Rubis / Saphir",
    region: "hoenn",
    generation: 3,
    console: "GBA",
  },
  {
    id: "emerald",
    name: "Emerald",
    nameFr: "Émeraude",
    region: "hoenn",
    generation: 3,
    console: "GBA",
  },
  {
    id: "firered",
    name: "FireRed",
    nameFr: "Rouge Feu",
    region: "kanto",
    generation: 3,
    console: "GBA",
  },
  {
    id: "leafgreen",
    name: "LeafGreen",
    nameFr: "Vert Feuille",
    region: "kanto",
    generation: 3,
    console: "GBA",
  },
  {
    id: "diamond-pearl",
    name: "Diamond / Pearl",
    nameFr: "Diamant / Perle",
    region: "sinnoh",
    generation: 4,
    console: "NDS",
  },
  {
    id: "platinum",
    name: "Platinum",
    nameFr: "Platine",
    region: "sinnoh",
    generation: 4,
    console: "NDS",
  },
  {
    id: "heartgold-soulsilver",
    name: "HeartGold / SoulSilver",
    nameFr: "Or HeartGold / Argent SoulSilver",
    region: "johto",
    generation: 4,
    console: "NDS",
  },
  {
    id: "black-white",
    name: "Black / White",
    nameFr: "Noir / Blanc",
    region: "unova",
    generation: 5,
    console: "NDS",
  },
  {
    id: "black2-white2",
    name: "Black 2 / White 2",
    nameFr: "Noir 2 / Blanc 2",
    region: "unova",
    generation: 5,
    console: "NDS",
  },
  {
    id: "x-y",
    name: "X / Y",
    nameFr: "X / Y",
    region: "kalos",
    generation: 6,
    console: "3DS",
  },
  {
    id: "omega-ruby-alpha-sapphire",
    name: "Omega Ruby / Alpha Sapphire",
    nameFr: "Rubis Oméga / Saphir Alpha",
    region: "hoenn",
    generation: 6,
    console: "3DS",
  },
  {
    id: "sun-moon",
    name: "Sun / Moon",
    nameFr: "Soleil / Lune",
    region: "alola",
    generation: 7,
    console: "3DS",
  },
  {
    id: "ultra-sun-ultra-moon",
    name: "Ultra Sun / Ultra Moon",
    nameFr: "Ultra-Soleil / Ultra-Lune",
    region: "alola",
    generation: 7,
    console: "3DS",
  },
  {
    id: "sword-shield",
    name: "Sword / Shield",
    nameFr: "Épée / Bouclier",
    region: "galar",
    generation: 8,
    console: "Switch",
  },
  {
    id: "brilliant-diamond-shining-pearl",
    name: "Brilliant Diamond / Shining Pearl",
    nameFr: "Diamant Étincelant / Perle Scintillante",
    region: "sinnoh",
    generation: 8,
    console: "Switch",
  },
  {
    id: "scarlet-violet",
    name: "Scarlet / Violet",
    nameFr: "Écarlate / Violet",
    region: "paldea",
    generation: 9,
    console: "Switch",
  },
] as const;

export type GameVersionId = (typeof GAME_VERSIONS)[number]["id"];

export function getGameVersion(id?: string) {
  return GAME_VERSIONS.find((game) => game.id === id);
}

export function getGameName(
  game: { name: string; nameFr: string },
  lang: "fr" | "en",
): string {
  return lang === "fr" ? game.nameFr : game.name;
}

export function gameTypeChart(id: GameVersionId): "gen1" | "gen2-5" | "gen6+" {
  const generation = getGameVersion(id)!.generation;
  return generation === 1 ? "gen1" : generation < 6 ? "gen2-5" : "gen6+";
}
