"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import {
  Capture,
  Zone,
  Run,
  SOUL_LINK_PLAYER_COLORS,
  MISSINGNO_POKEMON,
} from "@/lib/types";
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
  run?: Run;
}

function CaptureThumbnail({
  capture,
  lang,
  runId,
  zoneId,
  playerColor,
  playerLabel,
  isPlaceholder,
}: {
  capture: Capture;
  lang: "fr" | "en";
  runId: string;
  zoneId: string;
  playerColor?: string;
  playerLabel?: string;
  isPlaceholder?: boolean;
}) {
  const displayName = useCaptureDisplayName(capture, lang);
  const displayLabel = useCaptureDisplayLabel(capture, lang);
  const { removeCapture } = useRunStore();
  const [showPokemonDetail, setShowPokemonDetail] = useState(false);

  // Determine if this individual capture is lost
  const captureStatus =
    capture.isDead || capture.failedCapture ? "lost" : "captured";
  const captureStyle = statusConfig[captureStatus] ?? statusConfig["captured"];

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
            if (!isPlaceholder) setShowPokemonDetail(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              if (!isPlaceholder) setShowPokemonDetail(true);
            }
          }}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.2,
            width: "88px",
            height: "88px",
            background: isPlaceholder
              ? "rgba(148, 163, 184, 0.15)"
              : captureStyle.bgColor || "rgba(51, 65, 85, 0.4)",
            border: playerColor
              ? `2px solid ${playerColor}`
              : `1px solid ${captureStyle.borderColor ?? "rgba(71, 85, 99, 0.3)"}`,
            borderRadius: "0.5rem",
            cursor: isPlaceholder ? "default" : "pointer",
            transition: "all 150ms ease",
            opacity: isPlaceholder ? 0.55 : 1,
            "&:hover": isPlaceholder
              ? {}
              : {
                  background: captureStyle.bgColor || "rgba(51, 65, 85, 0.55)",
                  borderColor:
                    playerColor ??
                    captureStyle.borderColor ??
                    "rgba(71, 85, 99, 0.45)",
                },
          }}
          aria-label={displayName}
        >
          {playerLabel && (
            <Typography
              sx={{
                fontSize: "0.5rem",
                fontWeight: 700,
                color: playerColor ?? "#64748b",
                lineHeight: 1,
              }}
            >
              {playerLabel}
            </Typography>
          )}
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
              width: "44px",
              height: "44px",
              objectFit: "contain",
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.1,
              minHeight: "0.65rem",
            }}
          >
            {!isPlaceholder && capture.isShiny && (
              <Typography sx={{ fontSize: "0.6rem", lineHeight: 1 }}>
                ✨
              </Typography>
            )}
            {!isPlaceholder && (
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: "#1e293b",
                  lineHeight: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "60px",
                }}
              >
                {displayLabel}
              </Typography>
            )}
            {isPlaceholder && (
              <Typography
                sx={{ fontSize: "0.6rem", color: "#94a3b8", lineHeight: 1 }}
              >
                ???
              </Typography>
            )}
          </Box>
        </Box>

        {/* Delete button — not shown for placeholders */}
        {!isPlaceholder && (
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
        )}
      </Box>

      {!isPlaceholder && showPokemonDetail && (
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
  captured: {
    bgColor: "rgba(16, 185, 129, 0.05)",
    dotColor: "#10b981",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  lost: {
    bgColor: "rgba(127, 29, 29, 0.1)",
    dotColor: "#991b1b",
    borderColor: "rgba(127, 29, 29, 0.4)",
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
  run,
}: Props) {
  const { setSelectedZone } = useRunStore();
  const [showCapture, setShowCapture] = useState(false);
  const [defaultPlayerIndex, setDefaultPlayerIndex] = useState<
    number | undefined
  >(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  const tr = translations;

  const isSoulLink = Boolean(
    run?.isSoulLinkMode && run?.soulLinkPlayers?.length,
  );
  const players = run?.soulLinkPlayers ?? [];

  // Determine if captures are full
  const capturesFull = isSoulLink
    ? players.every((player) =>
        zone.captures.some((c) => (c.playerIndex ?? 0) === player.playerIndex),
      )
    : zone.captures.length >= (isShinyHuntMode ? 2 : 1);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  const visualStatus =
    zone.captures.length >= 2 && !isSoulLink ? "multiple" : zone.status;
  const config = statusConfig[visualStatus] ?? statusConfig["not-visited"];

  // Find the first player without a capture in this zone (for pre-filling)
  const nextPlayerWithoutCapture = isSoulLink
    ? players.find(
        (player) =>
          !zone.captures.some(
            (c) => (c.playerIndex ?? 0) === player.playerIndex,
          ),
      )
    : undefined;

  function openCapture(playerIndex?: number) {
    setDefaultPlayerIndex(playerIndex);
    setShowCapture(true);
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
            {/* Add capture button(s) */}
            {!capturesFull && (
              <Box
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCapture(nextPlayerWithoutCapture?.playerIndex);
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
        {isSoulLink ? (
          // Soul Link: one slot per player (2x2 grid)
          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0.75,
            }}
          >
            {players.map((player) => {
              const playerCapture = zone.captures.find(
                (c) => (c.playerIndex ?? 0) === player.playerIndex,
              );
              const color = SOUL_LINK_PLAYER_COLORS[player.playerIndex];
              const label = `P${player.playerIndex + 1}`;
              if (playerCapture) {
                return (
                  <CaptureThumbnail
                    key={player.id}
                    capture={playerCapture}
                    lang={lang}
                    runId={runId}
                    zoneId={zone.id}
                    playerColor={color}
                    playerLabel={label}
                  />
                );
              }
              // Placeholder (MissingNo)
              const placeholder: Capture = {
                id: `placeholder-${player.id}`,
                pokemon: MISSINGNO_POKEMON,
                gender: "unknown",
                isShiny: false,
                isDead: false,
                createdAt: 0,
                playerIndex: player.playerIndex,
              };
              return (
                <Box
                  key={player.id}
                  component="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCapture(player.playerIndex);
                  }}
                  sx={{
                    background: "none",
                    border: "none",
                    p: 0,
                    cursor: "pointer",
                  }}
                >
                  <CaptureThumbnail
                    capture={placeholder}
                    lang={lang}
                    runId={runId}
                    zoneId={zone.id}
                    playerColor={color}
                    playerLabel={label}
                    isPlaceholder
                  />
                </Box>
              );
            })}
          </Box>
        ) : (
          zone.captures.length > 0 && (
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
          )
        )}
      </Box>

      {showCapture && (
        <AddCaptureModal
          runId={runId}
          zoneId={zone.id}
          zoneName={zone.zoneName}
          zoneNames={zone.zoneNames}
          forceShiny={
            !isSoulLink &&
            isShinyHuntMode &&
            zone.captures.length === 1 &&
            !zone.captures[0].isShiny
          }
          defaultPlayerIndex={defaultPlayerIndex}
          onClose={() => setShowCapture(false)}
        />
      )}
    </>
  );
}
