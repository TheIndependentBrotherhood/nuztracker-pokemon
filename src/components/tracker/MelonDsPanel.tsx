"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import type { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { connectMelonDsSchema } from "@/lib/tracker/schema";
import { getPlayerId } from "@/lib/tracker/knowledge";

export default function MelonDsPanel({ run }: { run: Run }) {
  const { desktopStatus, playerByRun, setDesktopStatus, reportError } = useRunStore();
  const [port, setPort] = useState("3333");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const info = desktopStatus?.melonDs;
  const active = info?.attached ?? false;
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); } catch (error) { reportError(error); }
    finally { setBusy(false); }
  }
  return <Stack spacing={1.5}>
    <Typography variant="h6">MelonDS / Platinum (experimental)</Typography>
    <Alert severity="info">
      Enable the ARM9 GDB server in MelonDS, disable JIT and leave Break on startup off.
      Keep GDB on this computer only; never forward its ports. Save your game before attaching.
      No memory or save writes are performed.
    </Alert>
    {run.gameVersion !== "platinum" && <Alert severity="warning">Select Platinum in Run settings first.</Alert>}
    <Typography variant="body2">{info ? `${info.romName} / ${info.gameCode} rev. ${info.revision} / ${info.state}${info.layout ? ` / ${info.layout}` : ""}` : "No ROM selected."}</Typography>
    <Button disabled={busy || active} onClick={() => void perform(async () => {
      if (!window.nuztracker) throw new Error("MelonDS tracking requires the desktop application.");
      if (await window.nuztracker.selectMelonDsRom()) setConfirmed(false);
    })}>Select loaded ROM</Button>
    <TextField label="ARM9 GDB port" type="number" value={port} disabled={busy || active} onChange={(event) => setPort(event.target.value)} slotProps={{ htmlInput: { min: 1024, max: 65535 } }} size="small" />
    <FormControlLabel control={<Checkbox checked={confirmed} disabled={busy || active} onChange={(event) => setConfirmed(event.target.checked)} />} label="I selected the exact ROM currently loaded in MelonDS." />
    <Typography variant="caption">Matching headers do not prove that two randomized ROMs use the same seed. ROM tables stay local; only your own Pokemon and visible observations are sent to the tracker.</Typography>
    <Stack direction="row" spacing={1}>
      <Button disabled={busy || active || !confirmed || !info || run.gameVersion !== "platinum"} onClick={() => void perform(async () => {
        if (!window.nuztracker) throw new Error("MelonDS tracking requires the desktop application.");
        setDesktopStatus(await window.nuztracker.connectMelonDs(connectMelonDsSchema.parse({
          runId: run.id, playerId: playerByRun[run.id] ?? getPlayerId(run),
          port: Number(port), confirmRomMatch: confirmed,
        })));
      })}>Connect MelonDS</Button>
      <Button disabled={busy || !info} onClick={() => void perform(async () => {
        if (!window.nuztracker) throw new Error("MelonDS tracking requires the desktop application.");
        setDesktopStatus(await window.nuztracker.disconnectMelonDs());
      })}>Disconnect</Button>
    </Stack>
  </Stack>;
}
