"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { copyText } from "@/lib/clipboard";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.connections;
const hub = translations.hub;

const MASK = "••••••••";

function maskSecret(value: string, kind: "address" | "secret"): string {
  if (!value) return "";
  if (kind === "secret") return MASK;
  return value.replace(/^(wss?:\/\/)(\[[^\]]+\]|[^/:]+)/, `$1${MASK}`);
}

function SecretField({
  label,
  value,
  revealed,
  kind,
  helperText,
}: {
  label: string;
  value: string;
  revealed: boolean;
  kind: "address" | "secret";
  helperText?: string;
}) {
  const { lang } = useLanguage();
  const { reportError } = useRunStore();
  const [copied, setCopied] = useState(false);
  return (
    <TextField
      label={label}
      value={revealed ? value : maskSecret(value, kind)}
      helperText={helperText}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <Button
              size="small"
              sx={{ flexShrink: 0 }}
              disabled={!value}
              onClick={() =>
                void copyText(value)
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  })
                  .catch(reportError)
              }
            >
              {t(copied ? tr.copied : tr.copy, lang)}
            </Button>
          ),
        },
      }}
    />
  );
}

export default function SoulLinkRoomPanel({ run }: { run?: Run }) {
  const { desktopStatus, playerByRun, setDesktopStatus, reportError } =
    useRunStore();
  const { lang } = useLanguage();
  const canHost = Boolean(run?.isSoulLinkMode);
  const [mode, setMode] = useState<"host" | "join">(canHost ? "host" : "join");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [allowLan, setAllowLan] = useState(true);
  const [secure, setSecure] = useState(false);
  const [publicHost, setPublicHost] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(false);
  const [port, setPort] = useState("47070");
  const [address, setAddress] = useState("");
  const [invitation, setInvitation] = useState("");
  const [joinPlayerId, setJoinPlayerId] = useState("p2");
  const room = desktopStatus?.room;
  const playerId = run ? (playerByRun[run.id] ?? getPlayerId(run)) : "solo";

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  const revealToggle = (
    <Button
      size="small"
      variant="outlined"
      sx={{ alignSelf: "flex-start" }}
      aria-pressed={revealed}
      onClick={() => setRevealed((value) => !value)}
    >
      {t(revealed ? tr.hideSecrets : tr.showSecrets, lang)}
    </Button>
  );
  if (!desktopStatus || !room) return null;

  if (room.mode !== "offline")
    return (
      <Stack spacing={1.5}>
        <Alert severity={room.mode === "conflict" ? "warning" : "info"}>
          {t(tr.roomStatus, lang)(room.mode, room.pendingCount)}
          {room.playerId && t(tr.youControl, lang)(room.playerId)}
        </Alert>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {room.participants.map((player) => (
            <Chip
              key={player.playerId}
              label={`${player.name}: ${t(player.connected ? tr.connected : tr.offline, lang)}`}
              color={player.connected ? "success" : "default"}
            />
          ))}
        </Stack>
        {room.mode === "hosting" && (
          <>
            {revealToggle}
            {room.address?.includes("://127.0.0.1:") && (
              <Alert severity="warning">{t(tr.localOnlyAddress, lang)}</Alert>
            )}
            <SecretField
              label={t(tr.roomAddress, lang)}
              value={room.address ?? ""}
              revealed={revealed}
              kind="address"
              helperText={t(
                room.secure ? tr.secureAddressHint : tr.roomAddressHint,
                lang,
              )}
            />
            {room.addresses && room.addresses.length > 1 && (
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t(tr.otherAddresses, lang)}
                </Typography>
                {room.addresses.slice(1).map((entry) => (
                  <SecretField
                    key={entry}
                    label={t(tr.roomAddress, lang)}
                    value={entry}
                    revealed={revealed}
                    kind="address"
                  />
                ))}
              </Stack>
            )}
            <SecretField
              label={t(tr.invitationShare, lang)}
              value={room.invitation ?? ""}
              revealed={revealed}
              kind="secret"
            />
          </>
        )}{" "}
        <Stack direction="row" spacing={1}>
          {room.mode !== "hosting" && (
            <Button
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  if (window.nuztracker)
                    setDesktopStatus(await window.nuztracker.reconnectRoom());
                })
              }
            >
              {t(tr.reconnect, lang)}
            </Button>
          )}
          <Button
            color="warning"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(t(tr.leaveConfirm, lang))) return;
              void perform(async () => {
                if (window.nuztracker)
                  setDesktopStatus(await window.nuztracker.leaveRoom());
              });
            }}
          >
            {t(tr.leave, lang)}
          </Button>
        </Stack>
      </Stack>
    );

  return (
    <Stack spacing={2}>
      {canHost && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_event, value) => value && setMode(value)}
        >
          <ToggleButton value="host">{t(hub.hostChoice, lang)}</ToggleButton>
          <ToggleButton value="join">{t(hub.joinChoice, lang)}</ToggleButton>
        </ToggleButtonGroup>
      )}
      {mode === "host" && run ? (
        <>
          <TextField
            label={t(tr.hostPort, lang)}
            type="number"
            value={port}
            onChange={(event) => setPort(event.target.value)}
            sx={{ width: 180 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={allowLan}
                onChange={(_event, checked) => setAllowLan(checked)}
              />
            }
            label={t(tr.allowLan, lang)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={secure}
                onChange={(_event, checked) => setSecure(checked)}
              />
            }
            label={t(tr.allowInternet, lang)}
          />
          {secure && (
            <TextField
              label={t(tr.publicHost, lang)}
              placeholder="nuz.example.com"
              type={revealed ? "text" : "password"}
              value={publicHost}
              onChange={(event) => setPublicHost(event.target.value)}
              helperText={t(tr.publicHostHint, lang)(port)}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={resetCredentials}
                onChange={(_event, checked) => setResetCredentials(checked)}
              />
            }
            label={t(tr.resetCredentials, lang)}
          />
          <Button
            variant="contained"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                if (window.nuztracker)
                  setDesktopStatus(
                    await window.nuztracker.hostRoom({
                      runId: run.id,
                      playerId,
                      port: Number(port),
                      allowLan,
                      secure,
                      ...(secure && publicHost.trim()
                        ? { publicHost: publicHost.trim() }
                        : {}),
                      resetCredentials,
                    }),
                  );
              })
            }
          >
            {t(tr.host, lang)}
          </Button>
        </>
      ) : (
        <>
          {revealToggle}
          <TextField
            label={t(tr.roomAddress, lang)}
            placeholder="wss://203.0.113.10:47070/room"
            type={revealed ? "text" : "password"}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <TextField
            label={t(tr.invitation, lang)}
            type={revealed ? "text" : "password"}
            value={invitation}
            onChange={(event) => setInvitation(event.target.value)}
          />{" "}
          <TextField
            label={t(tr.joinPlayerId, lang)}
            value={joinPlayerId}
            onChange={(event) => setJoinPlayerId(event.target.value)}
            helperText={t(tr.joinPlayerHint, lang)}
          />
          <Button
            variant="contained"
            disabled={busy || !address || !invitation}
            onClick={() =>
              void perform(async () => {
                if (!window.nuztracker) return;
                setDesktopStatus(
                  await window.nuztracker.joinRoom({
                    address: address.trim(),
                    invitation: invitation.trim(),
                    playerId: joinPlayerId.trim(),
                  }),
                );
                setNotice(t(tr.joined, lang));
              })
            }
          >
            {t(tr.join, lang)}
          </Button>
        </>
      )}
      <Alert severity="warning">{t(tr.networkWarning, lang)}</Alert>
      {notice && <Alert severity="success">{notice}</Alert>}
    </Stack>
  );
}
