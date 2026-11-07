"use client";

import { useState } from "react";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { overlayCommandSchema, type OverlayControlConfig } from "@/lib/tracker/overlay-control";
import { useRunStore } from "@/store/runStore";

export default function OverlayControls({ run }: { run: Run }) {
  const [config, setConfig] = useState<OverlayControlConfig>();
  const [action, setAction] = useState("show-team");
  const [duration, setDuration] = useState("10");
  const [slot, setSlot] = useState("1");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const { reportError, playerByRun } = useRunStore();
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const command = {
    action,
    ...(action !== "hide" ? { playerId } : {}),
    ...(duration.trim() ? { durationSeconds: Number(duration) } : {}),
    ...(action === "show-pokemon" ? { slot: Number(slot) } : {}),
  };
  async function perform(work: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await work(); } catch (error) { reportError(error); }
    finally { setBusy(false); }
  }
  return <Stack spacing={1.5}>
    <Typography variant="h6">Streamer.bot / Stream Deck</Typography>
    <Typography variant="body2">Local authenticated HTTP commands. Timed commands replace each other, then restore the persistent view. Leave the duration empty to set that persistent view.</Typography>
    <Stack direction="row" spacing={1}>
      <TextField select label="Action" value={action} onChange={(event) => setAction(event.target.value)} fullWidth>
        <MenuItem value="show-team">Show team</MenuItem><MenuItem value="show-pokemon">Show Pokemon</MenuItem><MenuItem value="live">Automatic live</MenuItem><MenuItem value="hide">Hide</MenuItem>
      </TextField>
      <TextField label="Seconds" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} sx={{ width: 120, flexShrink: 0 }} slotProps={{ htmlInput: { min: 0.25, max: 3600, step: 0.25 } }} />
    </Stack>
    {action === "show-pokemon" && <TextField select label="Party slot" value={slot} onChange={(event) => setSlot(event.target.value)}>
      {[1, 2, 3, 4, 5, 6].map((index) => <MenuItem key={index} value={String(index)}>{index}</MenuItem>)}
    </TextField>}
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      <Button disabled={busy} onClick={() => void perform(async () => {
        if (!window.nuztracker) throw new Error("Overlay control requires the desktop application.");
        await window.nuztracker.commandOverlay({ runId: run.id, command: overlayCommandSchema.parse(command) });
        setNotice("Overlay command applied.");
      })}>Test command</Button>
      <Button disabled={busy} onClick={() => void perform(async () => {
        if (!window.nuztracker) throw new Error("External control requires the desktop application.");
        setConfig(await window.nuztracker.getOverlayControlConfig(run.id));
      })}>Configure external control</Button>
    </Stack>
    {config && <>
      <TextField label="POST URL" value={config.url} slotProps={{ input: { readOnly: true } }} />
      <TextField label="Authorization header" type="password" value={`Bearer ${config.token}`} slotProps={{ input: { readOnly: true } }} helperText="A separate control token. Never put it in an OBS source URL or a shared backup." />
      <Button onClick={() => void perform(async () => {
        await navigator.clipboard.writeText(`Bearer ${config.token}`);
        setNotice("Authorization header copied.");
      })}>Copy authorization header</Button>
      <TextField label="JSON body" multiline value={JSON.stringify(command, null, 2)} slotProps={{ input: { readOnly: true } }} helperText="Send with Content-Type: application/json. Commands are local to this computer." />
    </>}
    {notice && <Alert severity="success">{notice}</Alert>}
  </Stack>;
}
