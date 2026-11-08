"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  exportArchive,
  MAX_ARCHIVE_BYTES,
  readArchive,
  readLegacyRuns,
} from "@/lib/tracker/archive";
import type { RunRecord } from "@/lib/tracker/types";
import { useRunStore } from "@/store/runStore";

export default function ArchiveControls({ runId }: { runId?: string }) {
  const { records, loaded, pending, importRecords, reportError } =
    useRunStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<RunRecord[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function download(scope: "personal" | "shared") {
    setBusy(true);
    try {
      const selection = runId
        ? records.filter((record) => record.run.id === runId)
        : records;
      const content = await exportArchive(selection, scope);
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nuztracker-${scope}-${new Date().toISOString().slice(0, 10)}.nuzrun`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  async function inspectFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_ARCHIVE_BYTES)
        throw new Error("The archive exceeds the 50 MB import limit.");
      const content = await file.text();
      const parsed: unknown = JSON.parse(content);
      setPreview(
        Array.isArray(parsed)
          ? readLegacyRuns(content)
          : await readArchive(content),
      );
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function restore() {
    if (!preview) return;
    setBusy(true);
    try {
      if (await importRecords(preview)) setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          disabled={!loaded || busy || pending > 0}
          onClick={() => fileInput.current?.click()}
        >
          Import backup
        </Button>
        <Button
          variant="outlined"
          disabled={!loaded || !records.length || busy || pending > 0}
          onClick={() => void download("personal")}
        >
          Export {runId ? "run" : "all runs"}
        </Button>
        {runId && (
          <Button
            disabled={busy || pending > 0}
            onClick={() => void download("shared")}
          >
            Export shared copy
          </Button>
        )}
      </Stack>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept=".nuzrun,.json"
        aria-label="Import NuzTracker backup"
        onChange={(event) => void inspectFile(event.target.files?.[0])}
      />
      <Dialog
        open={preview !== null}
        onClose={() => {
          if (!busy) setPreview(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Import backup as new runs</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Existing runs will not be overwritten. Emulator saves and room
            credentials are not part of this backup.
          </Alert>
          {preview?.map((record, index) => (
            <Typography key={`${record.run.id}-${index}`} sx={{ mb: 1 }}>
              {record.run.gameName} —{" "}
              {record.run.zones.reduce(
                (count, zone) => count + zone.captures.length,
                0,
              )}{" "}
              captures, {record.observations.length} observations
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setPreview(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void restore()}
          >
            Import copies
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
