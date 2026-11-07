"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import NextLink from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { LivePokemon } from "@/lib/tracker/types";
import type { PokemonData } from "@/lib/types";
import { getPokemonById } from "@/lib/pokemon-data";
import { getPlayerId, getPlayerIndex } from "@/lib/tracker/knowledge";
import { gameKey } from "@/lib/tracker/live";
import { useRunStore } from "@/store/runStore";
import ConnectionPanel from "./ConnectionPanel";
import ZoneIntel from "./ZoneIntel";

export default function LiveTracker() {
  const runId = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("id") ?? "",
    () => "",
  );
  const {
    runs,
    records,
    playerByRun,
    loaded,
    desktopStatus,
    receiveRecord,
    reportError,
  } = useRunStore();
  const run = runs.find((entry) => entry.id === runId);
  const record = records.find((entry) => entry.run.id === runId);
  const playerId = run ? (playerByRun[runId] ?? getPlayerId(run)) : "solo";
  const tracking = record?.tracking[playerId];
  const [reference, setReference] = useState<Record<number, PokemonData>>({});
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState<LivePokemon | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [captureId, setCaptureId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(30);
  const speciesKey = [
    ...new Set([
      ...(tracking?.latest.party.map((pokemon) => pokemon.pokemonId) ?? []),
      ...(tracking?.latest.battle?.opponents.map(
        (pokemon) => pokemon.pokemonId,
      ) ?? []),
      ...(tracking?.pendingPokemon.map((pokemon) => pokemon.pokemonId) ?? []),
    ]),
  ]
    .sort((first, second) => first - second)
    .join(",");

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        speciesKey
          .split(",")
          .filter(Boolean)
          .map(async (id) => {
            const data = await getPokemonById(Number(id));
            if (!data)
              throw new Error(
                `Local reference data for species ${id} is unavailable.`,
              );
            return [data.id, data] as const;
          }),
      );
      if (!cancelled) setReference(Object.fromEntries(entries));
    })().catch(reportError);
    return () => {
      cancelled = true;
    };
  }, [speciesKey, reportError]);

  if (!loaded || !runId) return <Box sx={{ p: 3 }}>Loading tracker…</Box>;
  if (!run || !record)
    return (
      <Alert severity="error">
        Run not found. <NextLink href="/">Open runs</NextLink>
      </Alert>
    );
  const index = getPlayerIndex(run, playerId);
  const latestSeen =
    desktopStatus?.bridge.runId === run.id &&
    desktopStatus.bridge.playerId === playerId
      ? desktopStatus.bridge.lastSeenAt
      : tracking?.lastSeenAt;
  const connectedSource =
    desktopStatus?.bridge.runId === run.id ||
    (desktopStatus?.room.runId === run.id &&
      ["hosting", "connected"].includes(desktopStatus.room.mode));
  const fresh = Boolean(
    connectedSource && latestSeen && now && now - latestSeen < 5000,
  );
  const captures = run.zones
    .flatMap((zone) => zone.captures)
    .filter((capture) => (capture.playerIndex ?? 0) === index);
  const name = (pokemon: { pokemonId: number; nickname?: string }) =>
    pokemon.nickname ||
    reference[pokemon.pokemonId]?.names?.en ||
    reference[pokemon.pokemonId]?.technicalName ||
    `Species #${pokemon.pokemonId}`;

  async function confirmLink() {
    if (!pending || !window.nuztracker) return;
    setBusy(true);
    try {
      receiveRecord(
        await window.nuztracker.linkPokemon({
          runId,
          playerId,
          identity: pending.identity,
          zoneId,
          ...(captureId ? { captureId } : {}),
          ...(groupId.trim() ? { soulLinkGroupId: groupId.trim() } : {}),
        }),
      );
      setPending(null);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", pb: 4 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          px: 2,
          py: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">{run.gameName}</Typography>
        <Button component={NextLink} href={`/run/?id=${run.id}`}>
          Full run
        </Button>
      </Stack>
      <ConnectionPanel run={run} compact />
      <Stack spacing={2} sx={{ px: 2 }}>
        <ZoneIntel run={run} />
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Chip
            label={fresh ? "Live" : "Disconnected / last known state"}
            color={fresh ? "success" : "warning"}
          />
          <Chip
            label={
              run.soulLinkPlayers?.find((player) => player.id === playerId)
                ?.name ?? "Solo"
            }
          />
          {tracking?.latest.location && (
            <Chip
              label={`Map: ${tracking.latest.location.name ?? tracking.latest.location.id}`}
            />
          )}
        </Stack>
        {!tracking && (
          <Alert severity="info">
            Connect a compatible emulator from Connections. All existing manual
            run features remain available.
          </Alert>
        )}
        {tracking?.latest.warnings?.map((warning) => (
          <Alert severity="warning" key={warning}>
            {warning}
          </Alert>
        ))}
        {tracking?.suspended && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Resume from the current game state? Existing deaths and discoveries will be preserved.",
                    )
                  )
                    return;
                  void window.nuztracker
                    ?.resumeTracking({ runId, playerId })
                    .then(receiveRecord)
                    .catch(reportError);
                }}
              >
                Reconcile
              </Button>
            }
          >
            A backward jump was detected. Team updates are paused until you
            confirm this timeline. New observations are still saved.
          </Alert>
        )}
        {desktopStatus?.room.runId === run.id &&
          desktopStatus.room.mode !== "offline" && (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {desktopStatus.room.participants.map((participant) => (
                <Chip
                  key={participant.playerId}
                  size="small"
                  label={`${participant.name}: ${participant.connected ? "online" : "offline"}`}
                  color={participant.connected ? "success" : "default"}
                />
              ))}
            </Stack>
          )}
        {tracking?.pendingPokemon.length ? (
          <Box>
            <Typography variant="subtitle1">
              Confirm encounters / link existing captures
            </Typography>
            <Typography variant="body2">
              The tracker never guesses an encounter rule or a Pokémon identity
              from its species alone.
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap", mt: 1 }}
            >
              {tracking.pendingPokemon.map((pokemon) => (
                <Button
                  key={pokemon.identity}
                  variant="outlined"
                  disabled={tracking.suspended || !desktopStatus}
                  onClick={() => {
                    setPending(pokemon);
                    setZoneId("");
                    setCaptureId("");
                    setGroupId("");
                  }}
                >
                  {name(pokemon)}
                </Button>
              ))}
            </Stack>
          </Box>
        ) : null}
        <Typography variant="h6">Party</Typography>
        <Box
          component="section"
          aria-label="Party"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 1.5,
            alignItems: "start",
          }}
        >
          {tracking?.latest.party.map((pokemon) => {
            const capture = captures.find(
              (entry) => entry.gameIdentity === pokemon.identity,
            );
            return (
              <Box
                key={pokemon.identity}
                sx={{
                  p: 1,
                  bgcolor: "#fff",
                  border: "2px solid",
                  borderColor: capture?.isDead ? "error.main" : "#111",
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {name(pokemon)} {pokemon.isShiny ? "★" : ""}
                  </Typography>
                  <Typography>Lv. {pokemon.level}</Typography>
                </Stack>
                <Typography variant="body2">
                  {pokemon.hp}/{pokemon.maxHp} HP · {pokemon.status}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(100 * pokemon.hp) / pokemon.maxHp}
                  color={pokemon.hp === 0 ? "error" : "success"}
                  sx={{ my: 1, height: 7, borderRadius: 1 }}
                />
                {capture?.isDead && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {capture.linkedDeath
                      ? "Unavailable through SoulLink"
                      : "Marked as dead"}{" "}
                    — remove this Pokémon from play.
                  </Alert>
                )}
                {pokemon.isEgg && (
                  <Chip
                    size="small"
                    label="Egg — confirm its encounter after hatching"
                  />
                )}
                <Typography variant="body2">
                  {[
                    pokemon.types?.join(" / "),
                    pokemon.nature,
                    pokemon.ability,
                    pokemon.heldItem,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
                <Box component="details" sx={{ mt: 1 }}>
                  <Box
                    component="summary"
                    sx={{ cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    Moves &amp; stats
                  </Box>
                  {pokemon.stats && (
                    <Typography variant="caption">
                      {Object.entries(pokemon.stats)
                        .map(([stat, value]) => `${stat}: ${value}`)
                        .join(" · ")}
                    </Typography>
                  )}
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {pokemon.moves.map((move) => (
                      <Typography variant="body2" key={move.id}>
                        {move.name ?? `Move #${move.id}`} · {move.pp} PP
                        {move.type ? ` · ${move.type}` : ""}
                        {move.power ? ` · Power ${move.power}` : ""}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
        {tracking?.latest.battle && (
          <>
            <Typography variant="h6">
              Opponent — observed information only
            </Typography>
            {tracking.latest.battle.opponents.map((opponent) => {
              const observations = record.observations.filter(
                (entry) =>
                  entry.playerId === playerId &&
                  entry.gameKey === gameKey(tracking.game) &&
                  entry.pokemonId === opponent.pokemonId,
              );
              return (
                <Box
                  key={opponent.identity}
                  sx={{
                    p: 2,
                    border: "2px solid #111",
                    borderRadius: 2,
                    bgcolor: "#fff",
                  }}
                >
                  <Typography sx={{ fontWeight: 800 }}>
                    {name(opponent)} · Lv. {opponent.level}
                  </Typography>
                  {!observations.length && (
                    <Typography variant="body2">
                      No moves or abilities observed yet.
                    </Typography>
                  )}
                  {observations.slice(-8).map((observation) => (
                    <Typography key={observation.id} variant="body2">
                      {observation.encounterId === tracking.latest.battle?.id
                        ? "Observed"
                        : "Previously seen"}
                      : {observation.value}
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </>
        )}
        <Typography variant="h6">Run history</Typography>
        {!record.history.length && (
          <Typography variant="body2">
            Events will be saved here as you play.
          </Typography>
        )}
        {[...record.history]
          .reverse()
          .slice(0, historyLimit)
          .map((entry) => (
            <Box key={entry.id}>
              <Typography variant="caption">
                {new Date(entry.at).toLocaleString()} · {entry.playerId} ·{" "}
                {entry.kind}
              </Typography>
              <Typography variant="body2">{entry.message}</Typography>
            </Box>
          ))}
        {record.history.length > historyLimit && (
          <Button onClick={() => setHistoryLimit((value) => value + 50)}>
            Show earlier events
          </Button>
        )}
      </Stack>
      <Dialog
        open={pending !== null}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirm {pending ? name(pending) : "capture"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Select its encounter zone. Use an existing capture when continuing
              a manually tracked run.
            </Alert>
            <TextField
              select
              label="Encounter zone"
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setCaptureId("");
              }}
            >
              {run.zones.map((zone) => (
                <MenuItem key={zone.id} value={zone.id}>
                  {zone.zoneNames?.en ?? zone.zoneName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Capture association"
              value={captureId}
              onChange={(event) => setCaptureId(event.target.value)}
            >
              <MenuItem value="">Record a new capture</MenuItem>
              {(run.zones.find((zone) => zone.id === zoneId)?.captures ?? [])
                .filter(
                  (capture) =>
                    (capture.playerIndex ?? 0) === index &&
                    !capture.gameIdentity,
                )
                .map((capture) => (
                  <MenuItem key={capture.id} value={capture.id}>
                    {capture.nickname ?? capture.pokemon.technicalName}
                  </MenuItem>
                ))}
            </TextField>
            {run.isSoulLinkMode && (
              <TextField
                label="SoulLink group ID (optional)"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                helperText="Defaults to this zone's ID. Partners can use the same group ID across different zones."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !zoneId}
            onClick={() => void confirmLink()}
          >
            Confirm link
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
