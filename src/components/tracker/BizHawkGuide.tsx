"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Stack,
  Step,
  StepButton,
  StepContent,
  Stepper,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import OpenLightTrackerButton from "./OpenLightTrackerButton";

const tr = translations.bizHawk;
const hub = translations.hub;

export default function BizHawkGuide({
  run,
  insideLight = false,
}: {
  run: Run;
  insideLight?: boolean;
}) {
  const { desktopStatus, playerByRun, setDesktopStatus, reportError } =
    useRunStore();
  const { lang } = useLanguage();
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const bridge = desktopStatus?.bridge;
  const isBound = bridge?.runId === run.id && bridge.playerId === playerId;
  const receiving = isBound && Boolean(bridge?.lastSeenAt);
  const [step, setStep] = useState(receiving ? 3 : isBound ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function perform(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  const actions = (index: number, next?: ReactNode) => (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
      {index > 0 && (
        <Button disabled={busy} onClick={() => setStep(index - 1)}>
          {t(hub.previous, lang)}
        </Button>
      )}
      {next}
    </Stack>
  );

  const steps: { label: string; done: boolean; content: ReactNode }[] = [
    {
      label: t(tr.bindStep, lang),
      done: isBound,
      content: (
        <>
          <Typography variant="body2">{t(tr.bindIntro, lang)}</Typography>
          {actions(
            0,
            <Button
              variant="contained"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  if (!window.nuztracker) return;
                  setDesktopStatus(
                    await window.nuztracker.bindBridge({
                      runId: run.id,
                      playerId,
                    }),
                  );
                  setStep(1);
                })
              }
            >
              {t(isBound ? tr.rebind : tr.bind, lang)}
            </Button>,
          )}
        </>
      ),
    },
    {
      label: t(tr.scriptStep, lang),
      done: saved,
      content: (
        <>
          <Typography variant="body2">{t(tr.scriptIntro, lang)}</Typography>
          {saved && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {t(tr.scriptSaved, lang)}
            </Alert>
          )}
          {actions(
            1,
            <>
              <Button
                variant={saved ? "outlined" : "contained"}
                disabled={busy || !isBound}
                onClick={() =>
                  void perform(async () => {
                    if (await window.nuztracker?.saveConnector()) {
                      setSaved(true);
                      setStep(2);
                    }
                  })
                }
              >
                {t(tr.saveScript, lang)}
              </Button>
              {saved && (
                <Button variant="contained" onClick={() => setStep(2)}>
                  {t(hub.next, lang)}
                </Button>
              )}
            </>,
          )}
        </>
      ),
    },
    {
      label: t(tr.loadStep, lang),
      done: receiving,
      content: (
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t(tr.loadInstructions, lang)}
          </Typography>
          <Alert severity={receiving ? "success" : "info"}>
            {t(receiving ? tr.tracking : tr.waiting, lang)}
          </Alert>
          {bridge?.error && <Alert severity="error">{bridge.error}</Alert>}
          {actions(
            2,
            <Button variant="contained" onClick={() => setStep(3)}>
              {t(hub.next, lang)}
            </Button>,
          )}
        </Stack>
      ),
    },
    {
      label: t(hub.lightStep, lang),
      done: false,
      content: (
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t(insideLight ? hub.alreadyLight : hub.lightExplanation, lang)}
          </Typography>
          {actions(
            3,
            !insideLight && <OpenLightTrackerButton runId={run.id} />,
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        {t(tr.requirement, lang)}
      </Typography>
      <Stepper nonLinear activeStep={step} orientation="vertical">
        {steps.map((entry, index) => (
          <Step key={entry.label} completed={entry.done}>
            <StepButton disabled={busy} onClick={() => setStep(index)}>
              {entry.label}
            </StepButton>
            <StepContent>{entry.content}</StepContent>
          </Step>
        ))}
      </Stepper>
    </Stack>
  );
}
