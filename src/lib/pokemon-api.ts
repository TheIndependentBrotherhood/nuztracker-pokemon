import { Capture, PokemonApiData } from "./types";
import { Lang } from "@/i18n/translations";
import { publicPath } from "@/lib/base-path";

const BASE_URL = "https://pokeapi.co/api/v2";
const UNOWN_ID = 201;
const FLABEBE_ID = 669;

type FlabebeColor = "red" | "orange" | "yellow" | "blue" | "white";

export interface CaptureSpriteOption {
  url: string;
  source: "deviantart" | "animated-catalog" | "static";
  label: string;
  unownLetter?: string;
  flabebeColor?: FlabebeColor;
}

export function getCaptureSpriteOptionMeta(option: CaptureSpriteOption): {
  label: string;
  sourceLabel: string;
} {
  const sourceLabel =
    option.source === "deviantart"
      ? "DeviantArt"
      : option.source === "animated-catalog"
        ? "Animated"
        : "Static";

  if (option.unownLetter) {
    return {
      label:
        option.unownLetter === "!" || option.unownLetter === "?"
          ? option.unownLetter
          : option.unownLetter.toUpperCase(),
      sourceLabel,
    };
  }

  if (option.flabebeColor) {
    return {
      label: option.flabebeColor,
      sourceLabel,
    };
  }

  return { label: option.label, sourceLabel };
}

// In-memory fallback for environments where the cache file hasn't been generated yet
let pokemonListFallbackCache: Array<{ name: string; url: string }> | null =
  null;

// Module-level cache for the static JSON file so it is only downloaded once
let pokemonListJsonCache: Array<{
  technicalName: string;
  id: number;
  alternativeTechnicalNames?: string[];
  names?: { fr?: string; en?: string };
  sprites?: {
    normal: { default: string; alternatives: string[] };
    shiny: { default: string; alternatives: string[] };
  };
}> | null = null;

export interface PokemonNames {
  fr?: string;
  en?: string;
}

export interface PokemonSearchResult {
  technicalName: string;
  displayName: string;
  url: string;
  names?: PokemonNames;
}

function getTechnicalNames(entry: {
  technicalName: string;
  alternativeTechnicalNames?: string[];
}): string[] {
  return [entry.technicalName, ...(entry.alternativeTechnicalNames ?? [])];
}

export async function fetchPokemon(
  nameOrId: string | number,
): Promise<PokemonApiData> {
  const res = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error(`Pokemon not found: ${nameOrId}`);
  return res.json();
}

/**
 * Search Pokémon by name.
 * Supports bilingual search (French and English) when the cache contains `names.fr` / `names.en`.
 * Prefers the static cache file (`/data/pokemon-list.json`) to avoid live API calls.
 * Falls back to a direct PokeAPI request when the cache is empty or unavailable.
 *
 * @param query  - The search string typed by the user.
 * @param lang   - Current language ("fr" | "en"). Determines which name is shown in results.
 *                 Searches both languages regardless of this setting.
 */
export async function searchPokemon(
  query: string,
  lang: "fr" | "en" = "fr",
): Promise<PokemonSearchResult[]> {
  if (!query || query.length < 2) return [];

  const lower = query.toLowerCase();

  // Attempt to use the pre-generated static cache
  try {
    if (!pokemonListJsonCache) {
      const res = await fetch(publicPath("/data/pokemon-list.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: {
            technicalName: string;
            id: number;
            alternativeTechnicalNames?: string[];
            names?: { fr?: string; en?: string };
          }[];
        };
        if (data.pokemon && data.pokemon.length > 0) {
          pokemonListJsonCache = data.pokemon;
        }
      }
    }
    if (pokemonListJsonCache) {
      return pokemonListJsonCache
        .filter((p) => {
          const nameFr = p.names?.fr?.toLowerCase() ?? "";
          const nameEn =
            p.names?.en?.toLowerCase() ?? p.technicalName.toLowerCase();
          const technicalNames = getTechnicalNames(p);
          return (
            nameFr.includes(lower) ||
            nameEn.includes(lower) ||
            technicalNames.some((name) => name.includes(lower))
          );
        })
        .slice(0, 10)
        .map((p) => {
          const displayName =
            lang === "fr"
              ? (p.names?.fr ?? p.names?.en ?? p.technicalName)
              : (p.names?.en ?? p.technicalName);
          return {
            technicalName: p.technicalName,
            displayName,
            url: `${BASE_URL}/pokemon/${p.id}`,
            names: p.names,
          };
        });
    }
  } catch {
    // Cache not available – fall through to the live API
  }

  // Fallback: hit PokeAPI directly (maintains previous behaviour)
  try {
    if (!pokemonListFallbackCache) {
      const res = await fetch(`${BASE_URL}/pokemon?limit=1302`);
      if (!res.ok)
        throw new Error(`Failed to fetch Pokemon list: ${res.status}`);
      const data = await res.json();
      pokemonListFallbackCache = data.results as Array<{
        name: string;
        url: string;
      }>;
    }
    return pokemonListFallbackCache
      .filter((p) => p.name.includes(lower))
      .slice(0, 10)
      .map((p) => ({
        technicalName: p.name,
        displayName: p.name,
        url: p.url,
      }));
  } catch {
    return [];
  }
}

export function getLocalizedPokemonName(
  pokemon: { pokemonName: string; pokemonNames?: PokemonNames },
  lang: Lang,
): string {
  return pokemon.pokemonNames?.[lang] ?? pokemon.pokemonName;
}

export function getPokemonIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return parseInt(parts[parts.length - 1]);
}

function normalizeFlabebeColor(raw?: string): FlabebeColor | undefined {
  if (!raw) return undefined;
  const lower = raw.trim().toLowerCase();
  if (lower === "bule") return "blue";
  if (
    lower === "red" ||
    lower === "orange" ||
    lower === "yellow" ||
    lower === "blue" ||
    lower === "white"
  ) {
    return lower;
  }
  return undefined;
}

function getFlabebeColorFromText(text: string): FlabebeColor | undefined {
  const m = text.toLowerCase().match(/\b(red|orange|yellow|blue|bule|white)\b/);
  return normalizeFlabebeColor(m?.[1]);
}

function getUnownLetterFromUrl(url: string): string | undefined {
  const m = url.match(/\/201-([a-z]|question|exclamation)\.gif(?:[?#].*)?$/i);
  if (!m) return undefined;
  const raw = m[1].toLowerCase();
  if (raw === "question") return "?";
  if (raw === "exclamation") return "!";
  return raw;
}

function getUnownFormSlug(unownLetter?: string): string | null {
  if (!unownLetter) return null;

  const normalized = unownLetter.trim().toLowerCase();
  if (/^[a-z]$/.test(normalized)) return normalized;
  if (normalized === "!") return "exclamation";
  if (normalized === "?") return "question";

  return null;
}

export function getStaticSpriteUrl(
  id: number,
  shiny = false,
  unownLetter?: string,
): string {
  const staticBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

  const unownSlug = id === UNOWN_ID ? getUnownFormSlug(unownLetter) : null;
  const supportsStaticUnownForm =
    unownSlug === "exclamation" || unownSlug === "question";
  const spriteName =
    supportsStaticUnownForm && unownSlug ? `${id}-${unownSlug}` : `${id}`;

  return shiny
    ? `${staticBase}/shiny/${spriteName}.png`
    : `${staticBase}/${spriteName}.png`;
}

export function getAnimatedSpriteUrl(
  id: number,
  shiny = false,
  unownLetter?: string,
): string {
  const animatedBase =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";

  const unownSlug = id === UNOWN_ID ? getUnownFormSlug(unownLetter) : null;
  const spriteName = unownSlug ? `${id}-${unownSlug}` : `${id}`;

  return shiny
    ? `${animatedBase}/shiny/${spriteName}.gif`
    : `${animatedBase}/${spriteName}.gif`;
}

export function getSpriteUrl(
  id: number,
  shiny = false,
  preferAnimated = true,
  unownLetter?: string,
): string {
  if (preferAnimated) {
    return getAnimatedSpriteUrl(id, shiny, unownLetter);
  }

  return getStaticSpriteUrl(id, shiny, unownLetter);
}

export function getSpriteFallbackUrl(
  id: number,
  shiny = false,
  unownLetter?: string,
): string {
  return getStaticSpriteUrl(id, shiny, unownLetter);
}

export async function getAvailableCaptureSpriteOptions(params: {
  pokemonId: number;
  pokemonName: string;
  isShiny: boolean;
}): Promise<CaptureSpriteOption[]> {
  const { pokemonId, pokemonName, isShiny } = params;
  const key = pokemonName.toLowerCase();
  const options: CaptureSpriteOption[] = [];

  const pushUnique = (option: CaptureSpriteOption) => {
    if (!options.some((existing) => existing.url === option.url)) {
      options.push(option);
    }
  };

  // Load alternatives from pokemon-list.json (merged source)
  if (!pokemonListJsonCache) {
    try {
      const res = await fetch(publicPath("/data/pokemon-list.json"));
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: Array<{
            technicalName: string;
            id: number;
            alternativeTechnicalNames?: string[];
            names?: { fr?: string; en?: string };
            sprites?: {
              normal: { default: string; alternatives: string[] };
              shiny: { default: string; alternatives: string[] };
            };
          }>;
        };
        if (data.pokemon && data.pokemon.length > 0) {
          pokemonListJsonCache = data.pokemon;
        }
      }
    } catch {
      // ignore
    }
  }

  const cachedEntry = pokemonListJsonCache?.find(
    (p) => p.id === pokemonId || getTechnicalNames(p).includes(key),
  );

  const spriteSlot = isShiny
    ? cachedEntry?.sprites?.shiny
    : cachedEntry?.sprites?.normal;

  for (const altUrl of spriteSlot?.alternatives ?? []) {
    pushUnique({
      url: altUrl,
      source: "animated-catalog",
      label: altUrl,
      ...(pokemonId === UNOWN_ID
        ? { unownLetter: getUnownLetterFromUrl(altUrl) ?? undefined }
        : {}),
    });
  }

  pushUnique({
    url: getStaticSpriteUrl(pokemonId, isShiny),
    source: "static",
    label: `static-${key}`,
  });

  return options;
}

export function getCaptureSpriteUrl(
  capture: Pick<
    Capture,
    "pokemonId" | "isShiny" | "unownLetter" | "selectedSprite"
  >,
  preferAnimated = true,
): string {
  if (capture.selectedSprite?.url) return capture.selectedSprite.url;
  return getSpriteUrl(
    capture.pokemonId,
    capture.isShiny,
    preferAnimated,
    capture.unownLetter,
  );
}

export function getCaptureSpriteFallbackUrl(
  capture: Pick<Capture, "pokemonId" | "isShiny" | "unownLetter">,
): string {
  return getSpriteFallbackUrl(
    capture.pokemonId,
    capture.isShiny,
    capture.unownLetter,
  );
}

// ── Evolution chain functions ──────────────────────────────────────────────

export interface PokemonEvolution {
  id: number;
  name: string;
  names?: PokemonNames;
}

/**
 * Fetch the evolution chain for a given Pokémon
 */
export async function getEvolutionChain(
  pokemonId: number,
): Promise<PokemonEvolution[]> {
  try {
    const pokemon = await fetchPokemon(pokemonId);
    const speciesUrl = (pokemon as any).species?.url;

    if (!speciesUrl) return [];

    const speciesRes = await fetch(speciesUrl);
    if (!speciesRes.ok) return [];

    const species = (await speciesRes.json()) as any;
    const evolutionChainUrl = species.evolution_chain?.url;

    if (!evolutionChainUrl) return [];

    const chainRes = await fetch(evolutionChainUrl);
    if (!chainRes.ok) return [];

    const chain = (await chainRes.json()) as any;

    // Extract all Pokémon in the evolution chain
    const evolutions: PokemonEvolution[] = [];
    const visitChain = (node: any) => {
      if (node.species?.url) {
        const speciesId = getPokemonIdFromUrl(node.species.url);
        evolutions.push({
          id: speciesId,
          name: node.species.name,
        });
      }

      if (node.evolves_to && Array.isArray(node.evolves_to)) {
        node.evolves_to.forEach((child: any) => visitChain(child));
      }
    };

    visitChain(chain.chain);
    return evolutions;
  } catch {
    return [];
  }
}

/**
 * Get available evolutions for a capture based on game mode
 * @param capture The capture to evolve
 * @param run The run configuration (for mode detection)
 * @returns Array of possible evolutions
 */
export async function getAvailableEvolutions(
  capture: Capture,
  run?: {
    isRandomMode: boolean;
    randomizerOptions?: { randomizeEvolvedForms?: boolean } & any;
  },
): Promise<PokemonEvolution[]> {
  const chain = await getEvolutionChain(capture.pokemonId);

  if (!chain || chain.length === 0) return [];

  // Remove current pokémon from the list
  const otherEvolutions = chain.filter((e) => e.id !== capture.pokemonId);

  if (!run) return otherEvolutions;

  // Normal mode: only allow evolutions in the same family (chain)
  if (!run.isRandomMode) {
    return otherEvolutions;
  }

  // Randomizer mode with evolution enabled
  if (run.randomizerOptions?.randomizeEvolvedForms) {
    // If infinite evolution is enabled, return all pokémon
    if ((run.randomizerOptions as any).infiniteEvolution) {
      // This would need to load all pokémon, for now just return chain
      return otherEvolutions;
    }

    // Normal randomizer evolution: same as regular evolution
    return otherEvolutions;
  }

  return [];
}
