"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { publicPath } from "@/lib/base-path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpriteEntry {
  alt: string;
  sourceName: string;
  normalizedSource: string;
  file: string;
  url: string;
  dexId: number | null;
  candidates: string[];
  spriteVariant?: "normal" | "shiny";
  provider?:
    | "deviantart"
    | "animated-catalog"
    | "pokemon-list-static"
    | "manual";
  isStaticFallback?: boolean;
  unownLetter?: string;
}

interface SpriteMap {
  generatedAt: string;
  stats: {
    csvRows: number;
    mappedSprites: number;
    knownKeysMatched: number;
    unmatchedSprites: number;
  };
  mapping: Record<string, SpriteEntry[]>;
}

interface PokemonListEntry {
  id: number;
  name: string;
  names: { fr: string; en: string };
  sprites: {
    normal: { default: string; alternatives: string[] };
    shiny: { default: string; alternatives: string[] };
  };
}

type SpriteCorrections = Record<string, string>;

interface EditingSpriteState {
  sprite: SpriteEntry;
  currentKey: string;
  originalKey: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "dev-sprite-key-corrections";
const STORAGE_KEY_ADDITIONS = "dev-sprite-manual-additions";
const STORAGE_KEY_DELETIONS = "dev-sprite-manual-deletions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadCorrections(): SpriteCorrections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SpriteCorrections;
  } catch {
    // ignore
  }
  return {};
}

function saveCorrections(corrections: SpriteCorrections) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections));
  } catch {
    // ignore
  }
}

type ManualAdditions = Record<string, SpriteEntry[]>;

type DeletedSpriteUrls = string[];

function loadAdditions(): ManualAdditions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADDITIONS);
    if (raw) return JSON.parse(raw) as ManualAdditions;
  } catch {
    // ignore
  }
  return {};
}

function saveAdditions(additions: ManualAdditions) {
  try {
    localStorage.setItem(STORAGE_KEY_ADDITIONS, JSON.stringify(additions));
  } catch {
    // ignore
  }
}

function loadDeletedSpriteUrls(): DeletedSpriteUrls {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETIONS);
    if (raw) return JSON.parse(raw) as DeletedSpriteUrls;
  } catch {
    // ignore
  }
  return [];
}

function saveDeletedSpriteUrls(urls: DeletedSpriteUrls) {
  try {
    localStorage.setItem(STORAGE_KEY_DELETIONS, JSON.stringify(urls));
  } catch {
    // ignore
  }
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatUnownLabel(letter: string): string {
  return letter === "!" || letter === "?" ? letter : letter.toUpperCase();
}

function getFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return path.split("/").pop() || "sprite.gif";
  } catch {
    return "sprite.gif";
  }
}

function toPokeApiShinyUrl(url: string): string {
  return url.replace("/sprites/pokemon/", "/sprites/pokemon/shiny/");
}

function extractUnownLetterFromAnimatedUrl(url: string): string | undefined {
  const m = url.match(/\/201-([a-z]|question|exclamation)\.gif$/i);
  if (!m) return undefined;

  const raw = m[1].toLowerCase();
  if (raw === "question") return "?";
  if (raw === "exclamation") return "!";
  return raw;
}

function isAnimatedSpriteEntry(entry: SpriteEntry): boolean {
  if (entry.provider === "animated-catalog") return true;
  return /\.gif(?:$|\?)/i.test(entry.url);
}

function normalizePokemonKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpriteCard({
  pokemonKey,
  sprites,
  displayName,
  onOpenEditor,
  correctedCount,
  isSpriteCorrected,
  onSpriteError,
  brokenUrls,
  onAddSprite,
  deletedSpriteUrls,
  onDeleteSprite,
}: {
  pokemonKey: string;
  sprites: SpriteEntry[];
  displayName: string;
  onOpenEditor: (key: string, entry: SpriteEntry) => void;
  correctedCount: number;
  isSpriteCorrected: (sprite: SpriteEntry) => boolean;
  onSpriteError: (url: string) => void;
  brokenUrls: Set<string>;
  onAddSprite: (key: string) => void;
  deletedSpriteUrls: Set<string>;
  onDeleteSprite: (pokemonKey: string, sprite: SpriteEntry) => void;
}) {
  const isMultiple = sprites.length > 1;

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 12,
        padding: 12,
        border: isMultiple ? "1px solid #334155" : "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#f1f5f9",
            textTransform: "capitalize",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={pokemonKey}
        >
          {displayName}
        </span>
        <span
          style={{
            fontSize: 11,
            color: isMultiple ? "#fbbf24" : "#64748b",
            background: isMultiple ? "#451a03" : "#0f172a",
            borderRadius: 6,
            padding: "1px 6px",
            flexShrink: 0,
          }}
        >
          {sprites.length}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "#64748b" }}>
        Cliquer un sprite pour agrandir et corriger son Pokemon.
      </div>

      {/* Sprites row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sprites.map((sprite, idx) => {
          const isCorrected = isSpriteCorrected(sprite);
          const isBroken = brokenUrls.has(sprite.url);
          const isManual = sprite.provider === "manual";
          const isDeleted = deletedSpriteUrls.has(sprite.url);
          return (
            <button
              key={idx}
              title={`${sprite.alt || sprite.sourceName}${sprite.provider ? ` [${sprite.provider}]` : ""}${isBroken ? " ⚠ 404" : ""}`}
              onClick={() => onOpenEditor(pokemonKey, sprite)}
              style={{
                background: isDeleted
                  ? "#3b0d0c"
                  : isBroken
                    ? "#1c0a0a"
                    : isManual
                      ? "#0d1f14"
                      : isCorrected
                        ? "#312e81"
                        : "#0f172a",
                border: isDeleted
                  ? "2px solid #f97316"
                  : isBroken
                    ? "2px solid #ef4444"
                    : isManual
                      ? "2px solid #22c55e"
                      : isCorrected
                        ? "2px solid #818cf8"
                        : "2px solid #334155",
                borderRadius: 8,
                padding: 4,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s, background 0.15s",
                flexShrink: 0,
                position: "relative",
                opacity: isDeleted ? 0.75 : 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sprite.url}
                alt={sprite.alt || sprite.sourceName}
                width={64}
                height={64}
                style={{
                  imageRendering: "pixelated",
                  objectFit: "contain",
                  filter: isDeleted ? "grayscale(0.35) saturate(0.7)" : "none",
                }}
                loading="lazy"
                onError={() => onSpriteError(sprite.url)}
              />
              {isDeleted && (
                <span
                  style={{
                    position: "absolute",
                    inset: "50% 8px auto 8px",
                    height: 2,
                    background: "#f97316",
                    transform: "translateY(-50%) rotate(-18deg)",
                    boxShadow: "0 0 10px rgba(249, 115, 22, 0.45)",
                  }}
                />
              )}
              {isBroken && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 4,
                    fontSize: 10,
                    color: "#ef4444",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  404
                </span>
              )}
              {isManual && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: 4,
                    fontSize: 9,
                    color: "#22c55e",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
              )}
              <button
                type="button"
                title={
                  isManual
                    ? "Supprimer ce sprite ajouté"
                    : "Masquer ce sprite pour ce correcteur"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSprite(pokemonKey, sprite);
                }}
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: `1px solid ${isDeleted ? "#fdba74" : "#7c2d12"}`,
                  background: isDeleted ? "#f97316" : "rgba(124, 45, 18, 0.92)",
                  color: isDeleted ? "#431407" : "#fed7aa",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
              {sprite.unownLetter && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: isDeleted
                      ? "#fdba74"
                      : isCorrected
                        ? "#a5b4fc"
                        : "#64748b",
                    lineHeight: 1,
                    marginTop: 2,
                  }}
                >
                  {formatUnownLabel(sprite.unownLetter)}
                </span>
              )}
            </button>
          );
        })}

        {/* Add sprite button */}
        <button
          title="Ajouter un sprite à la volée"
          onClick={() => onAddSprite(pokemonKey)}
          style={{
            width: 72,
            height: 72,
            background: "transparent",
            border: "2px dashed #334155",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            fontSize: 24,
            fontWeight: 300,
            flexShrink: 0,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#22c55e";
            (e.currentTarget as HTMLButtonElement).style.color = "#22c55e";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#334155";
            (e.currentTarget as HTMLButtonElement).style.color = "#475569";
          }}
        >
          +
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          color: correctedCount > 0 ? "#818cf8" : "#94a3b8",
        }}
      >
        {correctedCount > 0
          ? `${correctedCount} correction${correctedCount > 1 ? "s" : ""} sur cette fiche`
          : "Aucune correction sur cette fiche"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DevSpritesPage() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [spriteMap, setSpriteMap] = useState<SpriteMap | null>(null);
  const [pokemonNames, setPokemonNames] = useState<
    Record<string, PokemonListEntry>
  >({});
  const [spriteCorrections, setSpriteCorrections] = useState<SpriteCorrections>(
    {},
  );
  const [editingSprite, setEditingSprite] = useState<EditingSpriteState | null>(
    null,
  );
  const [targetPokemonKey, setTargetPokemonKey] = useState("");
  const [editingError, setEditingError] = useState<string | null>(null);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [multipleOnly, setMultipleOnly] = useState(false);
  const [noAnimatedOnly, setNoAnimatedOnly] = useState(false);
  const [brokenOnly, setBrokenOnly] = useState(false);
  const [spriteVariant, setSpriteVariant] = useState<"normal" | "shiny">(
    "normal",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualAdditions, setManualAdditions] = useState<ManualAdditions>({});
  const [deletedSpriteUrls, setDeletedSpriteUrls] = useState<Set<string>>(
    new Set(),
  );
  const [addingToKey, setAddingToKey] = useState<string | null>(null);
  const [addUrl, setAddUrl] = useState("");
  const [addVariant, setAddVariant] = useState<"normal" | "shiny">("normal");

  useEffect(() => {
    async function load() {
      try {
        const listRes = await fetch(publicPath("/data/pokemon-list.json"));
        if (!listRes.ok) throw new Error("Failed to fetch data files");

        const list: { pokemon: PokemonListEntry[] } = await listRes.json();

        const mergedMapping: Record<string, SpriteEntry[]> = {};

        const pushSprite = (key: string, entry: SpriteEntry) => {
          if (!mergedMapping[key]) mergedMapping[key] = [];
          if (
            mergedMapping[key].some((existing) => existing.url === entry.url)
          ) {
            return;
          }
          mergedMapping[key].push(entry);
        };

        // Source 1: pokemon-list alternatives.
        // Source 2: always include static sprite from pokemon-list for comparison/corrections.
        for (const p of list.pokemon) {
          const normalDefault =
            p.sprites?.normal?.default ??
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
          const shinyDefault =
            p.sprites?.shiny?.default ?? toPokeApiShinyUrl(normalDefault);

          pushSprite(p.name, {
            alt: `Static fallback ${p.name}`,
            sourceName: `pokemon-list-static-${p.name}`,
            normalizedSource: `pokemon-list-static-${p.name}`,
            file: getFileNameFromUrl(normalDefault),
            url: normalDefault,
            dexId: p.id,
            candidates: [p.name],
            spriteVariant: "normal",
            provider: "pokemon-list-static",
            isStaticFallback: true,
          });

          pushSprite(p.name, {
            alt: `Static shiny fallback ${p.name}`,
            sourceName: `pokemon-list-static-shiny-${p.name}`,
            normalizedSource: `pokemon-list-static-shiny-${p.name}`,
            file: getFileNameFromUrl(shinyDefault),
            url: shinyDefault,
            dexId: p.id,
            candidates: [p.name],
            spriteVariant: "shiny",
            provider: "pokemon-list-static",
            isStaticFallback: true,
          });

          // Also add alternatives from new format
          for (const altUrl of p.sprites?.normal?.alternatives ?? []) {
            pushSprite(p.name, {
              alt: `Alternative ${p.name}`,
              sourceName: `pokemon-list-alt-${p.name}`,
              normalizedSource: `pokemon-list-alt-${p.name}`,
              file: getFileNameFromUrl(altUrl),
              url: altUrl,
              dexId: p.id,
              candidates: [p.name],
              spriteVariant: "normal",
              provider: "animated-catalog",
              isStaticFallback: false,
            });
          }
          for (const altUrl of p.sprites?.shiny?.alternatives ?? []) {
            pushSprite(p.name, {
              alt: `Alternative shiny ${p.name}`,
              sourceName: `pokemon-list-alt-shiny-${p.name}`,
              normalizedSource: `pokemon-list-alt-shiny-${p.name}`,
              file: getFileNameFromUrl(altUrl),
              url: altUrl,
              dexId: p.id,
              candidates: [p.name],
              spriteVariant: "shiny",
              provider: "animated-catalog",
              isStaticFallback: false,
            });
          }
        }

        const mergedSpriteMap: SpriteMap = {
          generatedAt: new Date().toISOString(),
          stats: {
            csvRows: 0,
            mappedSprites: Object.values(mergedMapping).reduce(
              (acc, sprites) => acc + sprites.length,
              0,
            ),
            knownKeysMatched: Object.keys(mergedMapping).length,
            unmatchedSprites: 0,
          },
          mapping: mergedMapping,
        };

        setSpriteMap(mergedSpriteMap);

        const nameMap: Record<string, PokemonListEntry> = {};
        for (const p of list.pokemon) {
          nameMap[p.name] = p;
        }
        setPokemonNames(nameMap);

        setSpriteCorrections(loadCorrections());
        setManualAdditions(loadAdditions());
        setDeletedSpriteUrls(new Set(loadDeletedSpriteUrls()));
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const spriteIndexes = useMemo(() => {
    const originalKeyByUrl: Record<string, string> = {};
    const spriteByUrl: Record<string, SpriteEntry> = {};

    if (!spriteMap) {
      return { originalKeyByUrl, spriteByUrl };
    }

    for (const [pokemonKey, sprites] of Object.entries(spriteMap.mapping)) {
      for (const sprite of sprites) {
        if (!originalKeyByUrl[sprite.url]) {
          originalKeyByUrl[sprite.url] = pokemonKey;
        }
        if (!spriteByUrl[sprite.url]) {
          spriteByUrl[sprite.url] = sprite;
        }
      }
    }

    return { originalKeyByUrl, spriteByUrl };
  }, [spriteMap]);

  const effectiveMapping = useMemo(() => {
    const mapping: Record<string, SpriteEntry[]> = {};

    if (!spriteMap) {
      return mapping;
    }

    const pushSprite = (key: string, sprite: SpriteEntry) => {
      if (!mapping[key]) {
        mapping[key] = [];
      }
      if (mapping[key].some((existing) => existing.url === sprite.url)) {
        return;
      }
      mapping[key].push(sprite);
    };

    for (const [originalKey, sprites] of Object.entries(spriteMap.mapping)) {
      for (const sprite of sprites) {
        const correctedTarget = spriteCorrections[sprite.url];
        const targetKey =
          correctedTarget && correctedTarget.trim().length > 0
            ? correctedTarget
            : originalKey;

        pushSprite(targetKey, sprite);
      }
    }

    return mapping;
  }, [spriteMap, spriteCorrections]);

  const variantFilteredMapping = useMemo(() => {
    const mapping: Record<string, SpriteEntry[]> = {};

    for (const [key, sprites] of Object.entries(effectiveMapping)) {
      const filteredSprites = sprites.filter((sprite) => {
        if (spriteVariant === "normal") {
          return sprite.spriteVariant !== "shiny";
        }
        return sprite.spriteVariant === "shiny";
      });

      if (filteredSprites.length > 0) {
        mapping[key] = filteredSprites;
      }
    }

    return mapping;
  }, [effectiveMapping, spriteVariant]);

  const totalCorrections = useMemo(() => {
    return Object.entries(spriteCorrections).filter(([url, targetKey]) => {
      const originalKey = spriteIndexes.originalKeyByUrl[url];
      return Boolean(originalKey) && targetKey !== originalKey;
    }).length;
  }, [spriteCorrections, spriteIndexes.originalKeyByUrl]);

  const allPokemonKeys = useMemo(() => {
    return Object.keys(pokemonNames).sort((a, b) => a.localeCompare(b));
  }, [pokemonNames]);

  const entries = useMemo(() => {
    if (!spriteMap) return [];

    // Include ALL known pokemon, even those with 0 sprites for current variant
    const allKeys = new Set([
      ...Object.keys(variantFilteredMapping),
      ...Object.keys(pokemonNames),
    ]);

    return Array.from(allKeys)
      .map((key) => {
        const mapSprites = variantFilteredMapping[key] ?? [];
        const manualSprites = (manualAdditions[key] ?? []).filter(
          (s) => s.spriteVariant === spriteVariant,
        );
        return [key, [...mapSprites, ...manualSprites]] as [
          string,
          SpriteEntry[],
        ];
      })
      .filter(([key, sprites]) => {
        const hasAnimated = sprites.some((sprite) =>
          isAnimatedSpriteEntry(sprite),
        );
        const hasStaticFallback = sprites.some(
          (sprite) => sprite.isStaticFallback,
        );

        if (
          noAnimatedOnly &&
          sprites.length > 0 &&
          (hasAnimated || !hasStaticFallback)
        )
          return false;
        if (multipleOnly && sprites.length < 2) return false;
        if (brokenOnly && !sprites.some((s) => brokenUrls.has(s.url)))
          return false;
        if (search) {
          const q = search.toLowerCase();
          const name = pokemonNames[key];
          if (
            !key.includes(q) &&
            !name?.names?.fr?.toLowerCase().includes(q) &&
            !name?.names?.en?.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [
    spriteMap,
    variantFilteredMapping,
    pokemonNames,
    manualAdditions,
    spriteVariant,
    noAnimatedOnly,
    multipleOnly,
    brokenOnly,
    brokenUrls,
    search,
  ]);

  const totalPokemon = spriteMap
    ? Object.keys(variantFilteredMapping).length
    : 0;
  const multipleCount = spriteMap
    ? Object.values(variantFilteredMapping).filter((s) => s.length > 1).length
    : 0;
  const noAnimatedCount = spriteMap
    ? Object.values(variantFilteredMapping).filter(
        (sprites) =>
          !sprites.some((sprite) => isAnimatedSpriteEntry(sprite)) &&
          sprites.some((sprite) => sprite.isStaticFallback),
      ).length
    : 0;
  const brokenCount = spriteMap
    ? Object.values(variantFilteredMapping).filter((sprites) =>
        sprites.some((s) => brokenUrls.has(s.url)),
      ).length
    : 0;
  const correctedByKey = useMemo(() => {
    const byKey: Record<string, number> = {};
    for (const [url, targetKey] of Object.entries(spriteCorrections)) {
      const originalKey = spriteIndexes.originalKeyByUrl[url];
      if (!originalKey || originalKey === targetKey) continue;

      const sprite = spriteIndexes.spriteByUrl[url];
      if (spriteVariant === "normal" && sprite?.spriteVariant === "shiny") {
        continue;
      }
      if (spriteVariant === "shiny" && sprite?.spriteVariant !== "shiny") {
        continue;
      }

      byKey[targetKey] = (byKey[targetKey] ?? 0) + 1;
    }
    return byKey;
  }, [
    spriteCorrections,
    spriteIndexes.originalKeyByUrl,
    spriteIndexes.spriteByUrl,
    spriteVariant,
  ]);

  const handleSpriteError = useCallback((url: string) => {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev;
      return new Set([...prev, url]);
    });
  }, []);

  const openSpriteEditor = useCallback(
    (currentKey: string, sprite: SpriteEntry) => {
      const originalKey =
        spriteIndexes.originalKeyByUrl[sprite.url] ?? currentKey;
      const currentTarget = spriteCorrections[sprite.url] ?? currentKey;
      setEditingSprite({ sprite, currentKey, originalKey });
      setTargetPokemonKey(currentTarget);
      setEditingError(null);
    },
    [spriteCorrections, spriteIndexes.originalKeyByUrl],
  );

  const closeSpriteEditor = useCallback(() => {
    setEditingSprite(null);
    setTargetPokemonKey("");
    setEditingError(null);
  }, []);

  const applySpriteCorrection = useCallback(() => {
    if (!editingSprite) return;

    const normalizedTarget = normalizePokemonKey(targetPokemonKey);
    if (!normalizedTarget) {
      setEditingError("Le nom technique ne peut pas etre vide.");
      return;
    }

    setSpriteCorrections((prev) => {
      const next = { ...prev };
      if (normalizedTarget === editingSprite.originalKey) {
        delete next[editingSprite.sprite.url];
      } else {
        next[editingSprite.sprite.url] = normalizedTarget;
      }
      saveCorrections(next);
      return next;
    });

    closeSpriteEditor();
  }, [closeSpriteEditor, editingSprite, targetPokemonKey]);

  function handleAddSprite(key: string) {
    setAddingToKey(key);
    setAddUrl("");
    setAddVariant(spriteVariant);
  }

  function confirmAddSprite() {
    if (!addingToKey || !addUrl.trim()) return;
    const newEntry: SpriteEntry = {
      url: addUrl.trim(),
      file: addUrl.trim().split("/").pop() ?? "manual",
      alt: addingToKey,
      sourceName: "manual",
      normalizedSource: "manual",
      dexId: pokemonNames[addingToKey]?.id ?? 0,
      candidates: [],
      spriteVariant: addVariant,
      provider: "manual",
    };
    setManualAdditions((prev) => {
      const updated = {
        ...prev,
        [addingToKey]: [...(prev[addingToKey] ?? []), newEntry],
      };
      saveAdditions(updated);
      return updated;
    });
    setAddingToKey(null);
    setAddUrl("");
  }

  const handleDeleteSprite = useCallback(
    (pokemonKey: string, sprite: SpriteEntry) => {
      if (sprite.provider === "manual") {
        setManualAdditions((prev) => {
          const current = prev[pokemonKey] ?? [];
          const nextSprites = current.filter(
            (entry) => entry.url !== sprite.url,
          );

          if (nextSprites.length === current.length) {
            return prev;
          }

          const updated = { ...prev };
          if (nextSprites.length > 0) {
            updated[pokemonKey] = nextSprites;
          } else {
            delete updated[pokemonKey];
          }
          saveAdditions(updated);
          return updated;
        });
        setDeletedSpriteUrls((prev) => {
          if (!prev.has(sprite.url)) return prev;
          const next = new Set(prev);
          next.delete(sprite.url);
          saveDeletedSpriteUrls(Array.from(next));
          return next;
        });
        return;
      }

      setDeletedSpriteUrls((prev) => {
        const next = new Set(prev);
        if (next.has(sprite.url)) {
          next.delete(sprite.url);
        } else {
          next.add(sprite.url);
        }
        saveDeletedSpriteUrls(Array.from(next));
        return next;
      });
    },
    [],
  );

  function handleExport() {
    const corrections = Object.entries(spriteCorrections)
      .map(([url, targetKey]) => {
        const originalKey = spriteIndexes.originalKeyByUrl[url];
        if (!originalKey || originalKey === targetKey) return null;

        const sprite = spriteIndexes.spriteByUrl[url];
        return {
          url,
          file: sprite?.file ?? getFileNameFromUrl(url),
          sourceName: sprite?.sourceName ?? null,
          provider: sprite?.provider ?? null,
          spriteVariant: sprite?.spriteVariant ?? null,
          fromPokemonKey: originalKey,
          toPokemonKey: targetKey,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const additions = Object.entries(manualAdditions).flatMap(
      ([key, sprites]) =>
        sprites.map((s) => ({
          pokemonKey: key,
          url: s.url,
          file: s.file,
          spriteVariant: s.spriteVariant ?? "normal",
        })),
    );

    const output = {
      generatedAt: new Date().toISOString(),
      note: "Manual sprite-to-pokemon corrections exported from dev sprites page",
      totalCorrections: corrections.length,
      corrections,
      totalManualAdditions: additions.length,
      manualAdditions: additions,
      totalDeletedSprites: deletedSpriteUrls.size,
      deletedSprites: Array.from(deletedSpriteUrls).map((url) => {
        const sprite = spriteIndexes.spriteByUrl[url];
        return {
          url,
          file: sprite?.file ?? getFileNameFromUrl(url),
          sourceName: sprite?.sourceName ?? null,
          provider: sprite?.provider ?? null,
          spriteVariant: sprite?.spriteVariant ?? null,
        };
      }),
    };
    downloadJson(output, "sprite-pokemon-corrections.json");
  }

  function handleReset() {
    if (
      !confirm(
        "Reinitialiser toutes les corrections, additions manuelles et suppressions ? Cette action est irreversible.",
      )
    )
      return;
    setSpriteCorrections({});
    saveCorrections({});
    setManualAdditions({});
    saveAdditions({});
    setDeletedSpriteUrls(new Set());
    saveDeletedSpriteUrls([]);
  }

  if (!isHydrated || loading) {
    return (
      <div
        suppressHydrationWarning
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 18,
          fontFamily: "monospace",
        }}
      >
        Chargement des sprites…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontSize: 16,
          fontFamily: "monospace",
          padding: 32,
        }}
      >
        Erreur : {error}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f1f5f9",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#fbbf24" }}>
            🎨 Sprite Picker
          </span>
          <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>
            DEV ONLY
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 12,
            color: "#94a3b8",
            flexWrap: "wrap",
          }}
        >
          <span>
            <b style={{ color: "#f1f5f9" }}>{totalPokemon}</b> Pokémon
          </span>
          <span>
            <b style={{ color: "#fbbf24" }}>{multipleCount}</b> avec doublons
          </span>
          <span>
            <b style={{ color: "#38bdf8" }}>{noAnimatedCount}</b> sans animé
          </span>
          <span>
            <b style={{ color: "#22c55e" }}>{totalCorrections}</b> corrigés
          </span>
          <span>
            <b style={{ color: "#ef4444" }}>{brokenCount}</b> cassés
          </span>
          <span>
            <b style={{ color: "#94a3b8" }}>{entries.length}</b> affichés
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "3px",
          }}
        >
          <button
            onClick={() => setSpriteVariant("normal")}
            style={{
              background:
                spriteVariant === "normal" ? "#2563eb" : "transparent",
              border: "none",
              borderRadius: 6,
              color: spriteVariant === "normal" ? "#dbeafe" : "#94a3b8",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Normal
          </button>
          <button
            onClick={() => setSpriteVariant("shiny")}
            style={{
              background: spriteVariant === "shiny" ? "#16a34a" : "transparent",
              border: "none",
              borderRadius: 6,
              color: spriteVariant === "shiny" ? "#dcfce7" : "#94a3b8",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Shiny
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleExport}
          style={{
            background: "#166534",
            border: "1px solid #22c55e",
            borderRadius: 8,
            color: "#22c55e",
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⬇ Exporter JSON
        </button>
        <button
          onClick={handleReset}
          style={{
            background: "#1e293b",
            border: "1px solid #475569",
            borderRadius: 8,
            color: "#94a3b8",
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          padding: "12px 20px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          borderBottom: "1px solid #1e293b",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Rechercher un Pokémon…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#f1f5f9",
            padding: "6px 12px",
            fontSize: 13,
            outline: "none",
            width: 240,
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontSize: 13,
            color: "#94a3b8",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={multipleOnly}
            onChange={(e) => setMultipleOnly(e.target.checked)}
            style={{ accentColor: "#fbbf24" }}
          />
          Doublons uniquement
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontSize: 13,
            color: "#94a3b8",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={noAnimatedOnly}
            onChange={(e) => setNoAnimatedOnly(e.target.checked)}
            style={{ accentColor: "#38bdf8" }}
          />
          Sans animé uniquement
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontSize: 13,
            color: "#94a3b8",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={brokenOnly}
            onChange={(e) => setBrokenOnly(e.target.checked)}
            style={{ accentColor: "#ef4444" }}
          />
          Cassés (404) uniquement
        </label>
      </div>

      {/* ── Grid ── */}
      <div
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {entries.map(([key, sprites]) => {
          const info = pokemonNames[key];
          const localizedName = info?.names?.fr || info?.names?.en || key;
          const displayName = `${localizedName} (${key})`;
          return (
            <SpriteCard
              key={key}
              pokemonKey={key}
              sprites={sprites}
              displayName={displayName}
              onOpenEditor={openSpriteEditor}
              correctedCount={correctedByKey[key] ?? 0}
              isSpriteCorrected={(sprite) => {
                const originalKey = spriteIndexes.originalKeyByUrl[sprite.url];
                return Boolean(originalKey && originalKey !== key);
              }}
              onSpriteError={handleSpriteError}
              brokenUrls={brokenUrls}
              onAddSprite={handleAddSprite}
              deletedSpriteUrls={deletedSpriteUrls}
              onDeleteSprite={handleDeleteSprite}
            />
          );
        })}
        {entries.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              color: "#475569",
              padding: 60,
              fontSize: 16,
            }}
          >
            Aucun résultat
          </div>
        )}
      </div>

      {addingToKey && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(2, 6, 23, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setAddingToKey(null)}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc" }}>
              Ajouter un sprite pour{" "}
              <span style={{ color: "#22c55e" }}>
                {pokemonNames[addingToKey]?.names?.fr ||
                  pokemonNames[addingToKey]?.names?.en ||
                  addingToKey}
              </span>
            </div>

            {/* Variant selector */}
            <div style={{ display: "flex", gap: 8 }}>
              {(["normal", "shiny"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setAddVariant(v)}
                  style={{
                    background: addVariant === v ? "#166534" : "#1e293b",
                    border: `1px solid ${addVariant === v ? "#22c55e" : "#334155"}`,
                    borderRadius: 6,
                    color: addVariant === v ? "#bbf7d0" : "#94a3b8",
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* URL input */}
            <input
              type="url"
              autoFocus
              placeholder="https://..."
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAddSprite();
                if (e.key === "Escape") setAddingToKey(null);
              }}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#f1f5f9",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />

            {/* Preview */}
            {addUrl.trim() && (
              <div
                style={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: 10,
                  height: 130,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={addUrl.trim()}
                  alt="preview"
                  width={100}
                  height={100}
                  style={{ imageRendering: "pixelated", objectFit: "contain" }}
                />
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 4,
              }}
            >
              <button
                onClick={() => setAddingToKey(null)}
                style={{
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 8,
                  color: "#94a3b8",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmAddSprite}
                disabled={!addUrl.trim()}
                style={{
                  background: addUrl.trim() ? "#166534" : "#1e293b",
                  border: `1px solid ${addUrl.trim() ? "#22c55e" : "#334155"}`,
                  borderRadius: 8,
                  color: addUrl.trim() ? "#bbf7d0" : "#475569",
                  padding: "8px 12px",
                  cursor: addUrl.trim() ? "pointer" : "not-allowed",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSprite && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(2, 6, 23, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={closeSpriteEditor}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gridTemplateColumns: "minmax(200px, 280px) 1fr",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#020617",
                border: "1px solid #1e293b",
                borderRadius: 10,
                minHeight: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editingSprite.sprite.url}
                alt={
                  editingSprite.sprite.alt || editingSprite.sprite.sourceName
                }
                width={220}
                height={220}
                style={{ imageRendering: "pixelated", objectFit: "contain" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                Corriger l&apos;association du sprite
              </div>

              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Source: {editingSprite.sprite.sourceName}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Fichier: {editingSprite.sprite.file}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Pokemon actuel: {editingSprite.currentKey}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Pokemon d&apos;origine: {editingSprite.originalKey}
              </div>

              <label
                htmlFor="sprite-target-key"
                style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}
              >
                Pokemon cible (nom technique)
              </label>
              <input
                id="sprite-target-key"
                list="pokemon-keys-list"
                value={targetPokemonKey}
                onChange={(e) => {
                  setTargetPokemonKey(e.target.value);
                  if (editingError) setEditingError(null);
                }}
                placeholder="ex: greninja"
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  color: "#f1f5f9",
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <datalist id="pokemon-keys-list">
                {allPokemonKeys.map((key) => {
                  const info = pokemonNames[key];
                  const localizedName =
                    info?.names?.fr || info?.names?.en || key;
                  return (
                    <option
                      key={key}
                      value={key}
                    >{`${localizedName} (${key})`}</option>
                  );
                })}
              </datalist>

              {!!targetPokemonKey &&
                !pokemonNames[normalizePokemonKey(targetPokemonKey)] && (
                  <div style={{ fontSize: 11, color: "#fbbf24" }}>
                    Ce nom technique n&apos;existe pas dans pokemon-list.json,
                    verifie la saisie.
                  </div>
                )}

              {editingError && (
                <div style={{ fontSize: 12, color: "#ef4444" }}>
                  {editingError}
                </div>
              )}

              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  onClick={closeSpriteEditor}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 8,
                    color: "#94a3b8",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={applySpriteCorrection}
                  style={{
                    background: "#1d4ed8",
                    border: "1px solid #3b82f6",
                    borderRadius: 8,
                    color: "#bfdbfe",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Appliquer la correction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
