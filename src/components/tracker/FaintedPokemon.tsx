"use client";

import { useState } from "react";
import { Alert, AlertTitle, Button, Stack, Typography } from "@mui/material";
import type { Capture, Run } from "@/lib/types";
import type { RunRecord } from "@/lib/tracker/types";
import { getPlayerId, getPlayerIndex } from "@/lib/tracker/knowledge";
import { resolvePendingFaint, reviveCapture } from "@/lib/tracker/run-rules";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.faintedPokemon;

export function faintedInParty(
  record: RunRecord | undefined,
  playerId: string,
): Capture[] {
  if (!record) return [];
  const index = getPlayerIndex(record.run, playerId);
  const identities = new Set(
    record.tracking[playerId]?.latest.party.map((pokemon) => pokemon.identity),
  );
  return record.run.zones
    .flatMap((zone) => zone.captures)
    .filter(
      (capture) =>
        capture.isDead &&
        (capture.playerIndex ?? 0) === index &&
        capture.gameIdentity &&
        identities.has(capture.gameIdentity),
    );
}

export function pendingFaints(run: Run, playerId: string): Capture[] {
  const index = getPlayerIndex(run, playerId);
  return run.zones
    .flatMap((zone) => zone.captures)
    .filter(
      (capture) =>
        capture.faintPendingAt &&
        !capture.isDead &&
        (capture.playerIndex ?? 0) === index,
    );
}

/** Shows faints waiting for the player's decision and dead Pokémon still carried in the game party. */
export default function FaintedPokemon({
  run,
  compact = false,
}: {
  run: Run;
  compact?: boolean;
}) {
  const { records, playerByRun, updateRun, canEditRun } = useRunStore();
  const { lang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const pending = pendingFaints(run, playerId);
  const fainted = faintedInParty(
    records.find((record) => record.run.id === run.id),
    playerId,
  );
  if (!pending.length && !fainted.length) return null;
  const editable = canEditRun(run.id, playerId);
  const label = (capture: Capture) =>
    capture.nickname ??
    capture.pokemon.names?.[lang] ??
    capture.pokemon.technicalName;
  const textSx = { fontSize: compact ? "0.75rem" : undefined };

  async function apply(update: () => Run, question?: string) {
    if (question && !window.confirm(question)) return;
    setBusy(true);
    try {
      await updateRun(update(), run);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={1} sx={{ mt: compact ? 1 : 0 }}>
      {pending.length > 0 && (
        <Alert severity="warning">
          <AlertTitle sx={{ fontSize: compact ? "0.8rem" : undefined }}>
            {t(tr.pendingTitle, lang)}
          </AlertTitle>
          {!compact && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t(tr.pendingIntro, lang)}
            </Typography>
          )}
          <Stack spacing={0.75}>
            {pending.map((capture) => (
              <Stack
                key={capture.id}
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                <Typography variant="body2" sx={{ ...textSx, mr: "auto" }}>
                  {t(tr.pendingLine, lang)(label(capture))}
                </Typography>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  disabled={busy || !editable}
                  onClick={() =>
                    void apply(() => resolvePendingFaint(run, capture.id, true))
                  }
                >
                  {t(tr.countDeath, lang)}
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  disabled={busy || !editable}
                  onClick={() =>
                    void apply(() =>
                      resolvePendingFaint(run, capture.id, false),
                    )
                  }
                >
                  {t(tr.ignore, lang)}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}
      {fainted.length > 0 && (
        <Alert severity="error">
          <AlertTitle sx={{ fontSize: compact ? "0.8rem" : undefined }}>
            {t(tr.title, lang)}
          </AlertTitle>
          {!compact && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t(tr.intro, lang)}
            </Typography>
          )}
          <Stack spacing={0.5}>
            {fainted.map((capture) => (
              <Stack
                key={capture.id}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography variant="body2" sx={textSx}>
                  {t(
                    capture.linkedDeath ? tr.linked : tr.fainted,
                    lang,
                  )(label(capture))}
                </Typography>
                {!capture.linkedDeath && (
                  <Button
                    size="small"
                    color="inherit"
                    variant="outlined"
                    disabled={busy || !editable}
                    onClick={() =>
                      void apply(
                        () => reviveCapture(run, capture.id),
                        t(tr.confirm, lang),
                      )
                    }
                    sx={{ flexShrink: 0 }}
                  >
                    {t(tr.undo, lang)}
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
