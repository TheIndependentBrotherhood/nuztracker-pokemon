"use client";

import { useState } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { Capture } from "@/lib/types";
import { getSpriteUrl } from "@/lib/pokemon-api";
import { useRunStore } from "@/store/runStore";
import PokemonDetailModal from "./modals/PokemonDetailModal";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  capture: Capture | null;
  slotIndex: number;
  runId: string;
  zone: string;
}

export default function PokemonCard({
  capture,
  slotIndex,
  runId,
  zone,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { runs, updateTeam } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    const run = runs.find((r) => r.id === runId);
    if (!run || !capture) return;
    updateTeam(
      runId,
      run.team.filter((c) => c.id !== capture.id),
    );
  }

  if (!capture) {
    return (
      <Box
        sx={{
          background: "#f0f4f8",
          border: "2px dashed #cbd5e1",
          borderRadius: "0.75rem",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "154px",
          minWidth: "120px",
          transition: "all 200ms ease",
          "&:hover": {
            borderColor: "#3b82f6",
            background: "#e0f2fe",
          },
        }}
      >
        <Typography
          sx={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}
        >
          {`Slot ${slotIndex + 1}`}
        </Typography>
      </Box>
    );
  }

  const genderSymbol =
    capture.gender === "male" ? "♂" : capture.gender === "female" ? "♀" : "";
  const genderColor =
    capture.gender === "male"
      ? "#60a5fa"
      : capture.gender === "female"
        ? "#ec4899"
        : "#94a3b8";

  const tooltipTitle = `${capture.pokemonName}${capture.nickname ? ` (${capture.nickname})` : ""}${zone ? ` - ${zone}` : ""}`;

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Box
          sx={{
            background: "#fff3cd",
            border: "2px solid #f59e0b",
            borderRadius: "0.75rem",
            p: 1.5,
            cursor: "pointer",
            transition: "all 200ms ease",
            position: "relative",
            maxHeight: "154px",
            maxWidth: "120px",
            minHeight: "154px",
            minWidth: "120px",
            display: "flex",
            flexDirection: "column",
            "&:hover": {
              borderColor: "#3b82f6",
              transform: "translateY(-2px)",
              boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.2)",
            },
            "&:hover .remove-btn": {
              opacity: 1,
            },
          }}
          onClick={() => setShowDetail(true)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer?.setData("pokemonId", capture.id);
            e.dataTransfer!.effectAllowed = "move";
          }}
        >
          {capture.isShiny && (
            <Typography
              sx={{ position: "absolute", top: 1, right: 1, fontSize: "1rem" }}
            >
              ✨
            </Typography>
          )}
          <Box
            component="button"
            className="remove-btn"
            onClick={handleRemove}
            sx={{
              position: "absolute",
              top: 3,
              left: 3,
              fontSize: "0.75rem",
              color: "#dc2626",
              background: "rgba(255, 255, 255, 0.9)",
              borderRadius: "0.25rem",
              px: 0.5,
              py: 0.25,
              opacity: 0,
              transition: "opacity 200ms ease",
              border: "1px solid #f87171",
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                color: "#991b1b",
                background: "#fca5a5",
              },
            }}
            title={t(tr.pokemonCard.removeFromTeam, lang)}
          >
            ✕
          </Box>

          {/* Image container - properly centered */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "84px",
              minWidth: "84px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
              alt={capture.pokemonName}
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              }}
            />
          </Box>

          {/* Info section */}
          <Box sx={{ textAlign: "center", mt: 0.5 }}>
            <Box
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#000",
                truncate: true,
                lineHeight: 1.2,
              }}
            >
              {capture.nickname || capture.pokemonName}
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
            {capture.nickname && (
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "#666",
                  textTransform: "capitalize",
                  truncate: true,
                }}
              >
                {capture.pokemonName}
              </Typography>
            )}
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: "#f59e0b",
                fontWeight: 700,
                mt: 0.25,
              }}
            >
              Lv.{capture.level}
            </Typography>
          </Box>
        </Box>
      </Tooltip>

      {showDetail && (
        <PokemonDetailModal
          capture={capture}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
