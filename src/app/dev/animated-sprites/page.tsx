"use client";

import { useEffect, useState } from "react";
import SyncPanel from "@/components/dev/SyncPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MissingEntry {
  id: number;
  name: string;
}

interface GenSummary {
  missingAnyAnimatedCount: number;
  missingNormalCount: number;
  missingShinyCount: number;
}

interface GenData {
  missingAnyAnimated: MissingEntry[];
  missingNormal: MissingEntry[];
  missingShiny: MissingEntry[];
}

interface MissingReport {
  generatedAt: string;
  summaryByGeneration: Record<string, GenSummary>;
  byGeneration: Record<string, GenData>;
}

interface PokemonListEntry {
  id: number;
  name: string;
  generation: number;
  sprites?: {
    normal?: { alternatives?: string[] };
    shiny?: { alternatives?: string[] };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GEN_LABELS: Record<string, string> = {
  gen1: "Gen 1 — Kanto",
  gen2: "Gen 2 — Johto",
  gen3: "Gen 3 — Hoenn",
  gen4: "Gen 4 — Sinnoh",
  gen5: "Gen 5 — Unova",
  gen6: "Gen 6 — Kalos",
  gen7: "Gen 7 — Alola",
  gen8: "Gen 8 — Galar",
  gen9: "Gen 9 — Paldea",
};

const GEN_ORDER = [
  "gen1",
  "gen2",
  "gen3",
  "gen4",
  "gen5",
  "gen6",
  "gen7",
  "gen8",
  "gen9",
];

function isAnimatedUrl(url: string): boolean {
  return /\.gif(?:$|\?)/i.test(url);
}

function buildMissingReportFromPokemonList(
  pokemon: PokemonListEntry[],
): MissingReport {
  const byGeneration: Record<string, GenData> = Object.fromEntries(
    GEN_ORDER.map((gen) => [
      gen,
      {
        missingAnyAnimated: [],
        missingNormal: [],
        missingShiny: [],
      },
    ]),
  );

  for (const entry of pokemon) {
    const genKey = `gen${entry.generation}`;
    if (!byGeneration[genKey]) continue;

    const hasNormalAnimated = (entry.sprites?.normal?.alternatives ?? []).some(
      isAnimatedUrl,
    );
    const hasShinyAnimated = (entry.sprites?.shiny?.alternatives ?? []).some(
      isAnimatedUrl,
    );
    const info = { id: entry.id, name: entry.name };

    if (!hasNormalAnimated) {
      byGeneration[genKey].missingNormal.push(info);
    }
    if (!hasShinyAnimated) {
      byGeneration[genKey].missingShiny.push(info);
    }
    if (!hasNormalAnimated && !hasShinyAnimated) {
      byGeneration[genKey].missingAnyAnimated.push(info);
    }
  }

  const summaryByGeneration: Record<string, GenSummary> = Object.fromEntries(
    GEN_ORDER.map((gen) => [
      gen,
      {
        missingAnyAnimatedCount: byGeneration[gen].missingAnyAnimated.length,
        missingNormalCount: byGeneration[gen].missingNormal.length,
        missingShinyCount: byGeneration[gen].missingShiny.length,
      },
    ]),
  );

  return {
    generatedAt: new Date().toISOString(),
    summaryByGeneration,
    byGeneration,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PokemonTag({ entry }: { entry: MissingEntry }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        color: "#94a3b8",
        fontFamily: "monospace",
      }}
    >
      <span style={{ color: "#475569" }}>#{entry.id}</span>
      {entry.name}
    </span>
  );
}

function GenSection({
  genKey,
  summary,
  data,
}: {
  genKey: string;
  summary: GenSummary;
  data: GenData;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"any" | "normal" | "shiny">("any");

  const items =
    tab === "any"
      ? data.missingAnyAnimated
      : tab === "normal"
        ? data.missingNormal
        : data.missingShiny;

  const hasAny = data.missingAnyAnimated.length > 0;

  return (
    <div
      style={{
        border: `1px solid ${hasAny ? "#334155" : "#22c55e33"}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: hasAny ? "#1e293b" : "#0d1f14",
          border: "none",
          padding: "12px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 14, color: "#64748b" }}>
          {open ? "▾" : "▸"}
        </span>
        <span
          style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}
        >
          {GEN_LABELS[genKey] ?? genKey}
        </span>
        <span
          style={{
            fontSize: 12,
            color: hasAny ? "#f59e0b" : "#22c55e",
            background: hasAny ? "#1c1400" : "#0d1f14",
            border: `1px solid ${hasAny ? "#f59e0b44" : "#22c55e44"}`,
            borderRadius: 6,
            padding: "2px 10px",
            fontFamily: "monospace",
          }}
        >
          {summary.missingAnyAnimatedCount} sans anim
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#64748b",
            fontFamily: "monospace",
            minWidth: 120,
            textAlign: "right",
          }}
        >
          N:{summary.missingNormalCount} / S:{summary.missingShinyCount}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: 16,
            background: "#0f172a",
            borderTop: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(
              [
                {
                  key: "any",
                  label: `Sans aucune anim (${data.missingAnyAnimated.length})`,
                },
                {
                  key: "normal",
                  label: `Normal manquant (${data.missingNormal.length})`,
                },
                {
                  key: "shiny",
                  label: `Shiny manquant (${data.missingShiny.length})`,
                },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: tab === key ? "#38bdf8" : "#334155",
                  background: tab === key ? "#0c2340" : "transparent",
                  color: tab === key ? "#38bdf8" : "#64748b",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <div style={{ color: "#22c55e", fontSize: 13 }}>
              ✅ Aucun sprite manquant dans cette catégorie
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {items.map((entry) => (
                <PokemonTag key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnimatedSpritesPage() {
  const [report, setReport] = useState<MissingReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/pokemon-list.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((data: { pokemon?: PokemonListEntry[] }) => {
        setReport(buildMissingReportFromPokemonList(data.pokemon ?? []));
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const totalMissing = report
    ? GEN_ORDER.reduce(
        (acc, g) =>
          acc + (report.summaryByGeneration[g]?.missingAnyAnimatedCount ?? 0),
        0,
      )
    : 0;

  const totalNormal = report
    ? GEN_ORDER.reduce(
        (acc, g) =>
          acc + (report.summaryByGeneration[g]?.missingNormalCount ?? 0),
        0,
      )
    : 0;

  const totalShiny = report
    ? GEN_ORDER.reduce(
        (acc, g) =>
          acc + (report.summaryByGeneration[g]?.missingShinyCount ?? 0),
        0,
      )
    : 0;

  return (
    <div>
      <SyncPanel
        step="animated-sprites"
        title="Sync animated sprites"
        outputFile="pokemon-list.json"
        description="Source: Google Sheets (Gen 6-9). Référence sprites: https://www.smogon.com/forums/threads/smogon-sprite-project.3647722/. Propose les alternatives animées à fusionner dans pokemon-list.json, puis permet d'exporter la nouvelle version."
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 32,
          marginBottom: 6,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#f1f5f9",
            margin: 0,
          }}
        >
          🎬 Sprites Animés
        </h1>
        <span
          style={{
            fontSize: 12,
            color: "#64748b",
            fontFamily: "monospace",
            background: "#1e293b",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          → calculé depuis pokemon-list.json
        </span>
      </div>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 28 }}>
        Sprites animés manquants par génération, calculés directement à partir
        des alternatives de pokemon-list.json.
      </p>

      {error && (
        <div
          style={{
            background: "#1c0a0a",
            border: "1px solid #ef4444",
            borderRadius: 8,
            padding: 12,
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          ❌ {error}
        </div>
      )}

      {!report && !error && (
        <div style={{ color: "#64748b", fontSize: 13 }}>Chargement…</div>
      )}

      {report && (
        <>
          {/* Global summary */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 28,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {[
              {
                label: "Sans anim (any)",
                value: totalMissing,
                color: "#f59e0b",
              },
              {
                label: "Normal manquant",
                value: totalNormal,
                color: "#fb923c",
              },
              {
                label: "Shiny manquant",
                value: totalShiny,
                color: "#c084fc",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: `${color}11`,
                  border: `1px solid ${color}33`,
                  borderRadius: 8,
                  padding: "10px 20px",
                  minWidth: 120,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color }}>
                  {value}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
              </div>
            ))}

            <div
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "#475569",
                alignSelf: "flex-end",
                fontFamily: "monospace",
              }}
            >
              Généré le {new Date(report.generatedAt).toLocaleString("fr-FR")}
            </div>
          </div>

          {/* Mini bar chart */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 32,
              alignItems: "flex-end",
              height: 48,
            }}
          >
            {GEN_ORDER.map((g) => {
              const count =
                report.summaryByGeneration[g]?.missingAnyAnimatedCount ?? 0;
              const maxCount = Math.max(
                ...GEN_ORDER.map(
                  (k) =>
                    report.summaryByGeneration[k]?.missingAnyAnimatedCount ?? 0,
                ),
                1,
              );
              const pct = (count / maxCount) * 100;
              return (
                <div
                  key={g}
                  title={`${GEN_LABELS[g]}: ${count} manquants`}
                  style={{
                    flex: 1,
                    height: `${Math.max(pct, 4)}%`,
                    background:
                      count === 0
                        ? "#22c55e44"
                        : count < 15
                          ? "#f59e0b66"
                          : "#ef444466",
                    borderRadius: "4px 4px 0 0",
                    border: "1px solid",
                    borderColor:
                      count === 0
                        ? "#22c55e44"
                        : count < 15
                          ? "#f59e0b44"
                          : "#ef444444",
                    cursor: "default",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      bottom: -18,
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      fontSize: 9,
                      color: "#475569",
                    }}
                  >
                    {g}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Per-gen sections */}
          {GEN_ORDER.filter((g) => report.byGeneration[g]).map((g) => (
            <GenSection
              key={g}
              genKey={g}
              summary={report.summaryByGeneration[g]}
              data={report.byGeneration[g]}
            />
          ))}
        </>
      )}
    </div>
  );
}
