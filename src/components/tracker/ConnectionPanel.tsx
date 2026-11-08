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
            Open light tracker
          </Button>
        )}
        <Button size={minimal ? "small" : "medium"} aria-label="Tracker connections" variant="outlined" onClick={() => setOpen(true)}>
          {minimal ? "..." : "Connections"}
        </Button>
        {!compact && <CompatibilityInfo run={run} />}
        {run && !compact && <ArchiveControls runId={run.id} />}
        {!minimal && <Chip
          size="small"
          label={
            desktopStatus ? "Local SQLite storage" : "Local browser storage"
          }
        />}
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
            label="Knowledge / local player"
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
        <DialogTitle>Tracker connections</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {compact && <CompatibilityInfo run={run} />}
            {compact && run && <ArchiveControls runId={run.id} />}
            {!desktopStatus ? (
              <Alert severity="info">
                Emulator connections and hosted rooms require the desktop
                application. Manual tracking and portable backups remain
                available here.
              </Alert>
            ) : (
              <>
                <Typography variant="body2">
                  Saved locally: {desktopStatus.storagePath}
                </Typography>
                {run && (
                  <>
                    <MelonDsPanel run={run} />
                    <Divider />
                    <Typography variant="h6">BizHawk / FireRed</Typography>
                    <Alert severity="info">
                      Lua connector: BizHawk, FireRed English revision 1.0
                      (BPRE). Captures require confirmation; unknown game
                      versions are rejected. The script reads the game and never
                      modifies its save.
                    </Alert>
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
                        {isBound ? "Reconnect this game" : "Connect this game"}
                      </Button>
                      <Button
                        disabled={busy || !isBound}
                        onClick={() =>
                          void perform(async () => {
                            if (await window.nuztracker?.saveConnector())
                              setNotice(
                                "Script saved. Open it in BizHawk's Lua Console after loading your game.",
                              );
                          })
                        }
                      >
                        Save Lua connector
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
                <Typography variant="h6">SoulLink room</Typography>
                {roomActive ? (
                  <>
                    <Alert
                      severity={room.mode === "conflict" ? "warning" : "info"}
                    >
                      {room.mode} — {room.pendingCount} changes waiting to
                      synchronize.
                      {room.playerId && ` You control ${room.playerId}.`}
                    </Alert>
                    {room.participants.map((player) => (
                      <Chip
                        key={player.playerId}
                        label={`${player.name}: ${player.connected ? "connected" : "offline"}`}
                        color={player.connected ? "success" : "default"}
                      />
                    ))}
                    {room.mode === "hosting" && (
                      <>
                        <TextField
                          label="Room address"
                          value={room.address ?? ""}
                          slotProps={{ input: { readOnly: true } }}
                        />
                        <TextField
                          label="Invitation (share only with your partners)"
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
                          Reconnect
                        </Button>
                      )}
                      <Button
                        color="warning"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Leave this room? Unsent changes, if any, will be kept in a separate local copy.",
                            )
                          )
                            return;
                          void perform(async () => {
                            if (window.nuztracker)
                              setDesktopStatus(
                                await window.nuztracker.leaveRoom(),
                              );
                          });
                        }}
                      >
                        Leave room safely
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <>
                    {run?.isSoulLinkMode && (
                      <>
                        <TextField
                          label="Host port"
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
                          label="Allow connections from my trusted LAN / VPN"
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
                          label="Reset previous player credentials"
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
                          Host this SoulLink run
                        </Button>
                        <Divider />
                      </>
                    )}
                    <TextField
                      label="Room address"
                      placeholder="ws://192.168.1.10:47070/room"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                    <TextField
                      label="Invitation"
                      value={invitation}
                      onChange={(event) => setInvitation(event.target.value)}
                    />
                    <TextField
                      label="Player ID assigned by the host"
                      value={joinPlayerId}
                      onChange={(event) => setJoinPlayerId(event.target.value)}
                      helperText="Usually p2, p3 or p4. The host's player slot is reserved."
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
                          setNotice(
                            "Room joined. Its run is now available on the home screen.",
                          );
                        })
                      }
                    >
                      Join room
                    </Button>
                    <Alert severity="warning">
                      Use a trusted LAN or VPN. Public Internet connections
                      require WSS; an invitation alone does not configure your
                      router.
                    </Alert>
                  </>
                )}
                {run && (
                  <>
                    <Divider />
                    <Typography variant="h6">OBS overlay</Typography>
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
                      Get live overlay URL
                    </Button>
                    {overlayUrl && (
                      <>
                      <TextField
                        label="Read-only local browser-source URL"
                        value={overlayUrl}
                        slotProps={{ input: { readOnly: true } }}
                        helperText="Keep the desktop app running. This URL works on this computer only."
                      />
                      <TextField
                        label="Compact ribbon OBS URL"
                        value={overlayUrl.replace("/overlay/?", "/overlay/?style=compact&")}
                        slotProps={{ input: { readOnly: true } }}
                      />
                      </>
                    )}
                    <Typography variant="body2">The default source uses the same transparent sprite/type columns as PNG export. The compact source uses a horizontal ribbon.</Typography>
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
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
