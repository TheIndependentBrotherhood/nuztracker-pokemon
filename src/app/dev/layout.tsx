"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const STEPS = [
  { key: "pokemon-list", label: "📦 Pokémon List", file: "pokemon-list.json" },
  { key: "regions", label: "🗺️ Régions", file: "regions.json" },
  { key: "type-charts", label: "📊 Types Charts", file: "type-charts.json" },
  { key: "type-sprites", label: "🎨 Type Sprites", file: "type-sprites.json" },
  {
    key: "abilities",
    label: "⚡ Abilities",
    file: "abilities.json",
  },
  {
    key: "animated-sprites",
    label: "🎬 Sprites animés (Google Sheets)",
    file: "pokemon-list.json",
  },
  {
    key: "sprites",
    label: "🔧 Correcteur de sprites",
    file: "pokemon-list.json",
  },
];

export default function DevLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f1f5f9",
        fontFamily: "monospace",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "#1e293b",
          borderRight: "1px solid #334155",
          padding: "16px 0",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            padding: "0 16px 12px",
            borderBottom: "1px solid #334155",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Dev Tools
          </div>
          <Link
            href="/dev"
            style={{
              color: "#f1f5f9",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Cache Sync
          </Link>
        </div>

        {STEPS.map((step) => {
          const href = `/dev/${step.key === "sprites" ? "sprites" : step.key}`;
          const isActive =
            pathname === href ||
            (pathname === "/dev" && step.key === "pokemon-list");
          return (
            <Link
              key={step.key}
              href={href}
              style={{
                display: "block",
                padding: "8px 16px",
                fontSize: 13,
                color: isActive ? "#38bdf8" : "#94a3b8",
                background: isActive ? "#0f172a" : "transparent",
                borderLeft: isActive
                  ? "3px solid #38bdf8"
                  : "3px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              {step.label}
              {step.file && (
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                  {step.file}
                </div>
              )}
            </Link>
          );
        })}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: 24 }}>{children}</main>
    </div>
  );
}
