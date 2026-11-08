"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import NextLink from "next/link";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { getPlayerId, viewRunForPlayer } from "@/lib/tracker/knowledge";
import {
  isOverlayTeamLive,
  lightFocusMember,
  opponentMember,
  overlayData,
} from "@/lib/tracker/overlay";
import SpriteTeam from "@/components/share/SpriteTeam";
import ConnectionPanel from "./ConnectionPanel";
import InteractiveFocusCard from "./InteractiveFocusCard";
import FaintedPokemon, { faintedInParty } from "./FaintedPokemon";
import PendingCaptures from "./PendingCaptures";
import StatAnnotations from "./StatAnnotations";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { getPokemonById, type CaptureSpriteOption } from "@/lib/pokemon-data";
import type { Capture, PokemonData } from "@/lib/types";

const lightTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8ed6f8" },
    background: { default: "#101820", paper: "#1b2733" },
  },
  typography: {
    fontFamily: '"Segoe UI", sans-serif',
    button: { textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minWidth: 32,
          borderRadius: 4,
          boxShadow: "none",
          fontSize: "0.75rem",
        },
      },
    },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 4 } } },
  },
});

export default function LightTracker() {
  const runId = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("id") ?? "",
    () => "",
  );
  const {
    runs,
    records,
    loaded,
    desktopStatus,
    playerByRun,
    setPlayer,
    updateRun,
    canEditRun,
    reportError,
  } = useRunStore();
  const { lang } = useLanguage();
  const run = runs.find((entry) => entry.id === runId);
  const record = records.find((entry) => entry.run.id === runId);
  const [hovered, setHovered] = useState(false);
  const [pinnedTeam, setPinnedTeam] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [now, setNow] = useState(0);
  const [reference, setReference] = useState<PokemonData>();
  const [referenceError, setReferenceError] = useState<number>();
  const currentPlayerId = run
    ? (playerByRun[run.id] ?? getPlayerId(run))
    : "solo";
  const opponent =
    record?.tracking[currentPlayerId]?.latest.battle?.opponents[0];
  const opponentId = !selectedId ? opponent?.pokemonId : undefined;
  useEffect(() => {
    if (opponentId === undefined) return;
    let cancelled = false;
    void getPokemonById(opponentId)
      .then((pokemon) => {
        if (!pokemon)
          throw new Error(
            `Local reference data for species ${opponentId} is unavailable.`,
          );
        if (!cancelled) {
          setReference(pokemon);
          setReferenceError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setReferenceError(opponentId);
          reportError(error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [opponentId, reportError]);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(timer);
      clearTimeout(hoverTimer.current);
    };
  }, []);
  function openDrawer() {
    clearTimeout(hoverTimer.current);
    setHovered(true);
  }
  function closeDrawer() {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), 180);
  }
  const text = translations.liveView;
  if (!loaded || !runId)
    return <Box sx={{ p: 2 }}>{t(text.loading, lang)}</Box>;
  if (!run || !record)
    return (
      <Alert severity="error">
        {t(text.runNotFound, lang)}{" "}
        <NextLink href="/">{t(text.openRuns, lang)}</NextLink>
      </Alert>
    );
  const teams = overlayData(record, desktopStatus?.bridge).teams;
  const team =
    teams.find(
      (entry) => entry.playerId === (playerByRun[run.id] ?? getPlayerId(run)),
    ) ?? teams[0];
  if (!team) return <Alert severity="error">{t(text.noPlayer, lang)}</Alert>;
  const playerId = team.playerId;
  const enemy =
    opponent && reference?.id === opponent.pokemonId
      ? opponentMember(run, playerId, opponent, reference)
      : undefined;
  const member = lightFocusMember(team, enemy, selectedId);
  const showingOpponent = !selectedId && team.inBattle;
  const runForPlayer = viewRunForPlayer(run, playerId);
  async function changeSprite(captureId: string, sprite: CaptureSpriteOption) {
    const selectedSprite = {
      url: sprite.url,
      source: sprite.source,
      label: sprite.label.slice(0, 500),
    };
    const update = (capture: Capture) =>
      capture.id === captureId ? { ...capture, selectedSprite } : capture;
    await updateRun(
      {
        ...runForPlayer,
        team: runForPlayer.team.map(update),
        zones: runForPlayer.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map(update),
        })),
      },
      runForPlayer,
      playerId,
    );
  }
  const tracking = record.tracking[playerId];
  const live = Boolean(desktopStatus && isOverlayTeamLive(team, now));
  const expanded = hovered || pinnedTeam;
  return (
    <ThemeProvider theme={lightTheme}>
      <Box
        data-testid="light-tracker"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            clearTimeout(hoverTimer.current);
            setHovered(false);
            setPinnedTeam(false);
            document.getElementById("light-party-toggle")?.focus();
          }
        }}
        sx={{
          bgcolor: "#101820",
          color: "#edf4fa",
          minHeight: "100vh",
          p: 1,
          maxWidth: 520,
          mx: "auto",
          fontFamily: '"Segoe UI", sans-serif',
        }}
      >
        <style>
          {
            "body:has([data-testid='light-tracker']) { background: #101820 !important; }"
          }
        </style>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {run.gameName}
          </Typography>
          <ConnectionPanel run={run} compact minimal />
        </Stack>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", mb: 1 }}
        >
          <Box
            sx={{ position: "relative" }}
            onMouseEnter={openDrawer}
            onMouseLeave={closeDrawer}
          >
            <Button
              id="light-party-toggle"
              size="small"
              variant="outlined"
              aria-expanded={expanded}
              aria-controls="light-party-drawer"
              onClick={() => {
                clearTimeout(hoverTimer.current);
                setHovered(false);
                setPinnedTeam(!pinnedTeam);
              }}
            >
              {t(translations.hub.teamButton, lang)}
            </Button>
          </Box>
          <Button
            size="small"
            variant={!selectedId ? "contained" : "outlined"}
            onClick={() => {
              setSelectedId(undefined);
              clearTimeout(hoverTimer.current);
              setHovered(false);
              setPinnedTeam(false);
            }}
          >
            {t(text.liveButton, lang)}
          </Button>
          <Typography
            sx={{
              ml: "auto !important",
              fontSize: "0.65rem",
              color: live ? "#86efac" : "#fcd34d",
            }}
          >
            {t(
              selectedId
                ? text.statusPinned
                : live
                  ? team.inBattle
                    ? text.statusBattle
                    : text.statusLead
                  : text.statusManual,
              lang,
            )}
          </Typography>
        </Stack>
        <Box sx={{ position: "relative" }}>
          <Box
            id="light-party-drawer"
            data-testid="party-drawer"
            aria-hidden={!expanded}
            onMouseEnter={openDrawer}
            onMouseLeave={closeDrawer}
            onFocus={() => {
              clearTimeout(hoverTimer.current);
              setPinnedTeam(true);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setPinnedTeam(false);
                closeDrawer();
              }
            }}
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 10,
              bgcolor: "#1b2937",
              border: "1px solid #7890a5",
              borderRadius: 1,
              px: 0.5,
              boxShadow: "0 8px 20px #0008",
              transform: expanded ? "translateY(0)" : "translateY(-12px)",
              opacity: expanded ? 1 : 0,
              visibility: expanded ? "visible" : "hidden",
              transition:
                "transform 160ms ease, opacity 160ms ease, visibility 160ms",
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          >
            {team.members.length ? (
              <SpriteTeam
                members={team.members}
                ribbon
                onSelect={(id) => {
                  clearTimeout(hoverTimer.current);
                  setSelectedId(id);
                  setPinnedTeam(false);
                  setHovered(false);
                  document.getElementById("light-party-toggle")?.focus();
                }}
              />
            ) : (
              <Typography sx={{ p: 1, fontSize: "0.75rem" }}>
                {t(text.noPartyMembers, lang)}
              </Typography>
            )}
          </Box>
          <InteractiveFocusCard
            run={run}
            playerId={playerId}
            member={member}
            opponentLevel={showingOpponent ? opponent?.level : undefined}
            onSpriteChange={
              member &&
              canEditRun(run.id, playerId) &&
              runForPlayer.zones.some((zone) =>
                zone.captures.some((capture) => capture.id === member.id),
              )
                ? (sprite) => void changeSprite(member.id, sprite)
                : undefined
            }
            fallback={
              showingOpponent ? (
                <Alert
                  severity={
                    referenceError === opponentId && opponentId !== undefined
                      ? "error"
                      : "info"
                  }
                >
                  {t(
                    referenceError === opponentId && opponentId !== undefined
                      ? translations.focusCard.noReference
                      : text.loading,
                    lang,
                  )}
                </Alert>
              ) : selectedId || !faintedInParty(record, playerId).length ? (
                <Alert severity="info">
                  {t(selectedId ? text.notInTeam : text.addTeamHint, lang)}
                </Alert>
              ) : null
            }
          />
        </Box>
        {member?.randomStats && (
          <Box sx={{ mt: 1 }}>
            <StatAnnotations
              run={viewRunForPlayer(run, playerId)}
              pokemonId={member.pokemonId}
              playerId={playerId}
            />
          </Box>
        )}
        <Typography sx={{ mt: 0.75, fontSize: "0.65rem", color: "#b8c7d5" }}>
          {team.name} / {team.location ?? t(text.noMappedZone, lang)}
        </Typography>
        {run.isSoulLinkMode && (
          <TextField
            select
            size="small"
            label={t(text.player, lang)}
            value={playerId}
            onChange={(event) => {
              setPlayer(run.id, event.target.value);
              setSelectedId(undefined);
            }}
            fullWidth
            sx={{ mt: 1 }}
          >
            {run.soulLinkPlayers?.map((player) => (
              <MenuItem value={player.id} key={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {tracking?.suspended && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t(text.pausedReconcile, lang)}
          </Alert>
        )}
        <FaintedPokemon run={run} compact />
        <PendingCaptures run={run} compact />
        {desktopStatus?.bridge.runId === run.id &&
          desktopStatus.bridge.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {desktopStatus.bridge.error}
            </Alert>
          )}
      </Box>
    </ThemeProvider>
  );
}
