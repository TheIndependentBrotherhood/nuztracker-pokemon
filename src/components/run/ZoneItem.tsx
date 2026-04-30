"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { Zone } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import AddCaptureModal from "./modals/AddCaptureModal";
import { getSpriteUrl } from "@/lib/pokemon-api";

interface Props {
  zone: Zone;
  runId: string;
  isSelected: boolean;
}

const statusConfig: Record<
  string,
  { bgColor: string; dotColor: string; borderColor?: string }
> = {
  "not-visited": {
    bgColor: "transparent",
    dotColor: "#475569",
  },
  visited: {
    bgColor: "rgba(59, 130, 246, 0.05)",
    dotColor: "#60a5fa",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  captured: {
    bgColor: "rgba(16, 185, 129, 0.05)",
    dotColor: "#10b981",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  multiple: {
    bgColor: "rgba(249, 115, 22, 0.05)",
    dotColor: "#fb923c",
  },
};

const cycleLabel: Record<string, string> = {
  "not-visited": "👁",
  visited: "✓",
  captured: "🔴",
};

export default function ZoneItem({ zone, runId, isSelected }: Props) {
  const { setZoneStatus, setSelectedZone } = useRunStore();
  const [showCapture, setShowCapture] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  const visualStatus = zone.captures.length >= 2 ? "multiple" : zone.status;
  const config = statusConfig[visualStatus] ?? statusConfig["not-visited"];

  function handleStatusCycle() {
    if (zone.captures.length > 0 && zone.status === "captured") return;
    const order: Zone["status"][] = ["not-visited", "visited", "captured"];
    const current = order.indexOf(zone.status);
    const next = order[(current + 1) % order.length];
    setZoneStatus(runId, zone.id, next);
  }

  return (
    <>
      <Box
        ref={ref}
        role="button"
        tabIndex={0}
        sx={{
          borderBottom: "1px solid rgba(71, 85, 99, 0.3)",
          p: 1.5,
          transition: "all 150ms ease",
          background: isSelected ? "rgba(59, 130, 246, 0.1)" : config.bgColor,
          outline: isSelected ? "1px solid rgba(59, 130, 246, 0.4)" : "none",
          cursor: "pointer",
          "&:hover": {
            background: !isSelected ? "rgba(30, 41, 59, 0.4)" : undefined,
          },
        }}
        onClick={() => setSelectedZone(isSelected ? null : zone.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedZone(isSelected ? null : zone.id);
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Status dot */}
          <Box
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              flexShrink: 0,
              background: config.dotColor,
            }}
          />

          <Typography
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              flex: 1,
              color: "#e2e8f0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {zone.zoneName}
          </Typography>

          {zone.captures.length > 0 && (
            <Typography
              sx={{ fontSize: "0.75rem", color: "#94a3b8", flexShrink: 0 }}
            >
              {zone.captures.length}
            </Typography>
          )}

          {/* Cycle status */}
          <Box
            component="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusCycle();
            }}
            sx={{
              fontSize: "0.75rem",
              px: 0.75,
              py: 0.25,
              borderRadius: "0.25rem",
              transition: "colors 200ms ease",
              color:
                zone.captures.length > 0 && zone.status === "captured"
                  ? "#475569"
                  : "#cbd5e1",
              background:
                zone.captures.length > 0 && zone.status === "captured"
                  ? "transparent"
                  : "transparent",
              border: "none",
              cursor:
                zone.captures.length > 0 && zone.status === "captured"
                  ? "not-allowed"
                  : "pointer",
              "&:hover": {
                color:
                  zone.captures.length > 0 && zone.status === "captured"
                    ? undefined
                    : "#fff",
                background:
                  zone.captures.length > 0 && zone.status === "captured"
                    ? undefined
                    : "rgba(51, 65, 85, 0.6)",
              },
            }}
            title={
              zone.captures.length > 0 && zone.status === "captured"
                ? "Supprimer les captures pour changer le statut"
                : "Changer le statut"
            }
            aria-label={
              zone.captures.length > 0 && zone.status === "captured"
                ? "Supprimer les captures pour changer le statut"
                : "Changer le statut"
            }
            disabled={zone.captures.length > 0 && zone.status === "captured"}
          >
            {cycleLabel[zone.status]}
          </Box>

          {/* Add capture */}
          <Box
            component="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowCapture(true);
            }}
            sx={{
              fontSize: "0.75rem",
              color: "#60a5fa",
              background: "rgba(59, 130, 246, 0.1)",
              px: 1,
              py: 0.25,
              borderRadius: "0.25rem",
              transition: "all 200ms ease",
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
              "&:hover": {
                color: "#93c5fd",
                background: "rgba(59, 130, 246, 0.2)",
              },
            }}
          >
            + Capturer
          </Box>
        </Box>

        {/* Capture thumbnails */}
        {zone.captures.length > 0 && (
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {zone.captures.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  background: "rgba(51, 65, 85, 0.4)",
                  border: "1px solid rgba(71, 85, 99, 0.3)",
                  borderRadius: "0.5rem",
                  px: 1,
                  py: 0.25,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSpriteUrl(c.pokemonId, c.isShiny)}
                  alt={c.pokemonName}
                  style={{
                    width: "24px",
                    height: "24px",
                    objectFit: "contain",
                  }}
                />
                <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                  {c.nickname || c.pokemonName}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Lv{c.level}
                </Typography>
                {c.isShiny && (
                  <Typography sx={{ fontSize: "0.75rem" }}>✨</Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {showCapture && (
        <AddCaptureModal
          runId={runId}
          zoneId={zone.id}
          zoneName={zone.zoneName}
          onClose={() => setShowCapture(false)}
        />
      )}
    </>
  );
}
