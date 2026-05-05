"use client";

import Link from "next/link";

const STEPS = [
  {
    key: "pokemon-list",
    label: "📦 Pokémon List",
    file: "pokemon-list.json",
    description:
      "Source: PokeAPI. Synchronise la liste des Pokémon et génère le format sprites.{normal,shiny}.{default,alternatives}.",
    duration: "~2min",
  },
  {
    key: "regions",
    label: "🗺️ Régions",
    file: "regions.json",
    description:
      "Source: PokeAPI. Synchronise les régions, locations et location-areas.",
    duration: "~5min",
  },
  {
    key: "type-charts",
    label: "📊 Type Charts",
    file: "type-charts.json",
    description:
      "Source: PokeAPI. Synchronise les tables d'efficacité des types par génération.",
    duration: "~5s",
  },
  {
    key: "type-sprites",
    label: "🎨 Type Sprites",
    file: "type-sprites.json",
    description: "Source: PokeAPI. Synchronise les sprites des types.",
    duration: "~10s",
  },
  {
    key: "abilities",
    label: "⚡ Abilities",
    file: "abilities.json",
    description: "Source: PokeAPI. Synchronise les capacités et immunités.",
    duration: "~5s",
  },
  {
    key: "animated-sprites",
    label: "🎬 Sprites animés (Google Sheets)",
    file: "pokemon-list.json",
    description:
      "Source: Google Sheets (Gen 6-9). Référence sprites: https://www.smogon.com/forums/threads/smogon-sprite-project.3647722/. Propose uniquement les modifications à appliquer dans pokemon-list.json pour les alternatives animées, puis affiche le rapport des sprites manquants.",
    duration: "~1-3min",
  },
  {
    key: "sprites",
    label: "🔧 Correcteur de sprites",
    file: "pokemon-list.json",
    description:
      "Correcteur d'URLs : visualise et réaffecte les sprites de pokemon-list.json en cas d'erreur.",
    duration: "—",
  },
];

export default function DevIndexPage() {
  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          color: "#f1f5f9",
        }}
      >
        Cache Sync — Dev Tools
      </h1>
      <p style={{ color: "#64748b", marginBottom: 32, fontSize: 14 }}>
        Chaque étape permet de synchroniser un fichier de cache depuis les
        sources (PokeAPI, Google Sheets&hellip;), de voir les différences avec
        la version actuelle et d&apos;exporter le nouveau fichier.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {STEPS.map((step) => (
          <Link
            key={step.key}
            href={`/dev/${step.key}`}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                background: "#1e293b",
                borderRadius: 12,
                border: "1px solid #334155",
                padding: 20,
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#38bdf8";
                (e.currentTarget as HTMLDivElement).style.background =
                  "#1a2744";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#334155";
                (e.currentTarget as HTMLDivElement).style.background =
                  "#1e293b";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}
                >
                  {step.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#38bdf8",
                    background: "#0c2340",
                    borderRadius: 6,
                    padding: "2px 8px",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {step.duration}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
                {step.description}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#475569",
                  fontFamily: "monospace",
                }}
              >
                → {step.file}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
