import { useCache } from '@/context/CacheContext';
import type { TypeGeneration } from '@/hooks/useTypeChart';

// ─── Static game configuration ────────────────────────────────────────────────

interface GameConfig {
  id: string;
  label: string;
}

interface GenerationConfig {
  label: string;
  /** Key used in the type-charts cache. */
  typeGeneration: 'gen1' | 'gen2-5' | 'gen6+';
  games: GameConfig[];
}

export const GAME_SELECTION_CONFIG: Record<string, GenerationConfig> = {
  gen1: {
    label: 'Generation 1',
    typeGeneration: 'gen1',
    games: [
      { id: 'red-blue', label: 'Red / Blue' },
      { id: 'yellow', label: 'Yellow' },
    ],
  },
  gen2: {
    label: 'Generation 2–5',
    typeGeneration: 'gen2-5',
    games: [
      { id: 'gold-silver', label: 'Gold / Silver' },
      { id: 'crystal', label: 'Crystal' },
      { id: 'ruby-sapphire', label: 'Ruby / Sapphire' },
      { id: 'firered-leafgreen', label: 'FireRed / LeafGreen' },
      { id: 'emerald', label: 'Emerald' },
      { id: 'diamond-pearl', label: 'Diamond / Pearl' },
      { id: 'platinum', label: 'Platinum' },
      { id: 'heartgold-soulsilver', label: 'HeartGold / SoulSilver' },
      { id: 'black-white', label: 'Black / White' },
      { id: 'black-2-white-2', label: 'Black 2 / White 2' },
    ],
  },
  gen6: {
    label: 'Generation 6+',
    typeGeneration: 'gen6+',
    games: [
      { id: 'x-y', label: 'X / Y' },
      { id: 'omega-ruby-alpha-sapphire', label: 'Omega Ruby / Alpha Sapphire' },
      { id: 'sun-moon', label: 'Sun / Moon' },
      { id: 'ultra-sun-ultra-moon', label: 'Ultra Sun / Ultra Moon' },
      { id: 'sword-shield', label: 'Sword / Shield' },
      { id: 'legends-arceus', label: 'Legends: Arceus' },
      { id: 'scarlet-violet', label: 'Scarlet / Violet' },
    ],
  },
};

function typeGenToConfigKey(typeGen: TypeGeneration): string {
  if (typeGen === '1') return 'gen1';
  if (typeGen === '2') return 'gen2';
  return 'gen6';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameSelection() {
  const { typeSprites } = useCache();

  const getGamesForGeneration = (generation: TypeGeneration): GameConfig[] => {
    const key = typeGenToConfigKey(generation);
    return GAME_SELECTION_CONFIG[key]?.games ?? [];
  };

  const isGameValidForTypeGeneration = (
    typeGen: TypeGeneration,
    gameId: string,
  ): boolean => {
    const allowedTypeGen = GAME_SELECTION_CONFIG[typeGenToConfigKey(typeGen)]?.typeGeneration;
    return Object.values(GAME_SELECTION_CONFIG).some(
      (config) =>
        config.typeGeneration === allowedTypeGen &&
        config.games.some((game) => game.id === gameId),
    );
  };

  /**
   * Returns the sprite URL for a type in a specific generation/game combination.
   * Returns null if the combination is invalid or no sprite is available.
   */
  const getTypeSprite = (
    typeName: string,
    typeGen: TypeGeneration,
    gameId: string,
  ): string | null => {
    if (!isGameValidForTypeGeneration(typeGen, gameId)) {
      console.warn(`❌ Game "${gameId}" is incompatible with Gen ${typeGen} types`);
      return null;
    }

    const type = typeSprites.types.find((t) => t.name === typeName);
    if (!type) return null;

    const spriteGenKey = typeGenToConfigKey(typeGen);
    const sprites = type.sprites[spriteGenKey]?.[gameId];
    if (!sprites) return null;

    return sprites.name_icon ?? sprites.symbol_icon ?? null;
  };

  /** Returns all available sprites for a type within a generation (keyed by game). */
  const getTypeSpritesForGeneration = (
    typeName: string,
    typeGen: TypeGeneration,
  ): Record<string, Record<string, string>> => {
    const type = typeSprites.types.find((t) => t.name === typeName);
    if (!type) return {};
    return type.sprites[typeGenToConfigKey(typeGen)] ?? {};
  };

  return {
    config: GAME_SELECTION_CONFIG,
    getGamesForGeneration,
    isGameValidForTypeGeneration,
    getTypeSprite,
    getTypeSpritesForGeneration,
  };
}
