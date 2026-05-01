"use client";

import { Run, Capture } from "@/lib/types";
import { Box, Grid, Typography } from "@mui/material";
import { useState } from "react";
import PokemonCard from "./PokemonCard";
import CapturedPokemonCard from "./CapturedPokemonCard";
import { useRunStore } from "@/store/runStore";
import { getSpriteUrl } from "@/lib/pokemon-api";

interface Props {
  run: Run;
  id?: string;
  onToggleAnalysis?: () => void;
}

export default function TeamView({ run, id, onToggleAnalysis }: Props) {
  const teamSlots = Array.from({ length: 6 }, (_, i) => run.team[i] ?? null);
  const { updateTeam } = useRunStore();
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverCaptured, setDragOverCaptured] = useState(false);

  // Get all captured pokémons not in team
  const capturedNotInTeam = run.zones
    .flatMap((z) => z.captures)
    .filter((c) => !run.team.find((t) => t.id === c.id));

  // Helper function to find zone name for a capture
  const getZoneForCapture = (captureId: string): string | undefined => {
    const zone = run.zones.find((z) =>
      z.captures.some((c) => c.id === captureId),
    );
    return zone?.zoneName;
  };

  const handleDragOverSlot = (
    e: React.DragEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    e.preventDefault();
    // Accept both move (from team) and copy (from captured)
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
    setDragOverSlot(slotIndex);
  };

  const handleDragLeaveSlot = () => {
    setDragOverSlot(null);
  };

  const handleDropOnSlot = (
    e: React.DragEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    e.preventDefault();
    setDragOverSlot(null);

    const pokemonId = e.dataTransfer.getData("pokemonId");
    const capturedPokemonId = e.dataTransfer.getData("capturedPokemonId");

    if (pokemonId) {
      // Moving within team
      const teamArray = [...run.team];
      const draggedIndex = teamArray.findIndex((p) => p.id === pokemonId);

      if (draggedIndex !== -1) {
        const draggedPokemon = teamArray[draggedIndex];
        teamArray.splice(draggedIndex, 1);
        teamArray.splice(slotIndex, 0, draggedPokemon);
        updateTeam(run.id, teamArray);
      }
    } else if (capturedPokemonId) {
      // Adding from captured list
      const capturedPokemon = run.zones
        .flatMap((z) => z.captures)
        .find((c) => c.id === capturedPokemonId);

      if (capturedPokemon && run.team.length < 6) {
        updateTeam(run.id, [...run.team, capturedPokemon]);
      }
    }
  };

  const handleDragOverCaptured = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only accept move from team (not copy from captured)
    if (e.dataTransfer.effectAllowed === "move") {
      e.dataTransfer.dropEffect = "move";
      setDragOverCaptured(true);
    }
  };

  const handleDragLeaveCaptured = () => {
    setDragOverCaptured(false);
  };

  const handleDropOnCaptured = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverCaptured(false);

    const pokemonId = e.dataTransfer.getData("pokemonId");

    if (pokemonId) {
      // Remove from team
      const updatedTeam = run.team.filter((p) => p.id !== pokemonId);
      updateTeam(run.id, updatedTeam);
    }
  };

  const handleAddCapturedToTeam = (capture: Capture) => {
    if (run.team.length < 6) {
      updateTeam(run.id, [...run.team, capture]);
    }
  };

  const handleToggleDeadStatus = (captureId: string) => {
    const updatedRun = {
      ...run,
      zones: run.zones.map((zone) => ({
        ...zone,
        captures: zone.captures.map((capture) =>
          capture.id === captureId
            ? { ...capture, isDead: !capture.isDead }
            : capture,
        ),
      })),
    };
    // Use the updateRun from store to persist changes
    const { updateRun } = useRunStore.getState();
    updateRun(updatedRun);
  };

  // Get all dead pokémons
  const deadPokemon = run.zones
    .flatMap((z) => z.captures)
    .filter((c) => c.isDead);

  return (
    <Box
      id={id}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* Team Section */}
      <Box
        sx={{
          background: "linear-gradient(to bottom, #EFF6FF, #F3E8FF)",
          border: "2px solid #000",
          borderRadius: "1rem",
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            pb: 1.5,
            borderBottom: "2px solid #000",
          }}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}
          >
            ⚔️ Équipe
          </Typography>
          <Box
            sx={{
              fontSize: "0.875rem",
              fontWeight: 700,
              background: "#fff",
              color: "#000",
              px: 1.5,
              py: 0.5,
              borderRadius: "0.5rem",
              border: "2px solid #000",
              cursor: "pointer",
              transition: "all 200ms ease",
              "&:hover": {
                background: "#f0f4f8",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              },
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
            onClick={onToggleAnalysis}
            role="button"
            tabIndex={0}
          >
            🔬 Analyse
          </Box>
        </Box>
        <Grid container spacing={1.5}>
          {teamSlots.map((capture, i) => (
            <Grid item xs={6} sm={4} key={i}>
              <Box
                onDragOver={(e) => handleDragOverSlot(e, i)}
                onDragLeave={handleDragLeaveSlot}
                onDrop={(e) => handleDropOnSlot(e, i)}
                sx={{
                  transition: "all 200ms ease",
                  background:
                    dragOverSlot === i
                      ? "rgba(59, 130, 246, 0.1)"
                      : "transparent",
                  borderRadius: "0.75rem",
                  p: dragOverSlot === i ? 1 : 0,
                  height: "100%",
                }}
              >
                <PokemonCard
                  capture={capture}
                  slotIndex={i}
                  runId={run.id}
                  zone={
                    capture ? getZoneForCapture(capture.id) || "Inconnue" : ""
                  }
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Captured Pokémons Section - Always visible */}
      <Box
        sx={{
          background: "#fff",
          border: "2px solid #000",
          borderRadius: "1rem",
          p: 2,
        }}
        onDragOver={handleDragOverCaptured}
        onDragLeave={handleDragLeaveCaptured}
        onDrop={handleDropOnCaptured}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            pb: 1.5,
            borderBottom: "2px solid #000",
            background: dragOverCaptured
              ? "rgba(59, 130, 246, 0.05)"
              : "transparent",
            transition: "all 200ms ease",
            mx: -2,
            px: 2,
          }}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}
          >
            📦 Pokémons capturés ({capturedNotInTeam.length})
          </Typography>
        </Box>
        {capturedNotInTeam.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "120px",
              color: "#999",
            }}
          >
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Zone de réserve (glisse les pokémons ici pour les retirer de
              l'équipe)
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={1.5}>
            {capturedNotInTeam.map((capture) => (
              <Grid item xs={6} sm={4} key={capture.id}>
                <CapturedPokemonCard
                  capture={capture}
                  onAddToTeam={handleAddCapturedToTeam}
                  onToggleDead={handleToggleDeadStatus}
                  zone={getZoneForCapture(capture.id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Dead Pokémons Section */}
      <Box
        sx={{
          background: "#fef2f2",
          border: "2px solid #dc2626",
          borderRadius: "1rem",
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            pb: 1.5,
            borderBottom: "2px solid #dc2626",
            mx: -2,
            px: 2,
          }}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#dc2626" }}
          >
            ⚰️ Pokémons RIP ({deadPokemon.length})
          </Typography>
        </Box>
        {deadPokemon.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "120px",
              color: "#999",
            }}
          >
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Aucun pokémon décédé pour le moment. Longue vie à votre équipe !
              🍀
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={1.5}>
            {deadPokemon.map((capture) => (
              <Grid item xs={6} sm={4} key={capture.id}>
                <Box
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
                      handleToggleDeadStatus(capture.id);
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
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
