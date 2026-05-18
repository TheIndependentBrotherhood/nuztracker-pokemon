"use client";

import { Run, Capture, SOUL_LINK_PLAYER_COLORS } from "@/lib/types";
import { Box, Grid, Snackbar, Typography } from "@mui/material";
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

/** Inner component: renders a team view for a given team + captured pool */
function TeamPanel({
  run,
  team,
  playerIndex,
}: {
  run: Run;
  team: Capture[];
  playerIndex?: number;
}) {
  const teamSlots = Array.from({ length: 6 }, (_, i) => team[i] ?? null);
  const { updateTeam } = useRunStore();
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverCaptured, setDragOverCaptured] = useState(false);
  const [dragOverDead, setDragOverDead] = useState(false);
  const [expandedCaptured, setExpandedCaptured] = useState(true);
  const [expandedDead, setExpandedDead] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { lang } = useLanguage();
  const tr = translations;

  const isSoulLink = Boolean(run.isSoulLinkMode && run.soulLinkPlayers);

  // In soul link mode, capturedNotInTeam is scoped to this player's captures
  const capturedNotInTeam = run.zones
    .flatMap((z) => z.captures)
    .filter((c) => {
      if (isSoulLink) {
        return (
          (c.playerIndex ?? 0) === (playerIndex ?? 0) &&
          !team.find((t) => t.id === c.id) &&
          !c.isDead &&
          !c.failedCapture
        );
      }
      return !run.team.find((t) => t.id === c.id) && !c.isDead;
    });

  const deadPokemon = run.zones
    .flatMap((z) => z.captures)
    .filter((c) => {
      if (isSoulLink) {
        return (c.playerIndex ?? 0) === (playerIndex ?? 0) && c.isDead;
      }
      return c.isDead;
    })
    .sort((a, b) => (b.diedAt ?? 0) - (a.diedAt ?? 0));

  const getZoneForCapture = (captureId: string): string | undefined => {
    const zone = run.zones.find((z) =>
      z.captures.some((c) => c.id === captureId),
    );
    if (!zone) return undefined;
    return zone.zoneNames?.[lang] ?? zone.zoneName;
  };

  function showToast(msg: string) {
    setToastMsg(msg);
  }

  function doUpdateTeam(nextTeam: Capture[]) {
    updateTeam(run.id, nextTeam, playerIndex);
  }

  const handleDragOverSlot = (
    e: React.DragEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    e.preventDefault();
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
      const teamArray = [...team];
      const draggedIndex = teamArray.findIndex((p) => p.id === pokemonId);
      if (draggedIndex !== -1) {
        const draggedPokemon = teamArray[draggedIndex];
        teamArray.splice(draggedIndex, 1);
        teamArray.splice(slotIndex, 0, draggedPokemon);
        doUpdateTeam(teamArray);
      }
    } else if (capturedPokemonId) {
      const capturedPokemon = run.zones
        .flatMap((z) => z.captures)
        .find((c) => c.id === capturedPokemonId);
      if (capturedPokemon) {
        const nextTeam = [...team];
        if (nextTeam[slotIndex]) {
          nextTeam[slotIndex] = capturedPokemon;
        } else if (nextTeam.length < 6) {
          if (slotIndex >= nextTeam.length) {
            nextTeam.push(capturedPokemon);
          } else {
            nextTeam.splice(slotIndex, 0, capturedPokemon);
          }
        }
        if (nextTeam.length <= 6) {
          doUpdateTeam(nextTeam);
          if (isSoulLink) {
            const pName =
              run.soulLinkPlayers?.find((p) => p.playerIndex === playerIndex)
                ?.name ?? `P${(playerIndex ?? 0) + 1}`;
            showToast(
              (
                tr.teamView.toastAdded[lang] as (
                  p: string,
                  n: string,
                ) => string
              )(pName, capturedPokemon.nickname ?? capturedPokemon.pokemon.technicalName),
            );
          }
        }
      }
    } else if (deadPokemonId) {
      const capturedPokemon = run.zones
        .flatMap((z) => z.captures)
        .find((c) => c.id === deadPokemonId);
      if (capturedPokemon) {
        const resurrectPokemon = { ...capturedPokemon, isDead: false };
        const nextTeam = [...team];
        if (nextTeam[slotIndex]) {
          nextTeam[slotIndex] = resurrectPokemon;
        } else if (nextTeam.length < 6) {
          if (slotIndex >= nextTeam.length) {
            nextTeam.push(resurrectPokemon);
          } else {
            nextTeam.splice(slotIndex, 0, resurrectPokemon);
          }
        }
        const updatedRun = {
          ...run,
          team: isSoulLink ? run.team : nextTeam,
          ...(isSoulLink
            ? {
                playerTeams: {
                  ...(run.playerTeams ?? {}),
                  [playerIndex ?? 0]: nextTeam,
                },
              }
            : {}),
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
    if (e.dataTransfer.effectAllowed === "move") {
      e.dataTransfer.dropEffect = "move";
      setDragOverCaptured(true);
    }
  };
  const handleDragLeaveCaptured = () => setDragOverCaptured(false);

  const handleDragOverDead = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
    setDragOverDead(true);
  };
  const handleDragLeaveDead = () => setDragOverDead(false);

  const handleDropOnDead = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverDead(false);
    const capturedPokemonId = e.dataTransfer.getData("capturedPokemonId");
    const pokemonId = e.dataTransfer.getData("pokemonId");
    if (capturedPokemonId) {
      const updatedRun = {
        ...run,
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((capture) =>
            capture.id === capturedPokemonId
              ? { ...capture, isDead: true, diedAt: Date.now() }
              : capture,
          ),
        })),
      };
      const { updateRun } = useRunStore.getState();
      updateRun(updatedRun);
    } else if (pokemonId) {
      const updatedTeam = team.filter((p) => p.id !== pokemonId);
      const updatedRun = {
        ...run,
        team: isSoulLink ? run.team : updatedTeam,
        ...(isSoulLink
          ? {
              playerTeams: {
                ...(run.playerTeams ?? {}),
                [playerIndex ?? 0]: updatedTeam,
              },
            }
          : {}),
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((capture) =>
            capture.id === pokemonId
              ? { ...capture, isDead: true, diedAt: Date.now() }
              : capture,
          ),
        })),
      };
      const { updateRun } = useRunStore.getState();
      updateRun(updatedRun);
      if (isSoulLink) {
        const cap = run.zones.flatMap((z) => z.captures).find((c) => c.id === pokemonId);
        const pName =
          run.soulLinkPlayers?.find((p) => p.playerIndex === playerIndex)?.name ??
          `P${(playerIndex ?? 0) + 1}`;
        showToast(
          (tr.teamView.toastDied[lang] as (p: string, n: string) => string)(
            pName,
            cap?.nickname ?? cap?.pokemon.technicalName ?? "???",
          ),
        );
      }
    }
  };

  const handleDropOnCaptured = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverCaptured(false);
    const pokemonId = e.dataTransfer.getData("pokemonId");
    const deadPokemonId = e.dataTransfer.getData("deadPokemonId");
    if (pokemonId) {
      const updatedTeam = team.filter((p) => p.id !== pokemonId);
      doUpdateTeam(updatedTeam);
      if (isSoulLink) {
        const cap = team.find((c) => c.id === pokemonId);
        const pName =
          run.soulLinkPlayers?.find((p) => p.playerIndex === playerIndex)?.name ??
          `P${(playerIndex ?? 0) + 1}`;
        showToast(
          (tr.teamView.toastRemoved[lang] as (p: string, n: string) => string)(
            pName,
            cap?.nickname ?? cap?.pokemon.technicalName ?? "???",
          ),
        );
      }
    } else if (deadPokemonId) {
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
    if (team.length < 6) {
      doUpdateTeam([...team, capture]);
    }
  };

  const handleToggleDeadStatus = (captureId: string) => {
    const isInTeam = team.some((p) => p.id === captureId);
    const capture = run.zones.flatMap((z) => z.captures).find((c) => c.id === captureId);
    const willBeDead = !capture?.isDead;

    const updatedTeam = willBeDead && isInTeam ? team.filter((p) => p.id !== captureId) : team;

    const updatedRun = {
      ...run,
      team: isSoulLink ? run.team : updatedTeam,
      ...(isSoulLink
        ? {
            playerTeams: {
              ...(run.playerTeams ?? {}),
              [playerIndex ?? 0]: updatedTeam,
            },
          }
        : {}),
      zones: run.zones.map((zone) => ({
        ...zone,
        captures: zone.captures.map((c) =>
          c.id === captureId
            ? { ...c, isDead: !c.isDead, diedAt: !c.isDead ? Date.now() : undefined }
            : c,
        ),
      })),
    };
    const { updateRun } = useRunStore.getState();
    updateRun(updatedRun);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}>
            {t(tr.teamView.team, lang)}
          </Typography>
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
                    dragOverSlot === i ? "rgba(59, 130, 246, 0.1)" : "transparent",
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
                      ? (getZoneForCapture(capture.id) ?? t(tr.teamView.unknown, lang))
                      : ""
                  }
                  onToggleDead={handleToggleDeadStatus}
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
            background: dragOverCaptured ? "rgba(59, 130, 246, 0.05)" : "transparent",
            transition: "all 200ms ease",
            mx: -2,
            px: 2,
            cursor: "pointer",
          }}
          onClick={() => setExpandedCaptured(!expandedCaptured)}
          role="button"
          tabIndex={0}
        >
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}>
            {(tr.teamView.capturedPokemon[lang] as (n: number) => string)(
              capturedNotInTeam.length,
            )}
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
                        getZoneForCapture(capture.id) ?? t(tr.teamView.unknown, lang)
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
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#dc2626" }}>
            {(tr.teamView.deadPokemon[lang] as (n: number) => string)(deadPokemon.length)}
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
                        getZoneForCapture(capture.id) ?? t(tr.teamView.unknown, lang)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>

      {/* Toast notification */}
      <Snackbar
        open={Boolean(toastMsg)}
        autoHideDuration={3000}
        onClose={() => setToastMsg(null)}
        message={toastMsg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default function TeamView({ run, id, onToggleAnalysis: _onToggleAnalysis }: Props) {
  const { lang } = useLanguage();
  const tr = translations;
  const [activePlayer, setActivePlayer] = useState(0);

  const isSoulLink = Boolean(run.isSoulLinkMode && run.soulLinkPlayers);

  if (!isSoulLink) {
    return (
      <Box id={id} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <TeamPanel run={run} team={run.team} />
      </Box>
    );
  }

  const players = run.soulLinkPlayers ?? [];
  const activePlayerTeam = run.playerTeams?.[activePlayer] ?? [];

  return (
    <Box id={id} sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Soul Link player sub-tabs */}
      <Box
        sx={{
          display: "flex",
          borderBottom: "2px solid #000",
          mb: 2,
          background: "linear-gradient(to right, #EFF6FF, #E0E7FF)",
          borderRadius: "1rem 1rem 0 0",
          overflow: "hidden",
        }}
      >
        {players.map((player) => {
          const color = SOUL_LINK_PLAYER_COLORS[player.playerIndex];
          const isActive = activePlayer === player.playerIndex;
          return (
            <Box
              key={player.id}
              component="button"
              onClick={() => setActivePlayer(player.playerIndex)}
              sx={{
                flex: 1,
                py: 1.25,
                px: 0.5,
                fontSize: "0.75rem",
                fontWeight: 700,
                border: "none",
                borderBottom: `4px solid ${isActive ? color : "transparent"}`,
                backgroundColor: isActive
                  ? `${color}22`
                  : "transparent",
                color: isActive ? color : "#64748b",
                cursor: "pointer",
                transition: "all 200ms ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.25,
                "&:hover": {
                  backgroundColor: `${color}11`,
                  color: color,
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              {player.name}
            </Box>
          );
        })}
      </Box>

      <TeamPanel
        run={run}
        team={activePlayerTeam}
        playerIndex={activePlayer}
      />
    </Box>
  );
}
