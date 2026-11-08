"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import NextLink from "next/link";
import { Alert, Box, Button, MenuItem, Stack, TextField, ThemeProvider, Typography, createTheme } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { getPlayerId, viewRunForPlayer } from "@/lib/tracker/knowledge";
import { isOverlayTeamLive, overlayData } from "@/lib/tracker/overlay";
import SpriteTeam from "@/components/share/SpriteTeam";
import ConnectionPanel from "./ConnectionPanel";
import FocusCard from "./FocusCard";
import StatAnnotations from "./StatAnnotations";

const lightTheme = createTheme({
  palette: { mode: "dark", primary: { main: "#8ed6f8" }, background: { default: "#101820", paper: "#1b2733" } },
  typography: { fontFamily: '"Segoe UI", sans-serif', button: { textTransform: "none" } },
  components: {
    MuiButton: { styleOverrides: { root: { minWidth: 32, borderRadius: 4, boxShadow: "none", fontSize: "0.75rem" } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 4 } } },
  },
});

export default function LightTracker() {
  const runId = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("id") ?? "",
    () => "",
  );
  const { runs, records, loaded, desktopStatus, playerByRun, setPlayer } = useRunStore();
  const run = runs.find((entry) => entry.id === runId);
  const record = records.find((entry) => entry.run.id === runId);
  const [hovered, setHovered] = useState(false);
  const [pinnedTeam, setPinnedTeam] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [now, setNow] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => { clearInterval(timer); clearTimeout(hoverTimer.current); };
  }, []);
  function openDrawer() {
    clearTimeout(hoverTimer.current);
    setHovered(true);
  }
  function closeDrawer() {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), 180);
  }
  if (!loaded || !runId) return <Box sx={{ p: 2 }}>Loading light tracker...</Box>;
  if (!run || !record) return <Alert severity="error">Run not found. <NextLink href="/">Open runs</NextLink></Alert>;
  const teams = overlayData(record, desktopStatus?.bridge).teams;
  const team = teams.find((entry) => entry.playerId === (playerByRun[run.id] ?? getPlayerId(run))) ?? teams[0];
  if (!team) return <Alert severity="error">No player is configured for this run.</Alert>;
  const playerId = team.playerId;
  const member = selectedId
    ? team.members.find((entry) => entry.id === selectedId)
    : team.members.find((entry) => entry.identity && entry.identity === team.activeIdentity) ?? team.members[0];
  const tracking = record.tracking[playerId];
  const live = Boolean(desktopStatus && isOverlayTeamLive(team, now));
  const expanded = hovered || pinnedTeam;
  return (
    <ThemeProvider theme={lightTheme}>
      <Box data-testid="light-tracker" onKeyDown={(event) => {
        if (event.key === "Escape") {
          clearTimeout(hoverTimer.current);
          setHovered(false);
          setPinnedTeam(false);
          document.getElementById("light-party-toggle")?.focus();
        }
      }} sx={{ bgcolor: "#101820", color: "#edf4fa", minHeight: "100vh", p: 1, maxWidth: 520, mx: "auto", fontFamily: '"Segoe UI", sans-serif' }}>
        <style>{"body:has([data-testid='light-tracker']) { background: #101820 !important; }"}</style>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.gameName}</Typography>
          <ConnectionPanel run={run} compact minimal />
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 1 }}>
          <Box
            sx={{ position: "relative" }}
            onMouseEnter={openDrawer}
            onMouseLeave={closeDrawer}
          >
            <Button id="light-party-toggle" size="small" variant="outlined" aria-expanded={expanded} aria-controls="light-party-drawer" onClick={() => {
              clearTimeout(hoverTimer.current);
              setHovered(false);
              setPinnedTeam(!pinnedTeam);
            }}>Team</Button>
          </Box>
          <Button size="small" variant={!selectedId ? "contained" : "outlined"} onClick={() => setSelectedId(undefined)}>Live</Button>
          <Button size="small" component={NextLink} href={`/live/?id=${run.id}`}>Details</Button>
          <Typography sx={{ ml: "auto !important", fontSize: "0.65rem", color: live ? "#86efac" : "#fcd34d" }}>{selectedId ? "Pinned" : live ? team.inBattle ? "Battle / auto" : "Live / lead" : "Manual / last known"}</Typography>
        </Stack>
        <Box sx={{ position: "relative" }}>
          <Box
            id="light-party-drawer"
            data-testid="party-drawer"
            aria-hidden={!expanded}
            onMouseEnter={openDrawer}
            onMouseLeave={closeDrawer}
            onFocus={() => { clearTimeout(hoverTimer.current); setPinnedTeam(true); }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) { setPinnedTeam(false); closeDrawer(); }
            }}
            sx={{
              position: "absolute", left: 0, right: 0, top: 0, zIndex: 10,
              bgcolor: "#1b2937", border: "1px solid #7890a5", borderRadius: 1,
              px: 0.5, boxShadow: "0 8px 20px #0008",
              transform: expanded ? "translateY(0)" : "translateY(-12px)",
              opacity: expanded ? 1 : 0, visibility: expanded ? "visible" : "hidden",
              transition: "transform 160ms ease, opacity 160ms ease, visibility 160ms",
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          >
            {team.members.length ? <SpriteTeam members={team.members} ribbon onSelect={(id) => {
              clearTimeout(hoverTimer.current);
              setSelectedId(id); setPinnedTeam(false); setHovered(false);
              document.getElementById("light-party-toggle")?.focus();
            }} /> : <Typography sx={{ p: 1, fontSize: "0.75rem" }}>No confirmed party members.</Typography>}
          </Box>
          {member ? <FocusCard member={member} gameVersion={run.gameVersion} /> : <Alert severity="info">{selectedId ? "This Pokemon is no longer in the team. Return to Live." : "Add your team manually or link detected Pokemon from Details."}</Alert>}
        </Box>
        {member?.randomStats && (
          <Box sx={{ mt: 1 }}>
            <StatAnnotations run={viewRunForPlayer(run, playerId)} pokemonId={member.pokemonId} playerId={playerId} />
          </Box>
        )}
        <Typography sx={{ mt: 0.75, fontSize: "0.65rem", color: "#b8c7d5" }}>{team.name} / {team.location ?? "No mapped zone"}</Typography>
        {run.isSoulLinkMode && <TextField select size="small" label="Player" value={playerId} onChange={(event) => { setPlayer(run.id, event.target.value); setSelectedId(undefined); }} fullWidth sx={{ mt: 1 }}>
          {run.soulLinkPlayers?.map((player) => <MenuItem value={player.id} key={player.id}>{player.name}</MenuItem>)}
        </TextField>}
        {tracking?.suspended && <Alert severity="warning" sx={{ mt: 1 }}>Timeline paused. Reconcile from Details.</Alert>}
        {Boolean(tracking?.pendingPokemon.length) && <Alert severity="info" sx={{ mt: 1 }}>{tracking!.pendingPokemon.length} Pokemon waiting to be linked in Details.</Alert>}
        {desktopStatus?.bridge.runId === run.id && desktopStatus.bridge.error && <Alert severity="error" sx={{ mt: 1 }}>{desktopStatus.bridge.error}</Alert>}
      </Box>
    </ThemeProvider>
  );
}
