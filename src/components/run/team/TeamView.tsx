"use client";

import { Run, Capture } from "@/lib/types";
import { Box, Grid, Typography } from "@mui/material";
import { useState } from "react";
import TeamPokemonCard from "./TeamPokemonCard";
import CapturedPokemonCard from "./CapturedPokemonCard";
import DeadPokemonCard from "./DeadPokemonCard";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

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
  const [dragOverDead, setDragOverDead] = useState(false);
  const [expandedCaptured, setExpandedCaptured] = useState(true);
  const [expandedDead, setExpandedDead] = useState(true);
  const { lang } = useLanguage();
  const tr = translations;

  // Get all captured pokémons not in team (excluding dead)
  const capturedNotInTeam = run.zones
    .flatMap((z) => z.captures)
    .filter((c) => !run.team.find((t) => t.id === c.id) && !c.isDead);

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
    const deadPokemonId = e.dataTransfer.getData("deadPokemonId");

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

      if (capturedPokemon) {
        const nextTeam = [...run.team];
        if (nextTeam[slotIndex]) {
          // Replace occupied slot: previous team member automatically goes back to Captured
          nextTeam[slotIndex] = capturedPokemon;
        } else if (nextTeam.length < 6) {
          // Empty slot: add at the targeted position when possible
          if (slotIndex >= nextTeam.length) {
            nextTeam.push(capturedPokemon);
          } else {
            nextTeam.splice(slotIndex, 0, capturedPokemon);
          }
        }

        if (nextTeam.length <= 6) {
          updateTeam(run.id, nextTeam);
        }
      }
    } else if (deadPokemonId) {
      // Resurrect dead pokémon and add to team
      const capturedPokemon = run.zones
        .flatMap((z) => z.captures)
        .find((c) => c.id === deadPokemonId);

      if (capturedPokemon) {
        const resurrectPokemon = { ...capturedPokemon, isDead: false };
        const nextTeam = [...run.team];

        if (nextTeam[slotIndex]) {
          // Replace occupied slot: previous team member automatically goes back to Captured
          nextTeam[slotIndex] = resurrectPokemon;
        } else if (nextTeam.length < 6) {
          // Empty slot: add at the targeted position when possible
          if (slotIndex >= nextTeam.length) {
            nextTeam.push(resurrectPokemon);
          } else {
            nextTeam.splice(slotIndex, 0, resurrectPokemon);
          }
        }

        const updatedRun = {
          ...run,
          team: nextTeam,
          zones: run.zones.map((zone) => ({
            ...zone,
            captures: zone.captures.map((capture) =>
              capture.id === deadPokemonId
                ? { ...capture, isDead: false }
                : capture,
            ),
          })),
        };

        if (nextTeam.length <= 6) {
          const { updateRun } = useRunStore.getState();
          updateRun(updatedRun);
        }
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

  const handleDragOverDead = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Accept both captured pokémons (copy) and team pokémons (move)
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
    setDragOverDead(true);
  };

  const handleDragLeaveDead = () => {
    setDragOverDead(false);
  };

  const handleDropOnDead = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverDead(false);

    const capturedPokemonId = e.dataTransfer.getData("capturedPokemonId");
    const pokemonId = e.dataTransfer.getData("pokemonId");

    if (capturedPokemonId) {
      // Mark captured pokémon as dead
      const updatedRun = {
        ...run,
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((capture) =>
            capture.id === capturedPokemonId
              ? { ...capture, isDead: true }
              : capture,
          ),
        })),
      };
      const { updateRun } = useRunStore.getState();
      updateRun(updatedRun);
    } else if (pokemonId) {
      // Remove from team and mark as dead
      const updatedTeam = run.team.filter((p) => p.id !== pokemonId);
      const updatedRun = {
        ...run,
        team: updatedTeam,
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((capture) =>
            capture.id === pokemonId ? { ...capture, isDead: true } : capture,
          ),
        })),
      };
      const { updateRun } = useRunStore.getState();
      updateRun(updatedRun);
    }
  };

  const handleDropOnCaptured = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverCaptured(false);

    const pokemonId = e.dataTransfer.getData("pokemonId");
    const deadPokemonId = e.dataTransfer.getData("deadPokemonId");

    if (pokemonId) {
      // Remove from team
      const updatedTeam = run.team.filter((p) => p.id !== pokemonId);
      updateTeam(run.id, updatedTeam);
    } else if (deadPokemonId) {
      // Resurrect dead pokémon (toggle isDead to false)
      const updatedRun = {
        ...run,
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((capture) =>
            capture.id === deadPokemonId
              ? { ...capture, isDead: false }
              : capture,
          ),
        })),
      };
      const { updateRun } = useRunStore.getState();
      updateRun(updatedRun);
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
            {t(tr.teamView.team, lang)}
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
            {t(tr.teamView.analysis, lang)}
          </Box>
        </Box>
        <Grid container spacing={1.5}>
          {teamSlots.map((capture, i) => (
            <Grid key={i}>
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
                <TeamPokemonCard
                  capture={capture}
                  slotIndex={i}
                  runId={run.id}
                  zone={
                    capture
                      ? (getZoneForCapture(capture.id) ??
                        t(tr.teamView.unknown, lang))
                      : ""
                  }
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Captured Pokémons Section */}
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
            justifyContent: "space-between",
            mb: 2,
            pb: 1.5,
            borderBottom: "2px solid #000",
            background: dragOverCaptured
              ? "rgba(59, 130, 246, 0.05)"
              : "transparent",
            transition: "all 200ms ease",
            mx: -2,
            px: 2,
            cursor: "pointer",
          }}
          onClick={() => setExpandedCaptured(!expandedCaptured)}
          role="button"
          tabIndex={0}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}
          >
            {t(tr.teamView.capturedPokemon, lang)(capturedNotInTeam.length)}
          </Typography>
          <Typography sx={{ fontSize: "1.25rem", color: "#000" }}>
            {expandedCaptured ? "▼" : "▶"}
          </Typography>
        </Box>
        {expandedCaptured && (
          <>
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
                  {t(tr.teamView.reserveArea, lang)}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {capturedNotInTeam.map((capture) => (
                  <Grid key={capture.id}>
                    <CapturedPokemonCard
                      capture={capture}
                      runId={run.id}
                      onAddToTeam={handleAddCapturedToTeam}
                      onToggleDead={handleToggleDeadStatus}
                      zone={
                        getZoneForCapture(capture.id) ??
                        t(tr.teamView.unknown, lang)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>

      {/* Dead Pokémons Section */}
      <Box
        sx={{
          background: dragOverDead ? "rgba(220, 38, 38, 0.05)" : "#fef2f2",
          border: "2px solid #dc2626",
          borderRadius: "1rem",
          p: 2,
          transition: "all 200ms ease",
        }}
        onDragOver={handleDragOverDead}
        onDragLeave={handleDragLeaveDead}
        onDrop={handleDropOnDead}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            pb: 1.5,
            borderBottom: "2px solid #dc2626",
            mx: -2,
            px: 2,
            cursor: "pointer",
          }}
          onClick={() => setExpandedDead(!expandedDead)}
          role="button"
          tabIndex={0}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#dc2626" }}
          >
            {t(tr.teamView.deadPokemon, lang)(deadPokemon.length)}
          </Typography>
          <Typography sx={{ fontSize: "1.25rem", color: "#dc2626" }}>
            {expandedDead ? "▼" : "▶"}
          </Typography>
        </Box>
        {expandedDead && (
          <>
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
                  {t(tr.teamView.noDeadPokemon, lang)}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {deadPokemon.map((capture) => (
                  <Grid key={capture.id}>
                    <DeadPokemonCard
                      capture={capture}
                      runId={run.id}
                      onResurrect={handleToggleDeadStatus}
                      zone={
                        getZoneForCapture(capture.id) ??
                        t(tr.teamView.unknown, lang)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
