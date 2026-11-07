"use client";

import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { GAME_VERSIONS, getGameVersion } from "@/lib/game-catalog";
import type { Run } from "@/lib/types";

export default function CompatibilityInfo({ run }: { run?: Run }) {
  const [open, setOpen] = useState(false);
  const game = getGameVersion(run?.gameVersion);
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>Compatibility</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Games and emulator compatibility</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {run && <Alert severity={game ? "info" : "warning"}>
              {game ? `${game.name} / ${game.region} / ${game.console}` : "This run has no game version. Choose one in Run settings; a region alone does not identify the game."}
            </Alert>}
            <Typography>Manual tracking works in the browser and desktop, with any emulator or original console. Automatic tracking requires the desktop application and a matching connector.</Typography>
            <Alert severity="warning">
              MelonDS 1.1 requires the ARM9 GDB stub, with JIT disabled and break-on-startup disabled. Platinum ROMs must retain a supported memory layout; translations and multiplayer patches are not all interchangeable.
            </Alert>
            <Table size="small" aria-label="Game compatibility">
              <TableHead><TableRow>
                <TableCell>Region / game</TableCell><TableCell>Console</TableCell><TableCell>Manual</TableCell><TableCell>Automatic</TableCell>
              </TableRow></TableHead>
              <TableBody>{GAME_VERSIONS.map((entry) => <TableRow key={entry.id}>
                <TableCell sx={{ textTransform: "capitalize" }}>{entry.region} / {entry.name}</TableCell>
                <TableCell>{entry.console}</TableCell><TableCell>Yes</TableCell>
                <TableCell>{entry.id === "firered" ? "Experimental: BizHawk, BPRE English v1.0" : entry.id === "platinum" ? "Experimental: MelonDS 1.1 GDB, CPUE / CPUF v0-1" : "No connector"}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
            <Typography variant="body2">Reference stats, types and abilities use local generation-specific tables. They are not a dump of your randomizer seed. Unknown randomized base stats remain hidden; + / - markers are your own estimates. Encounter references, when shown, describe the unmodified game.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
}
