"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { PokemonData, Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { gameKey } from "@/lib/tracker/live";
import { getPokemonList } from "@/lib/pokemon-data";
import { getGameVersion } from "@/lib/game-catalog";
import { encounterAreasForZone, loadEncounterReferences, type EncounterArea } from "@/lib/encounter-reference";
import { useRunStore } from "@/store/runStore";

export default function ZoneIntel({ run }: { run: Run }) {
  const { records, playerByRun, selectedZoneId, receiveRecord, reportError, canEditRun } = useRunStore();
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const tracking = records.find((record) => record.run.id === run.id)?.tracking[playerId];
  const currentMap = tracking?.latest.location;
  const mappedZone = run.zones.find((zone) => zone.id === tracking?.zoneMappings[currentMap?.id ?? ""]);
  const [open, setOpen] = useState(false);
  const [chosenZone, setChosenZone] = useState("");
  const [version, setVersion] = useState("");
  const [reference, setReference] = useState<{ areas: EncounterArea[]; pokemon: Map<number, PokemonData> }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const zone = run.zones.find((zone) => zone.id === (chosenZone || selectedZoneId)) ?? mappedZone ?? run.zones[0];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([loadEncounterReferences(), getPokemonList()]).then(([data, pokemon]) => {
      if (!pokemon.length) throw new Error("Pokemon names could not be loaded.");
      if (!cancelled) { setReference({ areas: data.areas, pokemon: new Map(pokemon.map((entry) => [entry.id, entry])) }); setError(""); }
    }).catch((error: unknown) => {
      if (!cancelled) { setError(error instanceof Error ? error.message : "Encounter references could not be loaded."); reportError(error); }
    });
    return () => { cancelled = true; };
  }, [open, reportError]);

  const areas = reference && zone ? encounterAreasForZone(reference.areas, run.gameVersion, zone) : [];
  const versions = [...new Set(areas.flatMap((area) => area.entries.map((entry) => entry.version)))];
  const selectedVersion = versions.includes(version) ? version : versions[0] ?? "";
  const seen = (tracking?.seenEncounters ?? []).filter((entry) =>
    entry.gameKey === gameKey(tracking!.game) &&
    tracking!.zoneMappings[entry.locationId] === zone?.id,
  );
  const species = [...new Set(seen.map((entry) => entry.pokemonId))];
  const name = (id: number) => reference?.pokemon.get(id)?.names?.en ?? reference?.pokemon.get(id)?.technicalName ?? `Species #${id}`;
  async function mapCurrent() {
    setBusy(true);
    try {
      if (!window.nuztracker || !currentMap || !zone) throw new Error("Connect a game and choose a zone first.");
      receiveRecord(await window.nuztracker.mapZone({ runId: run.id, playerId, locationId: currentMap.id, zoneId: zone.id }));
    } catch (error) { reportError(error); }
    finally { setBusy(false); }
  }
  return (
    <Box>
      {currentMap && <Typography variant="caption" component="p">Current: {mappedZone?.zoneNames?.en ?? mappedZone?.zoneName ?? currentMap.name ?? currentMap.id}{!mappedZone && " (unmapped)"}</Typography>}
      <Button size="small" onClick={() => setOpen(true)}>Zone guide / discoveries</Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Zone guide and observed encounters</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Encounter zone" value={zone?.id ?? ""} onChange={(event) => setChosenZone(event.target.value)}>
              {run.zones.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.zoneNames?.en ?? entry.zoneName}</MenuItem>)}
            </TextField>
            {currentMap && <Alert severity="info" action={<Button disabled={busy || !zone || !canEditRun(run.id, playerId)} onClick={() => void mapCurrent()}>Map here</Button>}>
              Game location: {currentMap.name ?? currentMap.id}. Mapping associates this location with the selected zone; it never creates a capture. Linking an older capture does not remap your current location.
            </Alert>}
            <Typography variant="h6">Observed in this player&apos;s run</Typography>
            <Typography variant="body2">{run.soulLinkPlayers?.find((player) => player.id === playerId)?.name ?? "Solo"} / current ROM and trainer only. Repeated observations in the same encounter are counted once; discoveries survive save-state rollback.</Typography>
            {species.length ? <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {species.map((id) => {
                const entries = seen.filter((entry) => entry.pokemonId === id);
                return <Box key={id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
                  <strong>{name(id)}</strong><Typography variant="caption" component="p">{entries.length} encounters / Lv. {Math.min(...entries.map((entry) => entry.level))}-{Math.max(...entries.map((entry) => entry.level))}</Typography>
                </Box>;
              })}
            </Stack> : <Typography variant="body2">No observed wild encounters mapped to this zone yet.</Typography>}
            <Typography variant="h6">Original game reference</Typography>
            <Alert severity="warning">{getGameVersion(run.gameVersion)?.name ?? "No game selected"}: these species, rates and levels describe the unmodified game, never your randomized seed. Gifts and special scripted encounters are not a complete part of this reference.</Alert>
            <Typography variant="caption">Rates are for individual encounter slots under the listed conditions, not cumulative species probabilities. Identical slot descriptions are grouped.</Typography>
            {error ? <Alert severity="error">{error}</Alert> : !reference ? <CircularProgress size={24} /> : !areas.length ? <Typography>No original encounter table is available for this game / zone.</Typography> : <>
              {versions.length > 1 && <TextField select label="Original version" value={selectedVersion} onChange={(event) => setVersion(event.target.value)}>
                {versions.map((entry) => <MenuItem key={entry} value={entry}>{entry}</MenuItem>)}
              </TextField>}
              {areas.map((area) => <Box key={area.areaId}>
                <Typography sx={{ fontWeight: 700 }}>{area.name}{area.area && ` / ${area.area}`}</Typography>
                <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                  {area.entries.filter((entry) => entry.version === selectedVersion).map((entry, index) => <Box key={index} sx={{ borderBottom: "1px solid", borderColor: "divider", py: 0.75 }}>
                    <Typography variant="body2"><strong>{name(entry.pokemonId)}</strong> / {entry.method.replaceAll("-", " ")} / Lv. {entry.minLevel}-{entry.maxLevel} / slot: {entry.chance}%</Typography>
                    {entry.conditions.length > 0 && <Typography variant="caption">{entry.conditions.map((condition) => condition.replaceAll("-", " ")).join(", ")}</Typography>}
                  </Box>)}
                </Box>
              </Box>)}
            </>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)} disabled={busy}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
