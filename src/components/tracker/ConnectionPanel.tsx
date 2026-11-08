"use client";

import { useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { useRunStore } from "@/store/runStore";
import ArchiveControls from "./ArchiveControls";
import CompatibilityInfo from "./CompatibilityInfo";
import OverlayControls from "./OverlayControls";
import MelonDsPanel from "./MelonDsPanel";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.connections;

export default function ConnectionPanel({
  run,
  compact = false,
  minimal = false,
}: {
  run?: Run;
  compact?: boolean;
  minimal?: boolean;
}) {
  const {
    desktopStatus,
    playerByRun,
    setPlayer,
    setDesktopStatus,
    reportError,
  } = useRunStore();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [allowLan, setAllowLan] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(false);
  const [port, setPort] = useState("47070");
  const [address, setAddress] = useState("");
  const [invitation, setInvitation] = useState("");
  const [joinPlayerId, setJoinPlayerId] = useState("p2");
  const [overlayUrl, setOverlayUrl] = useState("");
  const [notice, setNotice] = useState("");
  const playerId = run ? (playerByRun[run.id] ?? getPlayerId(run)) : "solo";
  const room = desktopStatus?.room;
  const roomActive = room && room.mode !== "offline";
  const ownRun = Boolean(run && room?.runId === run.id);
  const isBound = Boolean(
    run &&
    desktopStatus?.bridge.runId === run.id &&
    desktopStatus.bridge.playerId === playerId,
  );

  async function perform(action: () => Promise<unknown>) {
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

  return (
    <Box sx={{ p: minimal ? 0 : 2 }}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", rowGap: 2.5, alignItems: "center" }}
      >
        {run && !compact && (
          <Button
            variant="contained"
            component={desktopStatus ? "button" : NextLink}
            href={desktopStatus ? undefined : `/compact/?id=${run.id}`}
            onClick={
              desktopStatus
                ? () =>
                    void perform(async () =>
                      window.nuztracker?.openCompact(run.id),
                    )
                : undefined
            }
          >
            {t(tr.openLight, lang)}
          </Button>
        )}
        <Button
          size={minimal ? "small" : "medium"}
          aria-label={t(tr.ariaLabel, lang)}
          variant="outlined"
          onClick={() => setOpen(true)}
        >
          {minimal ? "..." : t(tr.button, lang)}
        </Button>
        {!compact && <CompatibilityInfo run={run} />}
        {run && !compact && <ArchiveControls runId={run.id} />}
        {!minimal && (
          <Chip
            size="small"
            label={t(
              desktopStatus ? tr.sqliteStorage : tr.browserStorage,
              lang,
            )}
          />
        )}
        {!minimal && roomActive && (
          <Chip
            size="small"
            color={
              room.mode === "connected" || room.mode === "hosting"
                ? "success"
                : "warning"
            }
            label={`SoulLink: ${room.mode}`}
          />
        )}
        {!minimal && run?.isSoulLinkMode && (
          <TextField
            select
            size="small"
            label={t(tr.knowledgePlayer, lang)}
            value={playerId}
            disabled={busy || ownRun}
            onChange={(event) => setPlayer(run.id, event.target.value)}
            sx={{ minWidth: 200 }}
          >
            {run.soulLinkPlayers?.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
      {room?.error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {room.error}
        </Alert>
      )}
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t(tr.title, lang)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {compact && <CompatibilityInfo run={run} />}
            {compact && run && <ArchiveControls runId={run.id} />}
            {!desktopStatus ? (
              <Alert severity="info">{t(tr.desktopOnly, lang)}</Alert>
            ) : (
              <>
                <Typography variant="body2">
                  {t(tr.savedLocally, lang)} {desktopStatus.storagePath}
                </Typography>
                {run && (
                  <>
                    <MelonDsPanel run={run} />
                    <Divider />
                    <Typography variant="h6">BizHawk / FireRed</Typography>
                    <Alert severity="info">{t(tr.luaInfo, lang)}</Alert>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            if (window.nuztracker)
                              setDesktopStatus(
                                await window.nuztracker.bindBridge({
                                  runId: run.id,
                                  playerId,
                                }),
                              );
                          })
                        }
                      >
                        {t(isBound ? tr.reconnectGame : tr.connectGame, lang)}
                      </Button>
                      <Button
                        disabled={busy || !isBound}
                        onClick={() =>
                          void perform(async () => {
                            if (await window.nuztracker?.saveConnector())
                              setNotice(t(tr.luaSaved, lang));
                          })
                        }
                      >
                        {t(tr.saveLua, lang)}
                      </Button>
                    </Stack>
                    {desktopStatus.bridge.error && (
                      <Alert severity="error">
                        {desktopStatus.bridge.error}
                      </Alert>
                    )}
                    <Divider />
                  </>
                )}
                <Typography variant="h6">{t(tr.room, lang)}</Typography>
                {roomActive ? (
                  <>
                    <Alert
                      severity={room.mode === "conflict" ? "warning" : "info"}
                    >
                      {t(tr.roomStatus, lang)(room.mode, room.pendingCount)}
                      {room.playerId && t(tr.youControl, lang)(room.playerId)}
                    </Alert>
                    {room.participants.map((player) => (
                      <Chip
                        key={player.playerId}
                        label={`${player.name}: ${t(player.connected ? tr.connected : tr.offline, lang)}`}
                        color={player.connected ? "success" : "default"}
                      />
                    ))}
                    {room.mode === "hosting" && (
                      <>
                        <TextField
                          label={t(tr.roomAddress, lang)}
                          value={room.address ?? ""}
                          slotProps={{ input: { readOnly: true } }}
                        />
                        <TextField
                          label={t(tr.invitationShare, lang)}
                          value={room.invitation ?? ""}
                          slotProps={{ input: { readOnly: true } }}
                        />
                      </>
                    )}
                    <Stack direction="row" spacing={1}>
                      {room.mode !== "hosting" && (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              if (window.nuztracker)
                                setDesktopStatus(
                                  await window.nuztracker.reconnectRoom(),
                                );
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
                              setDesktopStatus(
                                await window.nuztracker.leaveRoom(),
                              );
                          });
                        }}
                      >
                        {t(tr.leave, lang)}
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <>
                    {run?.isSoulLinkMode && (
                      <>
                        <TextField
                          label={t(tr.hostPort, lang)}
                          type="number"
                          value={port}
                          onChange={(event) => setPort(event.target.value)}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={allowLan}
                              onChange={(_event, checked) =>
                                setAllowLan(checked)
                              }
                            />
                          }
                          label={t(tr.allowLan, lang)}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={resetCredentials}
                              onChange={(_event, checked) =>
                                setResetCredentials(checked)
                              }
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
                                    resetCredentials,
                                  }),
                                );
                            })
                          }
                        >
                          {t(tr.host, lang)}
                        </Button>
                        <Divider />
                      </>
                    )}
                    <TextField
                      label={t(tr.roomAddress, lang)}
                      placeholder="ws://192.168.1.10:47070/room"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                    <TextField
                      label={t(tr.invitation, lang)}
                      value={invitation}
                      onChange={(event) => setInvitation(event.target.value)}
                    />
                    <TextField
                      label={t(tr.joinPlayerId, lang)}
                      value={joinPlayerId}
                      onChange={(event) => setJoinPlayerId(event.target.value)}
                      helperText={t(tr.joinPlayerHint, lang)}
                    />
                    <Button
                      variant="outlined"
                      disabled={busy || !address || !invitation}
                      onClick={() =>
                        void perform(async () => {
                          if (window.nuztracker)
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
                    <Alert severity="warning">
                      {t(tr.networkWarning, lang)}
                    </Alert>
                  </>
                )}
                {run && (
                  <>
                    <Divider />
                    <Typography variant="h6">{t(tr.overlay, lang)}</Typography>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          if (window.nuztracker)
                            setOverlayUrl(
                              await window.nuztracker.getOverlayUrl(run.id),
                            );
                        })
                      }
                    >
                      {t(tr.getOverlayUrl, lang)}
                    </Button>
                    {overlayUrl && (
                      <>
                        <TextField
                          label={t(tr.overlayUrl, lang)}
                          value={overlayUrl}
                          slotProps={{ input: { readOnly: true } }}
                          helperText={t(tr.overlayUrlHint, lang)}
                        />
                        <TextField
                          label={t(tr.compactOverlayUrl, lang)}
                          value={overlayUrl.replace(
                            "/overlay/?",
                            "/overlay/?style=compact&",
                          )}
                          slotProps={{ input: { readOnly: true } }}
                        />
                      </>
                    )}
                    <Typography variant="body2">
                      {t(tr.overlayInfo, lang)}
                    </Typography>
                    <OverlayControls run={run} />
                  </>
                )}
                {notice && <Alert severity="success">{notice}</Alert>}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setOpen(false)}>
            {t(tr.close, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
