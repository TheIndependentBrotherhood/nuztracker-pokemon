"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { Capture, Zone } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import AddCaptureModal from "../modals/AddCaptureModal";
import PokemonDetailModal from "../modals/PokemonDetailModal";
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
  runId,
  zoneId,
}: {
  capture: Capture;
  lang: "fr" | "en";
  runId: string;
  zoneId: string;
}) {
  const displayName = useCaptureDisplayName(capture, lang);
  const displayLabel = useCaptureDisplayLabel(capture, lang);
  const { removeCapture } = useRunStore();
  const [showPokemonDetail, setShowPokemonDetail] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeCapture(runId, zoneId, capture.id);
  };

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "inline-block",
        }}
      >
        <Box
          component="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPokemonDetail(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setShowPokemonDetail(true);
            }
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            background: "rgba(51, 65, 85, 0.4)",
            border: "1px solid rgba(71, 85, 99, 0.3)",
            borderRadius: "0.5rem",
            px: 1,
            py: 0.25,
            cursor: "pointer",
            transition: "all 150ms ease",
            "&:hover": {
              background: "rgba(51, 65, 85, 0.55)",
              borderColor: "rgba(71, 85, 99, 0.45)",
            },
          }}
          aria-label={displayName}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              capture.selectedSprite?.url ||
              (capture.isShiny
                ? capture.pokemon.sprites.shiny.default
                : capture.pokemon.sprites.normal.default)
            }
            alt={displayName}
            onError={(event) => {
              const fallbackUrl = capture.isShiny
                ? capture.pokemon.sprites.shiny.default
                : capture.pokemon.sprites.normal.default;
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
          {capture.isShiny && (
            <Typography sx={{ fontSize: "0.75rem" }}>✨</Typography>
          )}
        </Box>

        {/* Croix de suppression */}
        <Box
          component="button"
          onClick={handleDelete}
          sx={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            width: "18px",
            height: "18px",
            borderRadius: "999px",
            background: "#ef4444",
            border: "1px solid #dc2626",
            color: "#fff",
            fontSize: "0.65rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 150ms",
            "&:hover": {
              background: "#dc2626",
              transform: "scale(1.2)",
            },
          }}
          aria-label={lang === "fr" ? "Supprimer" : "Delete"}
        >
          ✕
        </Box>
      </Box>

      {showPokemonDetail && (
        <PokemonDetailModal
          key={capture.id}
          pokemonCaptured={capture}
          runId={runId}
          onClose={() => setShowPokemonDetail(false)}
        />
      )}
    </>
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
  lost: {
    bgColor: "rgba(239, 68, 68, 0.1)",
    dotColor: "#dc2626",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  multiple: {
    bgColor: "rgba(249, 115, 22, 0.05)",
    dotColor: "#fb923c",
  },
};

export default function ZoneItem({
  zone,
  runId,
  isSelected,
  isShinyHuntMode,
}: Props) {
  const { setSelectedZone } = useRunStore();
  const [showCapture, setShowCapture] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  const tr = translations;
  const maxCaptures = isShinyHuntMode ? 2 : 1;
  const capturesFull =
    zone.captures.length >= maxCaptures;

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  const visualStatus = zone.captures.length >= 2 ? "multiple" : zone.status;
  const config = statusConfig[visualStatus] ?? statusConfig["not-visited"];

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
                  height: "1.75rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              <CaptureThumbnail
                key={c.id}
                capture={c}
                lang={lang}
                runId={runId}
                zoneId={zone.id}
              />
            ))}
          </Box>
        )}
      </Box>

      {showCapture && (
        <AddCaptureModal
          runId={runId}
          zoneId={zone.id}
          zoneName={zone.zoneName}
          zoneNames={zone.zoneNames}
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
