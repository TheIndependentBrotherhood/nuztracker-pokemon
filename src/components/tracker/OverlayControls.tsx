"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { copyText } from "@/lib/clipboard";
import {
  overlayCommandSchema,
  type OverlayControlConfig,
} from "@/lib/tracker/overlay-control";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.overlayControls;

function CopyField({
  label,
  value,
  onCopied,
  helperText,
  type,
}: {
  label: string;
  value: string;
  onCopied: () => void;
  helperText?: string;
  type?: string;
}) {
  const { lang } = useLanguage();
  return (
    <TextField
      label={label}
      value={value}
      type={type}
      helperText={helperText}
      size="small"
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <Button
                size="small"
                onClick={() => void copyText(value).then(onCopied)}
              >
                {t(tr.copy, lang)}
              </Button>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export default function OverlayControls({ run }: { run: Run }) {
  const { lang } = useLanguage();
  const { reportError, playerByRun } = useRunStore();
  const [overlayUrl, setOverlayUrl] = useState("");
  const [config, setConfig] = useState<OverlayControlConfig>();
  const [action, setAction] = useState("show-team");
  const [duration, setDuration] = useState("10");
  const [slot, setSlot] = useState("1");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const playerId = playerByRun[run.id] ?? getPlayerId(run);
  const command = {
    action,
    ...(action !== "hide" ? { playerId } : {}),
    ...(duration.trim() ? { durationSeconds: Number(duration) } : {}),
    ...(action === "show-pokemon" ? { slot: Number(slot) } : {}),
  };
  const copied = () => setNotice(t(tr.copied, lang));

  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setNotice("");
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

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t(tr.obsTitle, lang)}
      </Typography>
      <Typography variant="body2">{t(tr.obsIntro, lang)}</Typography>
      {overlayUrl ? (
        <>
          <CopyField
            label={t(tr.teamUrl, lang)}
            value={overlayUrl}
            onCopied={copied}
          />
          <CopyField
            label={t(tr.ribbonUrl, lang)}
            value={overlayUrl.replace("/overlay/?", "/overlay/?style=compact&")}
            onCopied={copied}
          />
        </>
      ) : (
        <Button
          variant="outlined"
          disabled={busy}
          sx={{ alignSelf: "flex-start" }}
          onClick={() =>
            void perform(async () =>
              setOverlayUrl(await requireDesktop().getOverlayUrl(run.id)),
            )
          }
        >
          {t(tr.getUrl, lang)}
        </Button>
      )}

      <Divider />

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t(tr.remoteTitle, lang)}
      </Typography>
      <Typography variant="body2">{t(tr.remoteIntro, lang)}</Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label={t(tr.action, lang)}
          value={action}
          onChange={(event) => setAction(event.target.value)}
          fullWidth
        >
          <MenuItem value="show-team">{t(tr.showTeam, lang)}</MenuItem>
          <MenuItem value="show-pokemon">{t(tr.showPokemon, lang)}</MenuItem>
          <MenuItem value="live">{t(tr.live, lang)}</MenuItem>
          <MenuItem value="hide">{t(tr.hide, lang)}</MenuItem>
        </TextField>
        {action === "show-pokemon" && (
          <TextField
            select
            size="small"
            label={t(tr.slot, lang)}
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            sx={{ width: 160, flexShrink: 0 }}
          >
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <MenuItem key={index} value={String(index)}>
                {index}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          size="small"
          label={t(tr.seconds, lang)}
          type="number"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          sx={{ width: 110, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 0.25, max: 3600, step: 0.25 } }}
        />
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              await requireDesktop().commandOverlay({
                runId: run.id,
                command: overlayCommandSchema.parse(command),
              });
              setNotice(t(tr.applied, lang));
            })
          }
        >
          {t(tr.test, lang)}
        </Button>
        {!config && (
          <Button
            disabled={busy}
            onClick={() =>
              void perform(async () =>
                setConfig(
                  await requireDesktop().getOverlayControlConfig(run.id),
                ),
              )
            }
          >
            {t(tr.configure, lang)}
          </Button>
        )}
      </Stack>
      {config && (
        <>
          <CopyField
            label={t(tr.postUrl, lang)}
            value={config.url}
            onCopied={copied}
          />
          <CopyField
            label={t(tr.authorization, lang)}
            type="password"
            value={`Bearer ${config.token}`}
            helperText={t(tr.authorizationHint, lang)}
            onCopied={() => setNotice(t(tr.authorizationCopied, lang))}
          />
          <TextField
            label={t(tr.body, lang)}
            multiline
            size="small"
            value={JSON.stringify(command, null, 2)}
            slotProps={{ input: { readOnly: true } }}
            helperText={t(tr.bodyHint, lang)}
          />
        </>
      )}
      {notice && <Alert severity="success">{notice}</Alert>}
    </Stack>
  );
}
