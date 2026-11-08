"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Step,
  StepButton,
  StepContent,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { connectMelonDsSchema } from "@/lib/tracker/schema";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import OpenLightTrackerButton from "./OpenLightTrackerButton";

const tr = translations.melonDs;
const hub = translations.hub;

export default function MelonDsPanel({
  run,
  insideLight = false,
}: {
  run: Run;
  insideLight?: boolean;
}) {
  const { desktopStatus, playerByRun, setDesktopStatus, reportError } =
    useRunStore();
  const { lang } = useLanguage();
  const info = desktopStatus?.melonDs;
  const active = info?.attached ?? false;
  const [port, setPort] = useState(String(info?.port ?? 3333));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(active ? 2 : info ? 1 : 0);
  const isPlatinum = run.gameVersion === "platinum";

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

  function requireDesktop() {
    if (!window.nuztracker) throw new Error(t(tr.desktopOnly, lang));
    return window.nuztracker;
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

  const steps: { label: string; content: ReactNode }[] = [
    {
      label: t(tr.prepareStep, lang),
      content: (
        <>
          <Typography variant="body2">{t(tr.prepareIntro, lang)}</Typography>
          <Box component="ol" sx={{ pl: 2.5, my: 1, "& li": { mb: 0.5 } }}>
            <li>{t(tr.prepareSettings, lang)}</li>
            <li>{t(tr.prepareJit, lang)}</li>
            <li>{t(tr.prepareGdb, lang)}</li>
            <li>{t(tr.prepareReset, lang)}</li>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t(tr.prepareSafety, lang)}
          </Typography>
          {actions(
            0,
            <Button variant="contained" onClick={() => setStep(1)}>
              {t(hub.done, lang)}
            </Button>,
          )}
        </>
      ),
    },
    {
      label: t(tr.romStep, lang),
      content: (
        <Stack spacing={1.5}>
          <Typography variant="body2">{t(tr.romIntro, lang)}</Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
            useFlexGap
          >
            <Button
              variant="outlined"
              disabled={busy || active}
              onClick={() =>
                void perform(async () => {
                  if (await requireDesktop().selectMelonDsRom())
                    setConfirmed(false);
                })
              }
            >
              {t(tr.selectRom, lang)}
            </Button>
            <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
              {info
                ? `${info.romName} (${info.gameCode} ${t(tr.revision, lang)} ${info.revision})`
                : t(tr.noRom, lang)}
            </Typography>
          </Stack>
          <TextField
            label={t(tr.port, lang)}
            type="number"
            value={port}
            disabled={busy || active}
            onChange={(event) => setPort(event.target.value)}
            slotProps={{ htmlInput: { min: 1024, max: 65535 } }}
            size="small"
            sx={{ width: 160 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed || active}
                disabled={busy || active || !info}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
            }
            label={t(tr.confirmRom, lang)}
          />
          <Typography variant="caption" color="text.secondary">
            {t(tr.seedWarning, lang)}
          </Typography>
          {actions(
            1,
            <Button
              variant="contained"
              disabled={!info || !(confirmed || active)}
              onClick={() => setStep(2)}
            >
              {t(hub.next, lang)}
            </Button>,
          )}
        </Stack>
      ),
    },
    {
      label: t(tr.connectStep, lang),
      content: (
        <Stack spacing={1.5}>
          {active ? (
            <Alert severity={info?.state === "tracking" ? "success" : "info"}>
              {t(info?.state === "tracking" ? tr.tracking : tr.waiting, lang)}
            </Alert>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {t(tr.troubleshoot, lang)}
            </Typography>
          )}
          {actions(
            2,
            <>
              {active ? (
                <>
                  <Button
                    disabled={busy}
                    color="warning"
                    onClick={() =>
                      void perform(async () =>
                        setDesktopStatus(
                          await requireDesktop().disconnectMelonDs(),
                        ),
                      )
                    }
                  >
                    {t(tr.disconnect, lang)}
                  </Button>
                  <Button variant="contained" onClick={() => setStep(3)}>
                    {t(hub.next, lang)}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  disabled={busy || !confirmed || !info}
                  onClick={() =>
                    void perform(async () => {
                      const status = await requireDesktop().connectMelonDs(
                        connectMelonDsSchema.parse({
                          runId: run.id,
                          playerId: playerByRun[run.id] ?? getPlayerId(run),
                          port: Number(port),
                          confirmRomMatch: confirmed,
                        }),
                      );
                      setDesktopStatus(status);
                      if (status.melonDs?.attached) setStep(3);
                    })
                  }
                >
                  {t(tr.connect, lang)}
                </Button>
              )}
            </>,
          )}
        </Stack>
      ),
    },
    {
      label: t(hub.lightStep, lang),
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

  if (!isPlatinum)
    return <Alert severity="warning">{t(tr.platinumRequired, lang)}</Alert>;

  return (
    <Stepper nonLinear activeStep={step} orientation="vertical">
      {steps.map((entry, index) => (
        <Step
          key={entry.label}
          completed={
            index === 1 ? Boolean(info) : index === 2 ? active : index < step
          }
        >
          <StepButton disabled={busy} onClick={() => setStep(index)}>
            {entry.label}
          </StepButton>
          <StepContent>{entry.content}</StepContent>
        </Step>
      ))}
    </Stepper>
  );
}
