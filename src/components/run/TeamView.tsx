"use client";

import { Run, Capture } from "@/lib/types";
import { Box, Grid, Typography } from "@mui/material";
import { useState } from "react";
import PokemonCard from "./PokemonCard";
import CapturedPokemonCard from "./CapturedPokemonCard";
import { useRunStore } from "@/store/runStore";

interface Props {
  run: Run;
  id?: string;
}

export default function TeamView({ run, id }: Props) {
  const teamSlots = Array.from({ length: 6 }, (_, i) => run.team[i] ?? null);
  const { updateTeam } = useRunStore();
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Get all captured pokémons not in team
  const capturedNotInTeam = run.zones
    .flatMap((z) => z.captures)
    .filter((c) => !run.team.find((t) => t.id === c.id));

  const handleDragOverSlot = (
    e: React.DragEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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

  const handleAddCapturedToTeam = (capture: Capture) => {
    if (run.team.length < 6) {
      updateTeam(run.id, [...run.team, capture]);
    }
  };

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
              background: "#3b82f6",
              color: "#fff",
              px: 1.5,
              py: 0.5,
              borderRadius: "0.5rem",
              border: "2px solid #000",
            }}
          >
            {run.team.length}/6
          </Box>
        </Box>
        <Grid container spacing={1.5}>
          {teamSlots.map((capture, i) => (
            <Grid
              item
              xs={6}
              sm={4}
              key={i}
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
              }}
            >
              <PokemonCard capture={capture} slotIndex={i} runId={run.id} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Captured Pokémons Section */}
      {capturedNotInTeam.length > 0 && (
        <Box
          sx={{
            background: "#fff",
            border: "2px solid #000",
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
              borderBottom: "2px solid #000",
            }}
          >
            <Typography
              sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}
            >
              📦 Pokémons capturés ({capturedNotInTeam.length})
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            {capturedNotInTeam.map((capture, i) => (
              <Grid
                item
                xs={6}
                sm={4}
                key={i}
                sx={{
                  transition: "all 200ms ease",
                  background: "transparent",
                  borderRadius: "0.75rem",
                  p: 0,
                }}
              >
                <CapturedPokemonCard
                  key={capture.id}
                  capture={capture}
                  onAddToTeam={handleAddCapturedToTeam}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
