"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import type { LivePokemon } from "@/lib/tracker/types";
import { getPokemonById } from "@/lib/pokemon-data";
import { getPlayerId, getPlayerIndex } from "@/lib/tracker/knowledge";
import { getZoneDisplayName } from "@/lib/zones";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { boundedDialogProps, useTrackerBounds } from "./TrackerDialog";

const tr = translations.pendingCaptures;

export default function PendingCaptures({
  run,
  compact = false,
}: {
  run: Run;
  compact?: boolean;
}) {
  const { records, playerByRun, desktopStatus, receiveRecord, reportError } =
    useRunStore();
  const { lang } = useLanguage();
  const bounds = useTrackerBounds();
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const tracking = records.find((record) => record.run.id === run.id)?.tracking[
    playerId
  ];
  const [names, setNames] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<LivePokemon | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [captureId, setCaptureId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const pokemonList = tracking?.pendingPokemon ?? [];
  const speciesKey = [...new Set(pokemonList.map((entry) => entry.pokemonId))]
    .sort((first, second) => first - second)
    .join(",");

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      speciesKey
        .split(",")
        .filter(Boolean)
        .map(async (id) => {
          const data = await getPokemonById(Number(id));
          return [
            Number(id),
            data?.names?.[lang] ?? data?.names?.en ?? data?.technicalName,
          ] as const;
        }),
    )
      .then((entries) => {
        if (!cancelled)
          setNames(
            Object.fromEntries(
              entries.filter((entry): entry is [number, string] =>
                Boolean(entry[1]),
              ),
            ),
          );
      })
      .catch(reportError);
    return () => {
      cancelled = true;
    };
  }, [speciesKey, lang, reportError]);

  if (!tracking || !pokemonList.length) return null;
  const index = getPlayerIndex(run, playerId);
  const zoneName = (id?: string) => {
    const zone = run.zones.find((entry) => entry.id === id);
    return zone ? getZoneDisplayName(zone, lang) || zone.zoneName : "";
  };
  const name = (pokemon: LivePokemon) =>
    pokemon.nickname || names[pokemon.pokemonId] || `#${pokemon.pokemonId}`;
  const canLink = Boolean(desktopStatus) && !tracking.suspended;

  async function confirm() {
    if (!pending || !window.nuztracker) return;
    setBusy(true);
    try {
      receiveRecord(
        await window.nuztracker.linkPokemon({
          runId: run.id,
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
    <>
      <Alert severity="warning" sx={{ mt: compact ? 1 : 0 }}>
        <AlertTitle sx={{ mb: compact ? 0.5 : 1 }}>
          {compact
            ? t(tr.compactSummary, lang)(pokemonList.length)
            : t(tr.title, lang)}
        </AlertTitle>
        {!compact && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t(tr.intro, lang)}
          </Typography>
        )}
        <Stack spacing={1}>
          {pokemonList.map((pokemon) => {
            const detail = tracking.pendingDetails?.[pokemon.identity];
            return (
              <Stack
                key={pokemon.identity}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography variant="body2" component="div">
                  <strong>
                    {name(pokemon)} {t(tr.level, lang)(pokemon.level)}
                  </strong>
                  {detail && (
                    <Typography variant="caption" component="p">
                      {t(tr.reasons[detail.reason], lang)}
                      {detail.zoneId &&
                        ` ${t(tr.suggestion, lang)(zoneName(detail.zoneId))}`}
                    </Typography>
                  )}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={!canLink}
                  onClick={() => {
                    setPending(pokemon);
                    setZoneId(detail?.zoneId ?? "");
                    setCaptureId("");
                    setGroupId("");
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  {t(tr.choose, lang)}
                </Button>
              </Stack>
            );
          })}
        </Stack>
      </Alert>
      <Dialog
        open={pending !== null}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        fullWidth
        maxWidth="sm"
        {...boundedDialogProps(bounds)}
      >
        <DialogTitle>
          {pending && t(tr.dialogTitle, lang)(name(pending))}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {pending && tracking.pendingDetails?.[pending.identity] && (
              <Alert severity="info">
                {t(
                  tr.reasons[tracking.pendingDetails[pending.identity].reason],
                  lang,
                )}
              </Alert>
            )}
            <TextField
              select
              label={t(tr.zone, lang)}
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setCaptureId("");
              }}
            >
              {[...run.zones]
                .map((zone) => ({
                  id: zone.id,
                  label: getZoneDisplayName(zone, lang) || zone.zoneName,
                }))
                .sort((left, right) =>
                  left.label.localeCompare(right.label, lang, {
                    sensitivity: "base",
                    numeric: true,
                  }),
                )
                .map((zone) => (
                  <MenuItem key={zone.id} value={zone.id}>
                    {zone.label}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label={t(tr.association, lang)}
              value={captureId}
              helperText={t(tr.existingHint, lang)}
              slotProps={{
                select: { displayEmpty: true },
                inputLabel: { shrink: true },
              }}
              onChange={(event) => setCaptureId(event.target.value)}
            >
              <MenuItem value="">{t(tr.newCapture, lang)}</MenuItem>
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
                label={t(tr.groupId, lang)}
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                helperText={t(tr.groupHelp, lang)}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setPending(null)}>
            {t(tr.cancel, lang)}
          </Button>
          <Button
            variant="contained"
            disabled={busy || !zoneId}
            onClick={() => void confirm()}
          >
            {t(tr.confirm, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
