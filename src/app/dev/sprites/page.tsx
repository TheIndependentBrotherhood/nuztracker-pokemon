"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

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
  provider?: "deviantart" | "animated-catalog" | "pokemon-list-static";
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
  sprite: string;
}

interface AnimatedSpriteCatalogEntry {
  id: number;
  name: string;
  generation: number;
  normal?: {
    url?: string;
    available?: boolean;
    source?: string;
  };
  shiny?: {
    url?: string;
    available?: boolean;
    source?: string;
  };
}

interface AnimatedSpriteCatalog {
  sprites: AnimatedSpriteCatalogEntry[];
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
}: {
  pokemonKey: string;
  sprites: SpriteEntry[];
  displayName: string;
  onOpenEditor: (key: string, entry: SpriteEntry) => void;
  correctedCount: number;
  isSpriteCorrected: (sprite: SpriteEntry) => boolean;
  onSpriteError: (url: string) => void;
  brokenUrls: Set<string>;
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
          return (
            <button
              key={idx}
              title={`${sprite.alt || sprite.sourceName}${sprite.provider ? ` [${sprite.provider}]` : ""}${isBroken ? " ⚠ 404" : ""}`}
              onClick={() => onOpenEditor(pokemonKey, sprite)}
              style={{
                background: isBroken
                  ? "#1c0a0a"
                  : isCorrected
                    ? "#312e81"
                    : "#0f172a",
                border: isBroken
                  ? "2px solid #ef4444"
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
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sprite.url}
                alt={sprite.alt || sprite.sourceName}
                width={64}
                height={64}
                style={{ imageRendering: "pixelated", objectFit: "contain" }}
                loading="lazy"
                onError={() => onSpriteError(sprite.url)}
              />
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
              {sprite.unownLetter && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: isCorrected ? "#a5b4fc" : "#64748b",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [mapRes, listRes, animatedRes] = await Promise.all([
          fetch("/data/deviantart-known-pokemon-map.json"),
          fetch("/data/pokemon-list.json"),
          fetch("/data/animated-sprites-bw.json"),
        ]);
        if (!mapRes.ok || !listRes.ok || !animatedRes.ok)
          throw new Error("Failed to fetch data files");

        const map: SpriteMap = await mapRes.json();
        const list: { pokemon: PokemonListEntry[] } = await listRes.json();
        const animatedCatalog: AnimatedSpriteCatalog = await animatedRes.json();

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

        // Source 1: DeviantArt curated mapping.
        for (const [key, sprites] of Object.entries(map.mapping)) {
          for (const sprite of sprites) {
            pushSprite(key, { ...sprite, provider: "deviantart" });
          }
        }

        // Source 2: Animated sprites catalog (BW + external sheets).
        for (const sprite of animatedCatalog.sprites ?? []) {
          const key = sprite.name;
          const normal = sprite.normal;

          if (!normal?.available || !normal.url) continue;

          pushSprite(key, {
            alt: `Animated ${sprite.name}`,
            sourceName: `${normal.source ?? "animated"}-${sprite.name}`,
            normalizedSource: `${normal.source ?? "animated"}-${sprite.name}`,
            file: getFileNameFromUrl(normal.url),
            url: normal.url,
            dexId: sprite.id,
            candidates: [key],
            provider: "animated-catalog",
            ...(key === "unown"
              ? {
                  unownLetter: extractUnownLetterFromAnimatedUrl(normal.url),
                }
              : {}),
          });
        }

        // Source 3: always include static sprite from pokemon-list for comparison/corrections.
        for (const p of list.pokemon) {
          pushSprite(p.name, {
            alt: `Static fallback ${p.name}`,
            sourceName: `pokemon-list-static-${p.name}`,
            normalizedSource: `pokemon-list-static-${p.name}`,
            file: getFileNameFromUrl(p.sprite),
            url: p.sprite,
            dexId: p.id,
            candidates: [p.name],
            provider: "pokemon-list-static",
            isStaticFallback: true,
          });
        }

        const mergedSpriteMap: SpriteMap = {
          generatedAt: new Date().toISOString(),
          stats: {
            csvRows: map.stats.csvRows,
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
    return Object.entries(effectiveMapping)
      .filter(([key, sprites]) => {
        const hasAnimated = sprites.some((sprite) =>
          isAnimatedSpriteEntry(sprite),
        );
        const hasStaticFallback = sprites.some(
          (sprite) => sprite.isStaticFallback,
        );

        if (noAnimatedOnly && (hasAnimated || !hasStaticFallback)) return false;
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
    effectiveMapping,
    noAnimatedOnly,
    multipleOnly,
    brokenOnly,
    brokenUrls,
    search,
    pokemonNames,
  ]);

  const totalPokemon = spriteMap ? Object.keys(effectiveMapping).length : 0;
  const multipleCount = spriteMap
    ? Object.values(effectiveMapping).filter((s) => s.length > 1).length
    : 0;
  const noAnimatedCount = spriteMap
    ? Object.values(effectiveMapping).filter(
        (sprites) =>
          !sprites.some((sprite) => isAnimatedSpriteEntry(sprite)) &&
          sprites.some((sprite) => sprite.isStaticFallback),
      ).length
    : 0;
  const brokenCount = spriteMap
    ? Object.values(effectiveMapping).filter((sprites) =>
        sprites.some((s) => brokenUrls.has(s.url)),
      ).length
    : 0;
  const correctedByKey = useMemo(() => {
    const byKey: Record<string, number> = {};
    for (const [url, targetKey] of Object.entries(spriteCorrections)) {
      const originalKey = spriteIndexes.originalKeyByUrl[url];
      if (!originalKey || originalKey === targetKey) continue;
      byKey[targetKey] = (byKey[targetKey] ?? 0) + 1;
    }
    return byKey;
  }, [spriteCorrections, spriteIndexes.originalKeyByUrl]);

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
          fromPokemonKey: originalKey,
          toPokemonKey: targetKey,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const output = {
      generatedAt: new Date().toISOString(),
      note: "Manual sprite-to-pokemon corrections exported from dev sprites page",
      totalCorrections: corrections.length,
      corrections,
    };
    downloadJson(output, "sprite-pokemon-corrections.json");
  }

  function handleReset() {
    if (
      !confirm(
        "Reinitialiser toutes les corrections ? Cette action est irreversible.",
      )
    )
      return;
    setSpriteCorrections({});
    saveCorrections({});
  }

  if (loading) {
    return (
      <div
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
