"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { Capture, Zone } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import AddCaptureModal from "./modals/AddCaptureModal";
import { getSpriteFallbackUrl, getSpriteUrl } from "@/lib/pokemon-api";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import {
  useCaptureDisplayLabel,
  useCaptureDisplayName,
} from "@/lib/pokemon-display";
import { getZoneDisplayName } from "@/lib/zones";

interface Props {
  zone: Zone;
  runId: string;
  isSelected: boolean;
  isShinyHuntMode: boolean;
}

function CaptureThumbnail({
  capture,
  lang,
}: {
  capture: Capture;
  lang: "fr" | "en";
}) {
  const displayName = useCaptureDisplayName(capture, lang);
  const displayLabel = useCaptureDisplayLabel(capture, lang);

  return (
    <Box
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
        src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
        alt={displayName}
        onError={(event) => {
          const fallbackUrl = getSpriteFallbackUrl(
            capture.pokemonId,
            capture.isShiny,
          );
          if (event.currentTarget.src !== fallbackUrl) {
            event.currentTarget.src = fallbackUrl;
          }
        }}
        style={{
          width: "46px",
          height: "46px",
          objectFit: "contain",
        }}
      />
      <Typography sx={{ fontSize: "0.75rem", color: "#1e293b" }}>
        {displayLabel}
      </Typography>
      <Typography sx={{ fontSize: "0.75rem", color: "#475569" }}>
        Lv{capture.level}
      </Typography>
      {capture.isShiny && (
        <Typography sx={{ fontSize: "0.75rem" }}>✨</Typography>
      )}
    </Box>
  );
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

export default function ZoneItem({
  zone,
  runId,
  isSelected,
  isShinyHuntMode,
}: Props) {
  const { setZoneStatus, setSelectedZone } = useRunStore();
  const [showCapture, setShowCapture] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  const tr = translations;
  const deleteCapturesToChange = t(tr.zoneItem.deleteCapturesToChange, lang);
  const changeStatus = t(tr.zoneItem.changeStatus, lang);
  const maxCaptures = isShinyHuntMode ? 2 : 1;
  const capturesFull = zone.captures.length >= maxCaptures;

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
            background: !isSelected ? "rgba(59, 130, 246, 0.08)" : undefined,
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minHeight: "2rem",
          }}
        >
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
              color: "#1e293b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getZoneDisplayName(zone, lang)}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            {zone.captures.length > 0 && (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "#334155",
                  px: 0.75,
                  py: 0.2,
                  borderRadius: "999px",
                  border: "1px solid rgba(71, 85, 99, 0.35)",
                  background: "rgba(255, 255, 255, 0.65)",
                  fontWeight: 700,
                  minWidth: "1.5rem",
                  textAlign: "center",
                }}
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
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "0.5rem",
                transition: "all 200ms ease",
                color:
                  zone.captures.length > 0 && zone.status === "captured"
                    ? "#94a3b8"
                    : "#334155",
                background:
                  zone.captures.length > 0 && zone.status === "captured"
                    ? "rgba(148, 163, 184, 0.1)"
                    : "rgba(255, 255, 255, 0.8)",
                border: "1px solid rgba(71, 85, 99, 0.35)",
                cursor:
                  zone.captures.length > 0 && zone.status === "captured"
                    ? "not-allowed"
                    : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": {
                  color:
                    zone.captures.length > 0 && zone.status === "captured"
                      ? undefined
                      : "#000",
                  background:
                    zone.captures.length > 0 && zone.status === "captured"
                      ? undefined
                      : "rgba(96, 165, 250, 0.2)",
                },
              }}
              title={
                zone.captures.length > 0 && zone.status === "captured"
                  ? deleteCapturesToChange
                  : changeStatus
              }
              aria-label={
                zone.captures.length > 0 && zone.status === "captured"
                  ? deleteCapturesToChange
                  : changeStatus
              }
              disabled={zone.captures.length > 0 && zone.status === "captured"}
            >
              {cycleLabel[zone.status]}
            </Box>

            {/* Add capture */}
            {!capturesFull && (
              <Box
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCapture(true);
                }}
                sx={{
                  fontSize: "0.75rem",
                  color: "#1d4ed8",
                  background: "rgba(59, 130, 246, 0.12)",
                  px: 1,
                  py: 0.35,
                  borderRadius: "0.5rem",
                  transition: "all 200ms ease",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  cursor: "pointer",
                  fontWeight: 600,
                  "&:hover": {
                    color: "#1e40af",
                    background: "rgba(59, 130, 246, 0.2)",
                  },
                }}
                title={t(tr.zoneItem.capture, lang)}
                aria-label={t(tr.zoneItem.capture, lang)}
              >
                {t(tr.zoneItem.capture, lang)}
              </Box>
            )}
          </Box>
        </Box>

        {/* Capture thumbnails */}
        {zone.captures.length > 0 && (
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {zone.captures.map((c) => (
              <CaptureThumbnail key={c.id} capture={c} lang={lang} />
            ))}
          </Box>
        )}
      </Box>

      {showCapture && (
        <AddCaptureModal
          runId={runId}
          zoneId={zone.id}
          zoneName={zone.zoneName}
          forceShiny={
            isShinyHuntMode &&
            zone.captures.length === 1 &&
            !zone.captures[0].isShiny
          }
          onClose={() => setShowCapture(false)}
        />
      )}
    </>
  );
}
