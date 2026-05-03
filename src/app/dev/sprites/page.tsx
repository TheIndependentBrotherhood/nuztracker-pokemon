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

type Preferences = Record<string, SpriteEntry | null>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "dev-sprite-picker-preferences";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Preferences;
  } catch {
    // ignore
  }
  return {};
}

function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpriteCard({
  pokemonKey,
  sprites,
  displayName,
  selected,
  onSelect,
}: {
  pokemonKey: string;
  sprites: SpriteEntry[];
  displayName: string;
  selected: SpriteEntry | null | undefined;
  onSelect: (key: string, entry: SpriteEntry | null) => void;
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

      {/* Sprites row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sprites.map((sprite, idx) => {
          const isSelected = selected?.url === sprite.url;
          return (
            <button
              key={idx}
              title={`${sprite.alt || sprite.sourceName}${sprite.provider ? ` [${sprite.provider}]` : ""}`}
              onClick={() => onSelect(pokemonKey, isSelected ? null : sprite)}
              style={{
                background: isSelected ? "#166534" : "#0f172a",
                border: isSelected ? "2px solid #22c55e" : "2px solid #334155",
                borderRadius: 8,
                padding: 4,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s, background 0.15s",
                flexShrink: 0,
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
              />
              {sprite.unownLetter && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: isSelected ? "#86efac" : "#64748b",
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

      {/* Selection status */}
      {selected !== undefined && (
        <div style={{ fontSize: 11, color: selected ? "#22c55e" : "#94a3b8" }}>
          {selected
            ? `✓ ${selected.sourceName}${selected.unownLetter ? ` (${formatUnownLabel(selected.unownLetter)})` : ""}${selected.provider ? ` [${selected.provider}]` : ""}${selected.isStaticFallback ? " [static fallback]" : ""}`
            : "— aucune sélection"}
        </div>
      )}
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
  const [preferences, setPreferences] = useState<Preferences>({});
  const [search, setSearch] = useState("");
  const [multipleOnly, setMultipleOnly] = useState(false);
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

        // Source 3 (last resort): static sprite from pokemon-list when no animated exists.
        for (const p of list.pokemon) {
          if ((mergedMapping[p.name]?.length ?? 0) > 0) continue;

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

        setPreferences(loadPreferences());
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSelect = useCallback((key: string, entry: SpriteEntry | null) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: entry };
      savePreferences(next);
      return next;
    });
  }, []);

  const entries = useMemo(() => {
    if (!spriteMap) return [];
    return Object.entries(spriteMap.mapping)
      .filter(([key, sprites]) => {
        if (multipleOnly && sprites.length < 2) return false;
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
  }, [spriteMap, multipleOnly, search, pokemonNames]);

  const totalPokemon = spriteMap ? Object.keys(spriteMap.mapping).length : 0;
  const multipleCount = spriteMap
    ? Object.values(spriteMap.mapping).filter((s) => s.length > 1).length
    : 0;
  const selectedCount = Object.values(preferences).filter(Boolean).length;

  function handleExport() {
    const output = {
      generatedAt: new Date().toISOString(),
      note: "Selected default animated sprites per pokemon key (with static fallback only when no animated exists)",
      totalSelected: selectedCount,
      preferences: Object.fromEntries(
        Object.entries(preferences)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([k, v]) => [
            k,
            {
              url: v!.url,
              file: v!.file,
              sourceName: v!.sourceName,
              alt: v!.alt,
              provider: v!.provider,
              isStaticFallback: Boolean(v!.isStaticFallback),
              ...(v!.unownLetter ? { unownLetter: v!.unownLetter } : {}),
            },
          ]),
      ),
    };
    downloadJson(output, "animated-sprite-preferences.json");
  }

  function handleReset() {
    if (
      !confirm(
        "Réinitialiser toutes les sélections ? Cette action est irréversible.",
      )
    )
      return;
    setPreferences({});
    savePreferences({});
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
            <b style={{ color: "#22c55e" }}>{selectedCount}</b> sélectionnés
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
          const displayName = info?.names?.fr || info?.names?.en || key;
          return (
            <SpriteCard
              key={key}
              pokemonKey={key}
              sprites={sprites}
              displayName={displayName}
              selected={preferences[key]}
              onSelect={handleSelect}
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
    </div>
  );
}
