"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Capture } from "@/lib/types";
import { getSpriteUrl } from "@/lib/pokemon-api";
import { useRunStore } from "@/store/runStore";
import PokemonDetailModal from "./PokemonDetailModal";

interface Props {
  capture: Capture | null;
  slotIndex: number;
  runId: string;
}

export default function PokemonCard({ capture, slotIndex, runId }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { runs, updateTeam } = useRunStore();

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
          background: "rgba(30, 41, 59, 0.3)",
          border: "1px dashed rgba(71, 85, 99, 0.5)",
          borderRadius: "0.75rem",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100px",
        }}
      >
        <Typography sx={{ color: "#475569", fontSize: "0.75rem" }}>
          Slot {slotIndex + 1}
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

  return (
    <>
      <Box
        sx={{
          background: "rgba(30, 41, 59, 0.6)",
          border: "1px solid rgba(71, 85, 99, 0.5)",
          borderRadius: "0.75rem",
          p: 1.5,
          cursor: "pointer",
          transition: "all 200ms ease",
          position: "relative",
          "&:hover": {
            borderColor: "rgba(59, 130, 246, 0.4)",
            transform: "translateY(-2px)",
            boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.1)",
          },
          "&:hover .remove-btn": {
            opacity: 1,
          },
        }}
        onClick={() => setShowDetail(true)}
      >
        {capture.isShiny && (
          <Typography
            sx={{ position: "absolute", top: 1, right: 1, fontSize: "0.75rem" }}
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
            top: 1,
            left: 1,
            fontSize: "0.75rem",
            color: "#f87171",
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "0.25rem",
            px: 0.5,
            py: 0.25,
            opacity: 0,
            transition: "opacity 200ms ease",
            border: "none",
            cursor: "pointer",
            "&:hover": {
              color: "#fca5a5",
            },
          }}
          title="Retirer de l'équipe"
        >
          ✕
        </Box>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
          alt={capture.pokemonName}
          style={{
            width: "56px",
            height: "56px",
            objectFit: "contain",
            margin: "0 auto",
            filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
          }}
        />
        <Box sx={{ textAlign: "center", mt: 0.5 }}>
          <Box
            sx={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
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
                color: "#475569",
                textTransform: "capitalize",
                truncate: true,
              }}
            >
              {capture.pokemonName}
            </Typography>
          )}
          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 0.25 }}>
            Lv.{capture.level}
          </Typography>
        </Box>
      </Box>

      {showDetail && (
        <PokemonDetailModal
          capture={capture}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
