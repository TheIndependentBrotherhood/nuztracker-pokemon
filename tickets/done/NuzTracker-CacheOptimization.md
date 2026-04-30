# NuzTracker - Optimisation du Cache PokeAPI

**Objectif** : Minimiser les appels API en créant des fichiers JSON de cache générés une seule fois et intégrés au build.

---

## 1. Vue d'ensemble des Fichiers de Cache

### Fichiers JSON à Générer

Tous les fichiers se trouvent dans `public/data/` (versionnés dans Git après génération).

| Fichier                   | Source PokeAPI            | Taille  | Fréquence MAJ                    | Priorité     |
| ------------------------- | ------------------------- | ------- | -------------------------------- | ------------ |
| `pokemon-list.json`       | `/pokemon?limit=1350`     | ~2-3 MB | Annuelle (nouvelles générations) | **Haute**    |
| `regions.json`            | `/region/` + `/location/` | ~200 KB | Annuelle                         | **Haute**    |
| `type-charts.json`        | `/generation/{1,2,6}/`    | ~15 KB  | Très rarement                    | **Critique** |
| `type-sprites.json`       | `/type/{name}/sprites`    | ~200 KB | Annuelle                         | **Moyenne**  |
| `abilities-immunity.json` | `/ability/{list}`         | ~20 KB  | Rarement                         | **Moyenne**  |

**Total estimé** : ~2.4-3.5 MB (acceptable pour GitHub Pages, surtout si gzippé)

---

## 2. Détail des Fichiers de Cache

### 2.1 **pokemon-list.json**

Listing complet de tous les Pokémon disponibles (Gen 1-9).

```json
{
  "pokemon": [
    {
      "id": 1,
      "name": "bulbasaur",
      "types": ["grass", "poison"],
      "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/1.png",
      "isLegendary": false,
      "generation": 1
    },
    {
      "id": 25,
      "name": "pikachu",
      "types": ["electric"],
      "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/25.png",
      "isLegendary": false,
      "generation": 1
    },
    ...
  ],
  "generatedAt": "2026-04-29T00:00:00Z",
  "totalCount": 1025
}
```

**Usage côté client** :

```typescript
// Lookup rapide par ID
const getPokemonById = (id: number) =>
  pokemonList.pokemon.find((p) => p.id === id);

// Search par nom
const searchPokemon = (name: string) =>
  pokemonList.pokemon.filter((p) => p.name.includes(name.toLowerCase()));
```

---

### 2.2 **regions.json**

Toutes les régions et leurs locations.

```json
{
  "regions": [
    {
      "id": 1,
      "name": "kanto",
      "generationId": 1,
      "locations": [
        {
          "id": 1,
          "name": "pallet-town",
          "pokemonEncounters": [1, 4, 7]
        },
        {
          "id": 2,
          "name": "viridian-forest",
          "pokemonEncounters": [10, 11, 13, 14, 16, 17, 19, 21, 25]
        },
        ...
      ]
    },
    {
      "id": 2,
      "name": "johto",
      "generationId": 2,
      "locations": [...]
    },
    ...
  ],
  "generatedAt": "2026-04-29T00:00:00Z"
}
```

**Usage côté client** :

```typescript
// Afficher zones d'une région dans le tracker
const getRegionZones = (regionName: string) => {
  return (
    regionsData.regions.find((r) => r.name === regionName)?.locations || []
  );
};

// Vérifier quels Pokémon peuvent être capturés dans une zone
const getPokemonInZone = (locationId: number) => {
  const location = regionsData.regions
    .flatMap((r) => r.locations)
    .find((l) => l.id === locationId);
  return location?.pokemonEncounters || [];
};
```

---

### 2.3 **type-charts.json**

Les 3 type charts groupés (Gen 1, Gen 2-5, Gen 6+).

**Détection des Doubles Faiblesses/Résistances** :

- **Double Weakness** : Le Pokémon a 2 types qui sont tous les deux faibles au même type attaquant (ex: Grass/Fire faible à Rock = 4x dégât)
- **Double Resistance** : Le Pokémon résiste ou est immunisé à un type attaquant depuis ses 2 types (ex: Water/Electric résiste à Water = 0.25x dégât)

```json
{
  "gen1": {
    "types": ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon"],
    "effectiveness": {
      "normal": {
        "weakTo": ["fighting"],
        "resistsAgainst": [],
        "immuneTo": ["ghost"],
        "strongAgainst": []
      },
      "fire": {
        "weakTo": ["water", "ground", "rock"],
        "resistsAgainst": ["fire", "grass", "ice", "bug", "steel"],
        "immuneTo": [],
        "strongAgainst": ["grass", "ice", "bug", "steel"]
      },
      ...
    }
  },
  "gen2-5": {
    "types": ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"],
    "effectiveness": {
      ...
    }
  },
  "gen6+": {
    "types": ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"],
    "effectiveness": {
      ...
    }
  },
  "generatedAt": "2026-04-29T00:00:00Z"
}
```

**Usage côté client - Détection des Doubles** :

```typescript
// Pour un Pokémon Grass/Fire attaqué par Rock
const types = ["grass", "fire"];
const attackType = "rock";

const getWeaknessMultiplier = (
  types: string[],
  attackType: string,
  chart: any,
) => {
  let multiplier = 1;
  for (const type of types) {
    if (chart.effectiveness[type].weakTo.includes(attackType)) {
      multiplier *= 2; // Double dégât
    }
  }
  return multiplier; // 4x si Grass/Fire vs Rock (Rock super-efficace x2)
};

// Ou pour résistances
const getResistanceMultiplier = (
  types: string[],
  attackType: string,
  chart: any,
) => {
  let multiplier = 1;
  for (const type of types) {
    if (chart.effectiveness[type].resistsAgainst.includes(attackType)) {
      multiplier *= 0.5; // Réduit dégâts
    }
    if (chart.effectiveness[type].immuneTo.includes(attackType)) {
      return 0; // Immunité complète
    }
  }
  return multiplier;
};
```

---

### 2.4 **abilities-immunity.json**

Seulement les talents qui donnent des immunités (10 talents).

```json
{
  "abilities": [
    {
      "id": 11,
      "name": "water-absorb",
      "generation": 3,
      "effect": "Immunity to Water-type moves and heals 25% max HP when hit by one",
      "immuneTypes": ["water"],
      "isImmunity": true
    },
    {
      "id": 18,
      "name": "flash-fire",
      "generation": 3,
      "effect": "Immunity to Fire-type moves; Fire-type moves used by others have no effect",
      "immuneTypes": ["fire"],
      "isImmunity": true
    },
    {
      "id": 26,
      "name": "levitate",
      "generation": 3,
      "effect": "Immunity to Ground-type moves",
      "immuneTypes": ["ground"],
      "isImmunity": true
    },
    {
      "id": 65,
      "name": "sap-sipper",
      "generation": 5,
      "effect": "Immunity to Grass-type moves; raises Attack when hit by one",
      "immuneTypes": ["grass"],
      "isImmunity": true
    },
    {
      "id": 68,
      "name": "lightning-rod",
      "generation": 3,
      "effect": "Immunity to Electric-type moves and raises Special Attack when hit by one",
      "immuneTypes": ["electric"],
      "isImmunity": true
    },
    {
      "id": 25,
      "name": "wonder-guard",
      "generation": 3,
      "effect": "Only takes damage from super-effective moves",
      "immuneTypes": ["all-except-super-effective"],
      "isImmunity": false,
      "special": true
    },
    {
      "id": 61,
      "name": "volt-absorb",
      "generation": 4,
      "effect": "Immunity to Electric-type moves; heals 25% max HP when hit by one",
      "immuneTypes": ["electric"],
      "isImmunity": true
    },
    {
      "id": 57,
      "name": "dry-skin",
      "generation": 3,
      "effect": "Takes 1.25x damage from Fire; immunity to Water-type moves and heals 25% max HP when hit by one",
      "immuneTypes": ["water"],
      "isImmunity": true,
      "weakness": "fire"
    },
    {
      "id": 67,
      "name": "storm-drain",
      "generation": 4,
      "effect": "Immunity to Water-type moves and raises Special Attack when hit by one",
      "immuneTypes": ["water"],
      "isImmunity": true
    },
    {
      "id": 111,
      "name": "earth-eater",
      "generation": 9,
      "effect": "Immunity to Ground-type moves; heals 25% max HP when hit by one",
      "immuneTypes": ["ground"],
      "isImmunity": true
    }
  ],
  "generatedAt": "2026-04-29T00:00:00Z"
}
```

**Usage côté client** :

```typescript
const getAbilityImmunity = (abilityName: string): string[] => {
  const ability = abilitiesData.abilities.find((a) => a.name === abilityName);
  return ability?.immuneTypes || [];
};

// Calculer les immunités d'un Pokémon (talent + types)
const getFullImmunities = (
  types: string[],
  abilityName: string,
  typeChart: any,
) => {
  const typeImmunities = types.flatMap(
    (t) => typeChart.effectiveness[t].immuneTo,
  );
  const abilityImmunities = getAbilityImmunity(abilityName);
  return [...new Set([...typeImmunities, ...abilityImmunities])];
};
```

---

### 2.5 **type-sprites.json**

Sprites des types par génération et jeu.

```json
{
  "types": [
    {
      "id": 1,
      "name": "normal",
      "sprites": {
        "gen1": {
          "red-blue": { "name_icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/..." },
          "yellow": { "name_icon": "https://..." }
        },
        "gen3": {
          "firered-leafgreen": { "name_icon": "...", "symbol_icon": "..." },
          "ruby-sapphire": { "name_icon": "..." }
        },
        "gen4": {
          "diamond-pearl": { "name_icon": "..." },
          "platinum": { "name_icon": "..." }
        },
        "gen5": {
          "black-white": { "name_icon": "..." },
          "black-2-white-2": { "name_icon": "..." }
        },
        "gen6": {
          "x-y": { "name_icon": "..." },
          "omega-ruby-alpha-sapphire": { "name_icon": "..." }
        },
        "gen7": {
          "sun-moon": { "name_icon": "..." },
          "ultra-sun-ultra-moon": { "name_icon": "..." }
        },
        "gen8": {
          "sword-shield": { "name_icon": "..." }
        },
        "gen9": {
          "scarlet-violet": { "name_icon": "..." }
        }
      }
    },
    {
      "id": 2,
      "name": "fire",
      "sprites": { ... }
    },
    ...
  ],
  "generatedAt": "2026-04-29T00:00:00Z"
}
```

**Exemple d'usage côté client** :

```typescript
// Hook pour récupérer sprite d'un type selon la génération et jeu sélectionnés
const useTypeSprite = (typeName: string, generation: string, game: string) => {
  const { typeSprites } = useCache();

  const type = typeSprites.types.find(t => t.name === typeName);
  const sprites = type?.sprites[generation]?.[game];

  return sprites?.name_icon || sprites?.symbol_icon || null;
};

// Exemple : utiliser dans le sélecteur de jeu lors de la création de partie
const getAvailableGames = (generation: string) => {
  // Retourner les jeux disponibles pour cette génération
  const games = {
    'gen1': ['red-blue', 'yellow'],
    'gen3': ['firered-leafgreen', 'ruby-sapphire'],
    'gen4': ['diamond-pearl', 'platinum'],
    ...
  };
  return games[generation] || [];
};
```

---

## 3. Scripts de Génération

### 3.1 Script Node.js pour Générer les JSONs

```typescript
// scripts/generate-cache-files.ts
import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const OUTPUT_DIR = path.join(__dirname, "../public/data");

interface CacheFile {
  name: string;
  generator: () => Promise<any>;
}

// Fonction utilitaire pour fetch avec retry
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Générateur 1: pokemon-list.json
async function generatePokemonList() {
  console.log("📦 Génération pokemon-list.json...");
  const pokemon = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await fetchWithRetry(
      `${POKEAPI_BASE}/pokemon?offset=${offset}&limit=${limit}`,
    );

    for (const p of data.results) {
      const details = await fetchWithRetry(`${POKEAPI_BASE}/pokemon/${p.name}`);
      pokemon.push({
        id: details.id,
        name: details.name,
        types: details.types.map((t: any) => t.type.name),
        sprite: details.sprites.front_default,
        generation: Math.ceil(details.id / 151), // Estimation simple
        isLegendary: false, // À améliorer via autre API call
      });
    }

    if (!data.next) break;
    offset += limit;
  }

  return {
    pokemon,
    generatedAt: new Date().toISOString(),
    totalCount: pokemon.length,
  };
}

// Générateur 2: regions.json
async function generateRegions() {
  console.log("🗺️ Génération regions.json...");
  const regions = [];
  const regionsList = await fetchWithRetry(`${POKEAPI_BASE}/region`);

  for (const r of regionsList.results) {
    const regionData = await fetchWithRetry(`${POKEAPI_BASE}/region/${r.name}`);
    const locations = [];

    for (const loc of regionData.locations) {
      const locData = await fetchWithRetry(
        `${POKEAPI_BASE}/location/${loc.name}`,
      );

      // Extraire les Pokémon des rencontres
      const pokemonIds = new Set<number>();
      for (const area of locData.areas || []) {
        const areaData = await fetchWithRetry(
          `${POKEAPI_BASE}/location-area/${area.name}`,
        );
        for (const enc of areaData.pokemon_encounters || []) {
          const pokemonData = await fetchWithRetry(enc.pokemon.url);
          pokemonIds.add(pokemonData.id);
        }
      }

      locations.push({
        id: locData.id,
        name: locData.name,
        pokemonEncounters: Array.from(pokemonIds),
      });
    }

    regions.push({
      id: regionData.id,
      name: regionData.name,
      generationId: regionData.generation?.name || null,
      locations,
    });
  }

  return {
    regions,
    generatedAt: new Date().toISOString(),
  };
}

// Générateur 3: type-charts.json
async function generateTypeCharts() {
  console.log("📊 Génération type-charts.json...");
  const charts = {};

  for (const genId of [1, 2, 6]) {
    const genData = await fetchWithRetry(`${POKEAPI_BASE}/generation/${genId}`);
    const types = genData.types.map((t: any) => t.name);
    const effectiveness = {};

    for (const typeName of types) {
      const typeData = await fetchWithRetry(`${POKEAPI_BASE}/type/${typeName}`);
      effectiveness[typeName] = {
        weakTo: typeData.damage_relations.take_damage_from.map(
          (t: any) => t.name,
        ),
        resistsAgainst: typeData.damage_relations.half_damage_from.map(
          (t: any) => t.name,
        ),
        immuneTo: typeData.damage_relations.no_damage_from.map(
          (t: any) => t.name,
        ),
        strongAgainst: typeData.damage_relations.half_damage_to.map(
          (t: any) => t.name,
        ),
      };
    }

    const genKey = genId === 1 ? "gen1" : genId === 2 ? "gen2-5" : "gen6+";
    charts[genKey] = { types, effectiveness };
  }

  return {
    ...charts,
    generatedAt: new Date().toISOString(),
  };
}

// Générateur 4: abilities-immunity.json
async function generateAbilitiesImmunity() {
  console.log("⚡ Génération abilities-immunity.json...");

  const abilityNames = [
    "water-absorb",
    "flash-fire",
    "levitate",
    "sap-sipper",
    "lightning-rod",
    "wonder-guard",
    "volt-absorb",
    "dry-skin",
    "storm-drain",
    "earth-eater",
  ];

  const abilities = [];

  for (const name of abilityNames) {
    try {
      const abilityData = await fetchWithRetry(
        `${POKEAPI_BASE}/ability/${name}`,
      );
      abilities.push({
        id: abilityData.id,
        name: abilityData.name,
        generation: abilityData.generation.name,
        effect: abilityData.effect_entries?.[0]?.effect || "Unknown",
        immuneTypes: extractImmuneTypes(name, abilityData),
        isImmunity: true,
        special: name === "wonder-guard",
      });
    } catch (e) {
      console.warn(`⚠️ Ability ${name} not found`);
    }
  }

  return {
    abilities,
    generatedAt: new Date().toISOString(),
  };
}

function extractImmuneTypes(abilityName: string, data: any): string[] {
  // Mapping manual car PokeAPI ne documente pas les immunités directement
  const immunityMap: Record<string, string[]> = {
    "water-absorb": ["water"],
    "flash-fire": ["fire"],
    levitate: ["ground"],
    "sap-sipper": ["grass"],
    "lightning-rod": ["electric"],
    "wonder-guard": ["all-except-super-effective"],
    "volt-absorb": ["electric"],
    "dry-skin": ["water"],
    "storm-drain": ["water"],
    "earth-eater": ["ground"],
  };
  return immunityMap[abilityName] || [];
}

// Générateur 5: type-sprites.json
async function generateTypeSprites() {
  console.log("🎨 Génération type-sprites.json...");

  const typesList = await fetchWithRetry(`${POKEAPI_BASE}/type`);
  const types = [];

  for (const typeItem of typesList.results) {
    const typeData = await fetchWithRetry(
      `${POKEAPI_BASE}/type/${typeItem.name}`,
    );
    const sprites = {};

    // Parcourir les sprites par génération et jeu
    if (typeData.sprites) {
      for (const [genKey, genSprites] of Object.entries(typeData.sprites)) {
        if (typeof genSprites === "object" && genSprites !== null) {
          sprites[genKey] = {};
          for (const [gameName, gameSprites] of Object.entries(genSprites)) {
            if (typeof gameSprites === "object" && gameSprites !== null) {
              sprites[genKey][gameName] = gameSprites;
            }
          }
        }
      }
    }

    types.push({
      id: typeData.id,
      name: typeData.name,
      sprites,
    });
  }

  return {
    types,
    generatedAt: new Date().toISOString(),
  };
}

// Point d'entrée principal
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files: CacheFile[] = [
    { name: "pokemon-list.json", generator: generatePokemonList },
    { name: "regions.json", generator: generateRegions },
    { name: "type-charts.json", generator: generateTypeCharts },
    { name: "type-sprites.json", generator: generateTypeSprites },
    { name: "abilities-immunity.json", generator: generateAbilitiesImmunity },
  ];

  for (const file of files) {
    try {
      const data = await file.generator();
      const outputPath = path.join(OUTPUT_DIR, file.name);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`✅ ${file.name} généré avec succès`);
    } catch (e) {
      console.error(`❌ Erreur lors de la génération de ${file.name}:`, e);
    }
  }

  console.log("✨ Cache files générés avec succès !");
}

main();
```

**Commande à ajouter dans `package.json`** :

```json
{
  "scripts": {
    "generate-cache": "tsx scripts/generate-cache-files.ts"
  }
}
```

---

## 4. Intégration dans le Projet

### 4.1 Context React pour Accéder aux Data

```typescript
// src/context/CacheContext.tsx
import React, { createContext, useContext, useState } from 'react';
import pokemonListData from '@/public/data/pokemon-list.json';
import regionsData from '@/public/data/regions.json';
import typeChartsData from '@/public/data/type-charts.json';
import typeSpritesData from '@/public/data/type-sprites.json';
import abilitiesData from '@/public/data/abilities-immunity.json';

interface CacheContextType {
  pokemon: typeof pokemonListData;
  regions: typeof regionsData;
  typeCharts: typeof typeChartsData;
  typeSprites: typeof typeSpritesData;
  abilities: typeof abilitiesData;
  isLoaded: boolean;
}

const CacheContext = createContext<CacheContextType | null>(null);

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(true); // Déjà chargé depuis JSON static

  return (
    <CacheContext.Provider
      value={{
        pokemon: pokemonListData,
        regions: regionsData,
        typeCharts: typeChartsData,
        typeSprites: typeSpritesData,
        abilities: abilitiesData,
        isLoaded
      }}
    >
      {children}
    </CacheContext.Provider>
  );
}

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) throw new Error('useCache must be used within CacheProvider');
  return context;
};
```

### 4.2 Hook Utilitaire pour Type Chart

```typescript
// src/hooks/useTypeChart.ts
import { useCache } from "@/context/CacheContext";

export function useTypeChart(generation: "1" | "2" | "6") {
  const { typeCharts } = useCache();

  const chartKey =
    generation === "1" ? "gen1" : generation === "2" ? "gen2-5" : "gen6+";
  const chart = typeCharts[chartKey];

  return {
    types: chart.types,
    getEffectiveness: (typeName: string) => chart.effectiveness[typeName],
    getWeaknessesOf: (types: string[]) => {
      return [...new Set(types.flatMap((t) => chart.effectiveness[t].weakTo))];
    },
    getResistancesOf: (types: string[]) => {
      return [
        ...new Set(types.flatMap((t) => chart.effectiveness[t].resistsAgainst)),
      ];
    },
    getImmunitiesOf: (types: string[]) => {
      return [
        ...new Set(types.flatMap((t) => chart.effectiveness[t].immuneTo)),
      ];
    },
    // Détection des DOUBLES faiblesses
    getDoubleWeaknessesOf: (types: string[]) => {
      return chart.types.filter((attackType) => {
        const weakCount = types.filter((defType) =>
          chart.effectiveness[defType].weakTo.includes(attackType),
        ).length;
        return weakCount > 1; // Attack type est faible pour 2+ types du Pokémon
      });
    },
    // Détection des DOUBLES résistances
    getDoubleResistancesOf: (types: string[]) => {
      return chart.types.filter((attackType) => {
        const resistCount = types.filter(
          (defType) =>
            chart.effectiveness[defType].resistsAgainst.includes(attackType) ||
            chart.effectiveness[defType].immuneTo.includes(attackType),
        ).length;
        return resistCount > 1; // Attaque résistée/immunisée par 2+ types
      });
    },
    // Multiplicateur de dégât (pour affichage 4x, 0.5x, etc.)
    getDamageMultiplier: (pokemonTypes: string[], attackType: string) => {
      let multiplier = 1;
      for (const type of pokemonTypes) {
        if (chart.effectiveness[type].weakTo.includes(attackType)) {
          multiplier *= 2;
        }
      }
      return multiplier;
    },
    getResistMultiplier: (pokemonTypes: string[], attackType: string) => {
      let multiplier = 1;
      for (const type of pokemonTypes) {
        if (chart.effectiveness[type].immuneTo.includes(attackType)) {
          return 0;
        }
        if (chart.effectiveness[type].resistsAgainst.includes(attackType)) {
          multiplier *= 0.5;
        }
      }
      return multiplier;
    },
  };
}
```

### 4.3 Hook pour les Sprites des Types et Sélection de Jeu

```typescript
// src/hooks/useGameSelection.ts
import { useCache } from "@/context/CacheContext";

// Configuration des jeux par génération (pour affichage dans le sélecteur)
export const GAME_SELECTION_CONFIG = {
  gen1: {
    label: "Generation 1",
    typeGeneration: "gen1", // Correspond à la table de type Gen 1
    games: [
      { id: "red-blue", label: "Red/Blue" },
      { id: "yellow", label: "Yellow" },
    ],
  },
  gen2: {
    label: "Generation 2-5",
    typeGeneration: "gen2-5", // Correspond à la table de type Gen 2-5
    games: [
      { id: "gold-silver", label: "Gold/Silver" },
      { id: "crystal", label: "Crystal" },
      { id: "ruby-sapphire", label: "Ruby/Sapphire" },
      { id: "firered-leafgreen", label: "FireRed/LeafGreen" },
      { id: "emerald", label: "Emerald" },
      { id: "diamond-pearl", label: "Diamond/Pearl" },
      { id: "platinum", label: "Platinum" },
      { id: "heartgold-soulsilver", label: "HeartGold/SoulSilver" },
      { id: "black-white", label: "Black/White" },
      { id: "black-2-white-2", label: "Black 2/White 2" },
    ],
  },
  gen6: {
    label: "Generation 6+",
    typeGeneration: "gen6+", // Correspond à la table de type Gen 6+
    games: [
      { id: "x-y", label: "X/Y" },
      { id: "omega-ruby-alpha-sapphire", label: "Omega Ruby/Alpha Sapphire" },
      { id: "sun-moon", label: "Sun/Moon" },
      { id: "ultra-sun-ultra-moon", label: "Ultra Sun/Ultra Moon" },
      { id: "sword-shield", label: "Sword/Shield" },
      { id: "legends-arceus", label: "Legends Arceus" },
      { id: "scarlet-violet", label: "Scarlet/Violet" },
    ],
  },
};

export function useGameSelection() {
  const { typeSprites } = useCache();

  return {
    config: GAME_SELECTION_CONFIG,

    // Récupérer les jeux disponibles pour une génération (avec validation de type)
    getGamesForGeneration: (generation: "1" | "2" | "6") => {
      const genKey =
        generation === "1" ? "gen1" : generation === "2" ? "gen2" : "gen6";
      return GAME_SELECTION_CONFIG[genKey]?.games || [];
    },

    // Vérifier si un jeu peut être utilisé pour une table de type donnée
    // Gen 1 types → Gen 1 games seulement
    // Gen 2-5 types → Gen 2-5 games seulement
    // Gen 6+ types → Gen 6+ games seulement
    isGameValidForTypeGeneration: (
      typeGeneration: "1" | "2" | "6",
      gameId: string,
    ) => {
      const allowedConfigs = Object.values(GAME_SELECTION_CONFIG).filter(
        (config) =>
          config.typeGeneration ===
          (typeGeneration === "1"
            ? "gen1"
            : typeGeneration === "2"
              ? "gen2-5"
              : "gen6+"),
      );
      return allowedConfigs.some((config) =>
        config.games.some((game) => game.id === gameId),
      );
    },

    // Récupérer le sprite d'un type pour une génération/jeu spécifique
    // Valide que le jeu correspond à la table de type
    getTypeSprite: (
      typeName: string,
      typeGeneration: "1" | "2" | "6",
      gameId: string,
    ) => {
      // Valider que le jeu correspond à la génération de type
      if (!this.isGameValidForTypeGeneration(typeGeneration, gameId)) {
        console.warn(
          `❌ Jeu ${gameId} incompatible avec Gen ${typeGeneration} types`,
        );
        return null;
      }

      const type = typeSprites.types.find((t) => t.name === typeName);
      if (!type) return null;

      // Convertir la génération de type en clé sprite
      const spriteGenKey =
        typeGeneration === "1"
          ? "gen1"
          : typeGeneration === "2"
            ? "gen2"
            : "gen6";

      const sprites = type.sprites[spriteGenKey]?.[gameId];
      if (!sprites) return null;

      // Préférer name_icon, sinon symbol_icon
      return sprites.name_icon || sprites.symbol_icon || null;
    },

    // Récupérer tous les sprites valides pour une table de type donnée
    getTypeSpritesForTypeGeneration: (
      typeName: string,
      typeGeneration: "1" | "2" | "6",
    ) => {
      const type = typeSprites.types.find((t) => t.name === typeName);
      if (!type) return {};

      const spriteGenKey =
        typeGeneration === "1"
          ? "gen1"
          : typeGeneration === "2"
            ? "gen2"
            : "gen6";
      return type.sprites[spriteGenKey] || {};
    },
  };
}
```

---

## 5. Validation : Synchronisation Type Table ↔ Sprites

### **Règles de Synchronisation**

```
Type Table Gen 1    → Sprites Gen 1 uniquement     (Red/Blue, Yellow)
Type Table Gen 2-5  → Sprites Gen 2-5 uniquement   (Gold/Silver ... Black 2/White 2)
Type Table Gen 6+   → Sprites Gen 6+ uniquement    (X/Y ... Scarlet/Violet)
```

**Exemple** : Si le joueur choisit `Gen 2-5` comme table de type, il **ne peut pas** choisir des sprites de `Red/Blue` ou de `X/Y`.

### **Implémentation dans le Formulaire de Création**

```typescript
// src/components/NewRunForm.tsx (exemple simplifié)
import { useTypeChart } from '@/hooks/useTypeChart';
import { useGameSelection } from '@/hooks/useGameSelection';
import { useState } from 'react';

export function NewRunForm() {
  const typeChartHook = useTypeChart('1'); // État initial Gen 1
  const gameSelection = useGameSelection();

  const [selectedTypeGen, setSelectedTypeGen] = useState<'1' | '2' | '6'>('1');
  const [selectedGameId, setSelectedGameId] = useState<string>('red-blue');

  // Quand la génération de type change
  const handleTypeGenChange = (newGen: '1' | '2' | '6') => {
    setSelectedTypeGen(newGen);

    // Réinitialiser le jeu au premier compatible
    const validGames = gameSelection.getGamesForGeneration(newGen);
    setSelectedGameId(validGames[0]?.id || '');
  };

  // Quand le jeu change
  const handleGameChange = (gameId: string) => {
    // Valider que le jeu est compatible avec la table de type actuellement sélectionnée
    if (gameSelection.isGameValidForTypeGeneration(selectedTypeGen, gameId)) {
      setSelectedGameId(gameId);
    } else {
      console.error(`Jeu ${gameId} incompatible avec Gen ${selectedTypeGen} types`);
      // Ne pas changer la sélection
    }
  };

  return (
    <form>
      {/* Sélecteur 1: Type Table Generation */}
      <select
        value={selectedTypeGen}
        onChange={(e) => handleTypeGenChange(e.target.value as '1' | '2' | '6')}
      >
        <option value="1">Generation 1 (15 types)</option>
        <option value="2">Generation 2-5 (17 types)</option>
        <option value="6">Generation 6+ (18 types)</option>
      </select>

      {/* Sélecteur 2: Game (filtre selon Type Gen) */}
      <select
        value={selectedGameId}
        onChange={(e) => handleGameChange(e.target.value)}
      >
        {gameSelection.getGamesForGeneration(selectedTypeGen).map(game => (
          <option key={game.id} value={game.id}>
            {game.label}
          </option>
        ))}
      </select>

      {/* Affichage des sprites des types pour ce jeu */}
      <div className="type-sprites-preview">
        {typeChartHook.types.map(typeName => {
          const sprite = gameSelection.getTypeSprite(
            typeName,
            selectedTypeGen,
            selectedGameId
          );
          return sprite ? (
            <img
              key={typeName}
              src={sprite}
              alt={typeName}
              title={typeName}
            />
          ) : null;
        })}
      </div>
    </form>
  );
}
```

---

## 6. Workflow de Mise à Jour

### Quand Mettre à Jour les Cache Files

| Fichier                   | Quand                        | Commande              |
| ------------------------- | ---------------------------- | --------------------- |
| `pokemon-list.json`       | Nouvelle génération Pokémon  | `yarn generate-cache` |
| `regions.json`            | Nouveaux jeux / régions      | `yarn generate-cache` |
| `type-charts.json`        | Jamais (statique)            | -                     |
| `type-sprites.json`       | Nouveaux jeux / visuels type | `yarn generate-cache` |
| `abilities-immunity.json` | Nouveaux talents             | `yarn generate-cache` |

### Procédure

1. `yarn generate-cache` (génère tous les files)
2. Vérifier les changements dans `public/data/`
3. Committer : `git add public/data/ && git commit -m "chore: update cache files"`
4. Les JSON sont inclus dans le build Next.js

---

## 7. Optimisations Avancées (Optionnel)

### Compression des JSONs

```json
{
  "script": "build": "next build && gzip public/data/*.json"
}
```

### Versioning des Cache Files

```typescript
// Type dans chaque JSON
{
  "version": "1.0.0",  // Incrémenter si breaking changes
  "generatedAt": "2026-04-29T..."
}
```

---

## Summary

✅ **5 fichiers JSON** à générer via script Node.js  
✅ **Intégration dans `public/data/`** (chargement au build)  
✅ **Context React** pour accès global  
✅ **Hooks avancés** :

- `useTypeChart()` : Type charts + détection doubles faiblesses/résistances + multiplicateurs de dégât
- `useGameSelection()` : Configuration des jeux par génération + sprites des types
  ✅ **Sélection de jeu lors de la création de partie** : Gen → Jeu → Sprites des types  
  ✅ **Zéro appels API** à la volée (sauf init rare du script)

Avec cette approche, l'app est **ultra rapide**, **offline-capable**, et affiche les **visuels corrects** selon la génération/jeu choisi ! 🚀
