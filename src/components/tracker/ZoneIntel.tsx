"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { PokemonData, Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import {
  sharedSeenEncounters,
  sharedZoneMappings,
} from "@/lib/tracker/shared-rom";
import { getPokemonList } from "@/lib/pokemon-data";
import { getGameVersion } from "@/lib/game-catalog";
import {
  encounterAreasForZone,
  loadEncounterReferences,
  type EncounterArea,
} from "@/lib/encounter-reference";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

export default function ZoneIntel({ run }: { run: Run }) {
  const {
    records,
    playerByRun,
    selectedZoneId,
    receiveRecord,
    reportError,
    canEditRun,
  } = useRunStore();
  const { lang } = useLanguage();
  const text = translations.zoneGuide;
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const tracking = records.find((record) => record.run.id === run.id)?.tracking[
    playerId
  ];
  const currentMap = tracking?.latest.location;
  const mappedZone = run.zones.find(
    (zone) => zone.id === tracking?.zoneMappings[currentMap?.id ?? ""],
  );
  const [open, setOpen] = useState(false);
  const [chosenZone, setChosenZone] = useState("");
  const [version, setVersion] = useState("");
  const [reference, setReference] = useState<{
    areas: EncounterArea[];
    pokemon: Map<number, PokemonData>;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const zone =
    run.zones.find((zone) => zone.id === (chosenZone || selectedZoneId)) ??
    mappedZone ??
    run.zones[0];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([loadEncounterReferences(), getPokemonList()])
      .then(([data, pokemon]) => {
        if (!pokemon.length) throw new Error(t(text.namesError, lang));
        if (!cancelled) {
          setReference({
            areas: data.areas,
            pokemon: new Map(pokemon.map((entry) => [entry.id, entry])),
          });
          setError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : t(text.referencesError, lang),
          );
          reportError(error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, reportError, lang, text]);

  const areas =
    reference && zone
      ? encounterAreasForZone(reference.areas, run.gameVersion, zone)
      : [];
  const versions = [
    ...new Set(
      areas.flatMap((area) => area.entries.map((entry) => entry.version)),
    ),
  ];
  const selectedVersion = versions.includes(version)
    ? version
    : (versions[0] ?? "");
  const record = records.find((entry) => entry.run.id === run.id);
  const seen = record ? sharedSeenEncounters(record, playerId) : [];
  const mappings = record ? sharedZoneMappings(record, playerId) : {};
  const encountered = seen.filter(
    (entry) => mappings[entry.locationId] === zone?.id,
  );
  const species = [...new Set(encountered.map((entry) => entry.pokemonId))];
  const name = (id: number) =>
    reference?.pokemon.get(id)?.names?.[lang] ??
    reference?.pokemon.get(id)?.names?.en ??
    reference?.pokemon.get(id)?.technicalName ??
    t(translations.liveView.species, lang)(id);
  const zoneLabel = (entry: {
    zoneName: string;
    zoneNames?: { fr?: string; en?: string };
  }) => entry.zoneNames?.[lang] ?? entry.zoneNames?.en ?? entry.zoneName;
  async function mapCurrent() {
    setBusy(true);
    try {
      if (!window.nuztracker || !currentMap || !zone)
        throw new Error(t(text.connectFirst, lang));
      receiveRecord(
        await window.nuztracker.mapZone({
          runId: run.id,
          playerId,
          locationId: currentMap.id,
          zoneId: zone.id,
        }),
      );
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Box>
      {currentMap && (
        <Typography variant="caption" component="p">
          {t(text.current, lang)(
            mappedZone
              ? zoneLabel(mappedZone)
              : (currentMap.name ?? currentMap.id),
            Boolean(mappedZone),
          )}
        </Typography>
      )}
      <Button size="small" onClick={() => setOpen(true)}>
        {t(text.open, lang)}
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t(text.title, lang)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label={t(text.zone, lang)}
              value={zone?.id ?? ""}
              onChange={(event) => setChosenZone(event.target.value)}
            >
              {run.zones.map((entry) => (
                <MenuItem key={entry.id} value={entry.id}>
                  {zoneLabel(entry)}
                </MenuItem>
              ))}
            </TextField>
            {currentMap && (
              <Alert
                severity="info"
                action={
                  <Button
                    disabled={busy || !zone || !canEditRun(run.id, playerId)}
                    onClick={() => void mapCurrent()}
                  >
                    {t(text.mapHere, lang)}
                  </Button>
                }
              >
                {t(text.mapExplanation, lang)(currentMap.name ?? currentMap.id)}
              </Alert>
            )}
            <Typography variant="h6">{t(text.observedTitle, lang)}</Typography>
            <Typography variant="body2">
              {t(
                text.observedScope,
                lang,
              )(
                run.soulLinkPlayers?.find((player) => player.id === playerId)
                  ?.name ?? t(translations.liveView.solo, lang),
              )}
            </Typography>
            {species.length ? (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                {species.map((id) => {
                  const entries = encountered.filter(
                    (entry) => entry.pokemonId === id,
                  );
                  return (
                    <Box
                      key={id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      <strong>{name(id)}</strong>
                      <Typography variant="caption" component="p">
                        {t(text.encounterSummary, lang)(
                          entries.length,
                          Math.min(...entries.map((entry) => entry.level)),
                          Math.max(...entries.map((entry) => entry.level)),
                        )}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2">
                {t(text.noObserved, lang)}
              </Typography>
            )}
            <Typography variant="h6">{t(text.referenceTitle, lang)}</Typography>
            <Alert severity="warning">
              {t(
                text.referenceWarning,
                lang,
              )(getGameVersion(run.gameVersion)?.name ?? t(text.noGame, lang))}
            </Alert>
            <Typography variant="caption">{t(text.ratesHint, lang)}</Typography>
            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : !reference ? (
              <CircularProgress size={24} />
            ) : !areas.length ? (
              <Typography>{t(text.noReference, lang)}</Typography>
            ) : (
              <>
                {versions.length > 1 && (
                  <TextField
                    select
                    label={t(text.originalVersion, lang)}
                    value={selectedVersion}
                    onChange={(event) => setVersion(event.target.value)}
                  >
                    {versions.map((entry) => (
                      <MenuItem key={entry} value={entry}>
                        {entry}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {areas.map((area) => (
                  <Box key={area.areaId}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {area.name}
                      {area.area && ` / ${area.area}`}
                    </Typography>
                    <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                      {area.entries
                        .filter((entry) => entry.version === selectedVersion)
                        .map((entry, index) => (
                          <Box
                            key={index}
                            sx={{
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              py: 0.75,
                            }}
                          >
                            <Typography variant="body2">
                              <strong>{name(entry.pokemonId)}</strong> /{" "}
                              {t(text.entry, lang)(
                                entry.method.replaceAll("-", " "),
                                entry.minLevel,
                                entry.maxLevel,
                                entry.chance,
                              )}
                            </Typography>
                            {entry.conditions.length > 0 && (
                              <Typography variant="caption">
                                {entry.conditions
                                  .map((condition) =>
                                    condition.replaceAll("-", " "),
                                  )
                                  .join(", ")}
                              </Typography>
                            )}
                          </Box>
                        ))}
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            {t(text.close, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
