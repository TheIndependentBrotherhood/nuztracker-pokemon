"use client";

import { Box, Typography, Tooltip } from "@mui/material";
import { Capture } from "@/lib/types";
import { getSpriteUrl } from "@/lib/pokemon-api";
import { useState } from "react";
import PokemonDetailModal from "./modals/PokemonDetailModal";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  capture: Capture;
  onAddToTeam: (capture: Capture) => void;
  zone: string;
}

export default function CapturedPokemonCard({
  capture,
  onAddToTeam,
  zone,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { lang } = useLanguage();
  const tr = translations;

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
            background: "#f0f4f8",
            border: "2px solid #cbd5e1",
            borderRadius: "0.75rem",
            p: 1,
            cursor: "grab",
            transition: "all 200ms ease",
            position: "relative",
            maxWidth: "220px",
            maxHeight: "108px",
            minWidth: "220px",
            minHeight: "108px",
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:active": {
              cursor: "grabbing",
            },
            "&:hover": {
              borderColor: "#3b82f6",
              background: "#e0f2fe",
              boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.2)",
            },
            "&:hover .add-btn": {
              opacity: 1,
            },
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer?.setData("capturedPokemonId", capture.id);
            e.dataTransfer!.effectAllowed = "copy";
          }}
        >
          {/* Image */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: "88px",
              height: "88px",
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
                filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
              }}
              onClick={() => setShowDetail(true)}
            />
            {capture.isShiny && (
              <Typography
                sx={{
                  position: "absolute",
                  fontSize: "1rem",
                  top: 1,
                  right: 1,
                }}
              >
                ✨
              </Typography>
            )}
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#000",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
            </Typography>
            {capture.nickname && (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "#666",
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {capture.pokemonName}
              </Typography>
            )}
            <Typography
              sx={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 600 }}
            >
              Lv.{capture.level}
            </Typography>
          </Box>

          {/* Add button */}
          <Box
            component="button"
            className="add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToTeam(capture);
            }}
            sx={{
              flexShrink: 0,
              fontSize: "0.875rem",
              color: "#fff",
              background: "#3b82f6",
              borderRadius: "0.25rem",
              px: 1,
              py: 0.5,
              opacity: 0,
              transition: "opacity 200ms ease",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                background: "#2563eb",
              },
            }}
            title={t(tr.capturedPokemonCard.addToTeam, lang)}
          >
            +
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
