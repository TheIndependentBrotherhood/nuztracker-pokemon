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
import { encounterOrder } from "@/lib/team-utils";
import {
  isOverlayTeamLive,
  lightFocusMember,
  opponentMember,
  seenAbilityIds,
  seenMoveIds,
  customSeenWords,
  overlayData,
} from "@/lib/tracker/overlay";
import SpriteTeam from "@/components/share/SpriteTeam";
import ConnectionPanel from "./ConnectionPanel";
import InteractiveFocusCard from "./InteractiveFocusCard";
import FaintedPokemon, { faintedInParty } from "./FaintedPokemon";
import PendingCaptures from "./PendingCaptures";
import StatAnnotations from "./StatAnnotations";
import ZoneEncountersButton from "./ZoneEncountersButton";
import { TrackerBoundsContext } from "./TrackerDialog";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { getPokemonById, type CaptureSpriteOption } from "@/lib/pokemon-data";
import type { Capture, PokemonData } from "@/lib/types";
import type { GameFrame } from "@/lib/tracker/types";
import {
  nextBattleFocus,
  type BattleFocusSelection,
} from "@/lib/tracker/battle-focus";

const NO_OPPONENTS: NonNullable<GameFrame["battle"]>["opponents"] = [];

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
    receiveRecord,
  } = useRunStore();
  const { lang } = useLanguage();
  const [resuming, setResuming] = useState(false);
  const run = runs.find((entry) => entry.id === runId);
  const record = records.find((entry) => entry.run.id === runId);
  const [hovered, setHovered] = useState(false);
  const [pinnedTeam, setPinnedTeam] = useState(false);
  const [focusSelection, setFocusSelection] = useState<BattleFocusSelection>();
  const [now, setNow] = useState(0);
  const [bounds, setBounds] = useState<HTMLElement | null>(null);
  // Species references are kept across battles so a known species never shows a loading state again.
  const [opponentReferences, setOpponentReferences] = useState<
    Record<number, PokemonData>
  >({});
  const [referenceErrors, setReferenceErrors] = useState<number[]>([]);
  const currentPlayerId = run
    ? (playerByRun[run.id] ?? getPlayerId(run))
    : "solo";
  const battle = record?.tracking[currentPlayerId]?.latest.battle;
  const opponents = battle?.opponents ?? NO_OPPONENTS;
  const participants = [...opponents, ...(battle?.allies ?? [])];
  const opponentSignature = [
    ...new Set(participants.map(({ pokemonId }) => pokemonId)),
  ]
    .sort((left, right) => left - right)
    .join(",");
  const referencesRef = useRef(opponentReferences);
  useEffect(() => {
    referencesRef.current = opponentReferences;
  });
  const focusForBattle =
    focusSelection?.battleId === battle?.id ? focusSelection : undefined;
  const selectedId = focusForBattle?.memberId;
  const selectedOpponentIdentity = focusForBattle?.opponentIdentity;
  const selectedAllyIdentity = focusForBattle?.allyIdentity;
  const ally = battle?.allies?.find(
    ({ identity }) => identity === selectedAllyIdentity,
  );
  const opponent =
    ally ??
    opponents.find(({ identity }) => identity === selectedOpponentIdentity) ??
    opponents[0];
  const opponentId = opponent?.pokemonId;
  useEffect(
    () =>
      useRunStore.subscribe((state, previousState) => {
        const input = state.battleFocusInput;
        if (
          !input ||
          input === previousState.battleFocusInput ||
          input.runId !== runId
        )
          return;
        const record = state.records.find((entry) => entry.run.id === runId);
        if (!record) return;
        const playerId = state.playerByRun[runId] ?? getPlayerId(record.run);
        const tracking = record.tracking[playerId];
        const battle = tracking?.latest.battle;
        if (
          !battle ||
          tracking.suspended ||
          input.playerId !== playerId ||
          input.battleId !== battle.id
        )
          return;
        const team = overlayData(
          record,
          state.desktopStatus?.bridge,
        ).teams.find((entry) => entry.playerId === playerId);
        if (team) {
          setFocusSelection((previous) =>
            nextBattleFocus(battle, team, previous),
          );
          setPinnedTeam(false);
          setHovered(false);
        }
      }),
    [runId],
  );
  useEffect(() => {
    let cancelled = false;
    const missing = opponentSignature
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((pokemonId) => !referencesRef.current[pokemonId]);
    if (!missing.length) return;
    void Promise.all(
      missing.map(async (pokemonId) => {
        try {
          const pokemon = await getPokemonById(pokemonId);
          if (!pokemon)
            throw new Error(
              `Local reference data for species ${pokemonId} is unavailable.`,
            );
          return { pokemonId, pokemon };
        } catch (error: unknown) {
          reportError(error);
          return { pokemonId, error: true as const };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const references: Record<number, PokemonData> = {};
      const errors: number[] = [];
      for (const result of results) {
        if ("error" in result) errors.push(result.pokemonId);
        else references[result.pokemonId] = result.pokemon;
      }
      setOpponentReferences((previous) => ({ ...previous, ...references }));
      setReferenceErrors(errors);
    });
    return () => {
      cancelled = true;
    };
  }, [opponentSignature, reportError]);
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
    return (
      <Box
        sx={{ p: 2 }}
        role="status"
        aria-busy="true"
        aria-label={t(text.loading, lang)}
      />
    );
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
  const turnOrder = encounterOrder(record.run);
  const enemy =
    opponent && opponentReferences[opponent.pokemonId]
      ? opponentMember(
          run,
          playerId,
          opponent,
          opponentReferences[opponent.pokemonId],
          seenMoveIds(record, playerId, opponent.pokemonId),
          seenAbilityIds(record, playerId, opponent.pokemonId),
          customSeenWords(record, playerId, opponent.pokemonId),
        )
      : undefined;
  const opponentUnavailable =
    opponentId !== undefined && referenceErrors.includes(opponentId);
  // While the opponent reference loads, keep the active lead on screen instead of a loading message.
  const awaitingOpponent =
    !selectedId && team.inBattle && !enemy && !opponentUnavailable;
  const member = awaitingOpponent
    ? (team.members.find(
        (entry) =>
          entry.identity !== undefined &&
          entry.identity === battle?.activePlayerIdentity,
      ) ?? lightFocusMember({ ...team, inBattle: false }, undefined))
    : lightFocusMember(team, enemy, selectedId);
  const showingOpponent = !selectedId && team.inBattle && !awaitingOpponent;
  const manualFocus = Boolean(focusForBattle);
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
      <TrackerBoundsContext.Provider value={bounds}>
        <Box
          ref={setBounds}
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
            minHeight: "var(--window-content-height, 100vh)",
            p: 1,
            maxWidth: 520,
            mx: "auto",
            position: "relative",
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
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
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
              variant={!manualFocus ? "contained" : "outlined"}
              onClick={() => {
                setFocusSelection(undefined);
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
                manualFocus
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
          {team.inBattle && opponents.length > 1 && (
            <Stack
              direction="row"
              spacing={0.5}
              role="group"
              aria-label={t(text.opponentsLabel, lang)}
              sx={{ mb: 0.75 }}
            >
              {opponents.map((candidate, index) => {
                const pokemon = opponentReferences[candidate.pokemonId];
                const name =
                  pokemon?.names?.[lang] ??
                  pokemon?.technicalName ??
                  `#${candidate.pokemonId}`;
                const focused =
                  !selectedId &&
                  !selectedAllyIdentity &&
                  (selectedOpponentIdentity
                    ? selectedOpponentIdentity === candidate.identity
                    : index === 0);
                return (
                  <Button
                    key={candidate.identity}
                    size="small"
                    variant={focused ? "contained" : "outlined"}
                    aria-label={`${text.opponentSlot[lang](index + 1)}: ${name}, ${t(translations.focusCard.level, lang)} ${candidate.level}`}
                    aria-pressed={focused}
                    onClick={() => {
                      setFocusSelection({
                        battleId: battle?.id,
                        opponentIdentity: candidate.identity,
                      });
                    }}
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      justifyContent: "flex-start",
                      gap: 0.5,
                      px: 0.5,
                      py: 0,
                      textAlign: "left",
                    }}
                  >
                    {pokemon && (
                      <Box
                        component="img"
                        src={pokemon.sprites.normal.default}
                        alt=""
                        aria-hidden
                        sx={{
                          width: 28,
                          height: 28,
                          objectFit: "contain",
                          imageRendering: "pixelated",
                        }}
                      />
                    )}
                    <Box
                      component="span"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name} · {t(translations.focusCard.level, lang)}
                      {candidate.level}
                    </Box>
                  </Button>
                );
              })}
            </Stack>
          )}
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
                "@media (prefers-reduced-motion: reduce)": {
                  transition: "none",
                },
              }}
            >
              {team.members.length ? (
                <SpriteTeam
                  members={team.members}
                  ribbon
                  onSelect={(id) => {
                    clearTimeout(hoverTimer.current);
                    setFocusSelection({
                      battleId: battle?.id,
                      memberId: id,
                    });
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
              powerTarget={
                battle && team.powerTarget !== undefined
                  ? showingOpponent
                    ? record.tracking[playerId]?.latest.party.find(
                        (pokemon) =>
                          pokemon.identity === battle.activePlayerIdentity,
                      )
                    : team.powerTarget
                  : undefined
              }
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
                  <Alert severity="error">
                    {t(translations.focusCard.noReference, lang)}
                  </Alert>
                ) : awaitingOpponent ? null : selectedId ||
                  !faintedInParty(record, playerId).length ? (
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
            {team.name} /{" "}
            {team.locationNames?.[lang] ??
              team.locationNames?.en ??
              team.location ??
              t(text.noMappedZone, lang)}
            {team.zoneCapture && (
              <Box
                component="span"
                data-testid="zone-capture"
                sx={{ ml: 0.5, fontWeight: 800, whiteSpace: "nowrap" }}
              >
                <Box
                  component="span"
                  role="img"
                  title={t(
                    team.zoneCapture.captured
                      ? text.zoneCaptured
                      : text.zoneNotCaptured,
                    lang,
                  )}
                  aria-label={t(
                    team.zoneCapture.captured
                      ? text.zoneCaptured
                      : text.zoneNotCaptured,
                    lang,
                  )}
                  sx={{
                    color: team.zoneCapture.captured ? "#4ade80" : "#64748b",
                  }}
                >
                  ✓
                </Box>
                {team.zoneCapture.shiny && (
                  <Box
                    component="span"
                    role="img"
                    title={t(text.zoneShiny, lang)}
                    aria-label={t(text.zoneShiny, lang)}
                    sx={{ ml: 0.25, color: "#facc15" }}
                  >
                    ✓
                  </Box>
                )}
              </Box>
            )}
            {team.zoneEncounters && (
              <ZoneEncountersButton zone={team.zoneEncounters} />
            )}
          </Typography>
          {turnOrder.length > 0 && (
            <Typography
              title={t(text.nextEncounterHint, lang)}
              aria-label={`${t(text.encounterOrder, lang)} : ${turnOrder.map((player) => player.name).join(", ")}`}
              data-testid="next-encounter"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.65rem",
                color: "#b8c7d5",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <PokeBallIcon />
              {turnOrder.map((player) => player.name).join(" - ")}
            </Typography>
          )}
          {run.isSoulLinkMode && (
            <TextField
              select
              size="small"
              label={t(text.player, lang)}
              value={playerId}
              onChange={(event) => {
                setPlayer(run.id, event.target.value);
                setFocusSelection(undefined);
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
            <Alert
              severity="warning"
              sx={{ mt: 1 }}
              action={
                desktopStatus && canEditRun(run.id, playerId) ? (
                  <Button
                    color="inherit"
                    size="small"
                    disabled={resuming}
                    onClick={() => {
                      if (
                        !window.confirm(
                          t(
                            tracking.pendingGame
                              ? text.romUpdateConfirm
                              : text.resumeConfirm,
                            lang,
                          ),
                        )
                      )
                        return;
                      setResuming(true);
                      void (async () => {
                        try {
                          if (window.nuztracker)
                            receiveRecord(
                              await window.nuztracker.resumeTracking({
                                runId: run.id,
                                playerId,
                              }),
                            );
                        } catch (error) {
                          reportError(error);
                        } finally {
                          setResuming(false);
                        }
                      })();
                    }}
                  >
                    {t(
                      tracking.pendingGame ? text.adoptRom : text.reconcile,
                      lang,
                    )}
                  </Button>
                ) : undefined
              }
            >
              {t(
                tracking.pendingGame
                  ? text.pausedRomUpdate
                  : text.pausedReconcile,
                lang,
              )}
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
      </TrackerBoundsContext.Provider>
    </ThemeProvider>
  );
}

function PokeBallIcon() {
  return (
    <Box
      component="svg"
      viewBox="0 0 16 16"
      aria-hidden
      sx={{ width: 10, height: 10, flex: "none" }}
    >
      <path d="M1 8a7 7 0 0 1 14 0z" fill="#ef4444" />
      <path d="M1 8a7 7 0 0 0 14 0z" fill="#f8fafc" />
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="#111827"
        strokeWidth="1.5"
      />
      <path d="M1 8h14" stroke="#111827" strokeWidth="1.5" />
      <circle
        cx="8"
        cy="8"
        r="2.2"
        fill="#f8fafc"
        stroke="#111827"
        strokeWidth="1.5"
      />
    </Box>
  );
}
