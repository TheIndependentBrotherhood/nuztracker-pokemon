"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { Capture } from "@/lib/types";
import {
  fetchPokemon,
  getCaptureSpriteFallbackUrl,
  getCaptureSpriteUrl,
} from "@/lib/pokemon-api";
import { useRunStore } from "@/store/runStore";
import { getCaptureTypesForRun } from "@/lib/capture-types";
import { typeColors } from "@/lib/type-chart";
import PokemonDetailModal from "../modals/PokemonDetailModal";
import { Lang } from "@/i18n/translations";
import {
  useCaptureDisplayLabel,
  useCaptureDisplayName,
} from "@/lib/pokemon-display";

interface CardAction {
  icon: string;
  title: string;
  ariaLabel?: string;
  className: string;
  onClick: (captureId: string) => void;
  sx: Record<string, unknown>;
}

interface Props {
  capture: Capture;
  runId?: string;
  zone?: string;
  lang: Lang;
  background: string;
  borderColor: string;
  hoverBorderColor: string;
  hoverBackground?: string;
  draggableData?: {
    key: string;
    effectAllowed: "move" | "copy";
  };
  actions?: CardAction[];
  opacity?: number;
  imageFilter?: string;
}

export default function PokemonDisplayCard({
  capture,
  runId,
  zone,
  lang,
  background,
  borderColor,
  hoverBorderColor,
  hoverBackground,
  draggableData,
  actions = [],
  opacity,
  imageFilter,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [fallbackTypes, setFallbackTypes] = useState<string[]>([]);
  const { runs } = useRunStore();
  const pokemonDisplayName = useCaptureDisplayName(capture, lang);
  const cardLabel = useCaptureDisplayLabel(capture, lang);
  const run = runId ? runs.find((candidate) => candidate.id === runId) : null;
  const resolvedTypes = getCaptureTypesForRun(capture, run, fallbackTypes);
  const displayedTypes =
    run?.isRandomMode && run.randomizerOptions?.randomizeTypes
      ? resolvedTypes.length > 0
        ? resolvedTypes
        : ["???"]
      : resolvedTypes;
  const genderSymbol =
    capture.gender === "male" ? "♂" : capture.gender === "female" ? "♀" : "";
  const genderColor =
    capture.gender === "male"
      ? "#60a5fa"
      : capture.gender === "female"
        ? "#ec4899"
        : "#94a3b8";
  const tooltipTitle = `${pokemonDisplayName}${capture.nickname ? ` (${capture.nickname})` : ""}${zone ? ` - ${zone}` : ""}`;

  useEffect(() => {
    let cancelled = false;

    const loadTypes = async () => {
      try {
        const data = await fetchPokemon(capture.pokemonId);
        if (!cancelled) {
          setFallbackTypes(data.types.map((entry) => entry.type.name));
        }
      } catch {
        if (!cancelled) {
          setFallbackTypes([]);
        }
      }
    };

    void loadTypes();

    return () => {
      cancelled = true;
    };
  }, [capture.pokemonId]);

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Box
          sx={{
            background,
            border: `2px solid ${borderColor}`,
            borderRadius: "0.75rem",
            p: 1.5,
            cursor: draggableData ? "grab" : "pointer",
            transition: "all 200ms ease",
            position: "relative",
            maxHeight: "154px",
            maxWidth: "120px",
            minHeight: "154px",
            minWidth: "120px",
            display: "flex",
            flexDirection: "column",
            opacity,
            "&:active": draggableData
              ? {
                  cursor: "grabbing",
                }
              : undefined,
            "&:hover": {
              borderColor: hoverBorderColor,
              background: hoverBackground ?? background,
              transform: "translateY(-2px)",
              boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.2)",
              opacity: 1,
            },
            "&:hover .card-action": {
              opacity: 1,
            },
          }}
          onClick={() => setShowDetail(true)}
          draggable={Boolean(draggableData)}
          onDragStart={(event) => {
            if (!draggableData) return;
            event.dataTransfer?.setData(draggableData.key, capture.id);
            event.dataTransfer!.effectAllowed = draggableData.effectAllowed;
          }}
        >
          {capture.isShiny && (
            <Typography
              sx={{ position: "absolute", top: 1, right: 1, fontSize: "1rem" }}
            >
              ✨
            </Typography>
          )}

          {actions.map((action, index) => (
            <Box
              key={`${action.title}-${index}`}
              component="button"
              className={`card-action ${action.className}`}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick(capture.id);
              }}
              sx={{
                opacity: 0,
                transition: "opacity 200ms ease",
                zIndex: 10,
                ...action.sx,
              }}
              title={action.title}
              aria-label={action.ariaLabel ?? action.title}
            >
              {action.icon}
            </Box>
          ))}

          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "84px",
              minWidth: "84px",
              filter: imageFilter,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCaptureSpriteUrl(capture, true)}
              alt={pokemonDisplayName}
              onError={(event) => {
                const fallbackUrl = getCaptureSpriteFallbackUrl(capture);
                if (event.currentTarget.src !== fallbackUrl) {
                  event.currentTarget.src = fallbackUrl;
                }
              }}
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              }}
            />
          </Box>

          <Box sx={{ textAlign: "center", mt: 0.25 }}>
            <Box
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#000",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {cardLabel}
              {genderSymbol && (
                <Typography
                  component="span"
                  sx={{
                    ml: 0.5,
                    fontSize: "0.75rem",
                    fontWeight: 400,
                    color: genderColor,
                  }}
                >
                  {genderSymbol}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                mt: 0.4,
                display: "flex",
                gap: 0.35,
                justifyContent: "center",
                flexWrap: "wrap",
                minHeight: "18px",
              }}
            >
              {displayedTypes.slice(0, 2).map((typeName) => (
                <Box
                  key={`${capture.id}-${typeName}`}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 0.6,
                    minHeight: "14px",
                    borderRadius: "999px",
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    color: "#fff",
                    textTransform: "capitalize",
                    lineHeight: 1,
                    border: "1px solid #000",
                    background:
                      typeColors[typeName] ??
                      (typeName === "???" ? "#64748b" : "#888"),
                  }}
                >
                  {typeName}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Tooltip>

      {showDetail && (
        <PokemonDetailModal
          key={capture.id}
          capture={capture}
          runId={runId}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
