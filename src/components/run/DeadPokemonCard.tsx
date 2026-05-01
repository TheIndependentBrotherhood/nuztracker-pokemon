"use client";

import { Box, Typography, Tooltip } from "@mui/material";
import { Capture } from "@/lib/types";
import { getSpriteUrl } from "@/lib/pokemon-api";
import { useState } from "react";
import PokemonDetailModal from "./modals/PokemonDetailModal";

interface Props {
  capture: Capture;
  onResurrect: (captureId: string) => void;
  zone?: string;
}

export default function DeadPokemonCard({ capture, onResurrect, zone }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const tooltipTitle = `${capture.pokemonName}${capture.nickname ? ` (${capture.nickname})` : ""}${zone ? ` - ${zone}` : ""}`;

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Box
          draggable
          onDragStart={(e) => {
            e.dataTransfer?.setData("deadPokemonId", capture.id);
            e.dataTransfer!.effectAllowed = "move";
          }}
          sx={{
            background: "#fff",
            border: "2px solid #ef4444",
            borderRadius: "0.75rem",
            p: 1,
            transition: "all 200ms ease",
            position: "relative",
            maxWidth: "220px",
            minWidth: "220px",
            minHeight: "108px",
            display: "flex",
            alignItems: "center",
            gap: 1,
            opacity: 0.7,
            cursor: "grab",
            "&:active": {
              cursor: "grabbing",
            },
            "&:hover": {
              borderColor: "#dc2626",
              background: "#fecaca",
              opacity: 1,
            },
            "&:hover .resurrect-btn": {
              opacity: 1,
            },
          }}
        >
          {/* Image with dead effect */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: "88px",
              height: "88px",
              filter: "grayscale(100%) contrast(0.8)",
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
            </Typography>
            <Typography
              sx={{
                fontSize: "0.7rem",
                color: "#f59e0b",
                fontWeight: 600,
              }}
            >
              Lv.{capture.level}
            </Typography>
          </Box>

          {/* Resurrect button */}
          <Box
            component="button"
            className="resurrect-btn"
            onClick={(e) => {
              e.stopPropagation();
              onResurrect(capture.id);
            }}
            sx={{
              flexShrink: 0,
              fontSize: "0.875rem",
              color: "#fff",
              background: "#10b981",
              borderRadius: "0.25rem",
              px: 1,
              py: 0.5,
              opacity: 0,
              transition: "opacity 200ms ease",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                background: "#059669",
              },
            }}
            title="Ressusciter"
          >
            ↻
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
