import { Capture, PokemonApiData } from "./types";
import { Lang } from "@/i18n/translations";

const BASE_URL = "https://pokeapi.co/api/v2";
const UNOWN_ID = 201;
const FLABEBE_ID = 669;

type FlabebeColor = "red" | "orange" | "yellow" | "blue" | "white";

interface DeviantArtSpriteEntry {
  alt: string;
  sourceName: string;
  file: string;
  url: string;
  unownLetter?: string;
}

interface DeviantArtSpriteMap {
  mapping: Record<string, DeviantArtSpriteEntry[]>;
}

interface AnimatedCatalogEntry {
  id: number;
  name: string;
  normal?: { url?: string; available?: boolean; source?: string };
  shiny?: { url?: string; available?: boolean; source?: string };
}

interface AnimatedCatalog {
  sprites: AnimatedCatalogEntry[];
}

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

let deviantArtSpriteMapPromise: Promise<DeviantArtSpriteMap | null> | null =
  null;
let animatedCatalogPromise: Promise<AnimatedCatalog | null> | null = null;

// In-memory fallback for environments where the cache file hasn't been generated yet
let pokemonListFallbackCache: Array<{ name: string; url: string }> | null =
  null;

// Module-level cache for the static JSON file so it is only downloaded once
let pokemonListJsonCache: Array<{
  name: string;
  id: number;
  names?: { fr?: string; en?: string };
}> | null = null;

export interface PokemonNames {
  fr?: string;
  en?: string;
}

export interface PokemonSearchResult {
  name: string;
  displayName: string;
  url: string;
  names?: PokemonNames;
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
      const res = await fetch("/data/pokemon-list.json");
      if (res.ok) {
        const data = (await res.json()) as {
          pokemon?: {
            name: string;
            id: number;
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
          const nameEn = p.names?.en?.toLowerCase() ?? p.name.toLowerCase();
          return (
            nameFr.includes(lower) ||
            nameEn.includes(lower) ||
            p.name.includes(lower)
          );
        })
        .slice(0, 10)
        .map((p) => {
          const displayName =
            lang === "fr"
              ? (p.names?.fr ?? p.names?.en ?? p.name)
              : (p.names?.en ?? p.name);
          return {
            name: p.name,
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
      .map((p) => ({ ...p, displayName: p.name }));
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

async function loadDeviantArtSpriteMap(): Promise<DeviantArtSpriteMap | null> {
  if (!deviantArtSpriteMapPromise) {
    deviantArtSpriteMapPromise = fetch(
      "/data/deviantart-known-pokemon-map.json",
    )
      .then((res) =>
        res.ok ? (res.json() as Promise<DeviantArtSpriteMap>) : null,
      )
      .catch(() => null);
  }
  return deviantArtSpriteMapPromise;
}

async function loadAnimatedCatalog(): Promise<AnimatedCatalog | null> {
  if (!animatedCatalogPromise) {
    animatedCatalogPromise = fetch("/data/animated-sprites-bw.json")
      .then((res) => (res.ok ? (res.json() as Promise<AnimatedCatalog>) : null))
      .catch(() => null);
  }
  return animatedCatalogPromise;
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

  const deviantArtMap = await loadDeviantArtSpriteMap();
  for (const entry of deviantArtMap?.mapping?.[key] ?? []) {
    pushUnique({
      url: entry.url,
      source: "deviantart",
      label: entry.sourceName,
      ...(pokemonId === UNOWN_ID
        ? {
            unownLetter:
              entry.unownLetter ??
              getUnownLetterFromUrl(entry.url) ??
              undefined,
          }
        : {}),
      ...(pokemonId === FLABEBE_ID
        ? {
            flabebeColor:
              getFlabebeColorFromText(entry.sourceName) ??
              getFlabebeColorFromText(entry.alt),
          }
        : {}),
    });
  }

  const animatedCatalog = await loadAnimatedCatalog();
  const catalogEntry = (animatedCatalog?.sprites ?? []).find(
    (sprite) => sprite.id === pokemonId || sprite.name === key,
  );
  if (catalogEntry) {
    const animatedUrl = isShiny
      ? catalogEntry.shiny?.available && catalogEntry.shiny.url
        ? catalogEntry.shiny.url
        : catalogEntry.normal?.available
          ? catalogEntry.normal.url
          : undefined
      : catalogEntry.normal?.available && catalogEntry.normal.url
        ? catalogEntry.normal.url
        : undefined;

    if (animatedUrl) {
      pushUnique({
        url: animatedUrl,
        source: "animated-catalog",
        label: `${catalogEntry.normal?.source ?? catalogEntry.shiny?.source ?? "animated-catalog"}-${key}`,
        ...(pokemonId === UNOWN_ID
          ? {
              unownLetter: getUnownLetterFromUrl(animatedUrl),
            }
          : {}),
      });
    }
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
