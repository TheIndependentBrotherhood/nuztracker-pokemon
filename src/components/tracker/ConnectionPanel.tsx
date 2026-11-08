"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import {
  getGameConnector,
  getGameName,
  getGameVersion,
  type GameConnector,
} from "@/lib/game-catalog";
import { useRunStore } from "@/store/runStore";
import ArchiveControls from "./ArchiveControls";
import BizHawkGuide from "./BizHawkGuide";
import CompatibilityInfo from "./CompatibilityInfo";
import MelonDsPanel from "./MelonDsPanel";
import OpenLightTrackerButton from "./OpenLightTrackerButton";
import OverlayControls from "./OverlayControls";
import SoulLinkRoomPanel from "./SoulLinkRoomPanel";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.connections;
const hub = translations.hub;

type View =
  "home" | "game" | "soullink" | "overlay" | "backup" | "compatibility";

const EMULATORS: Record<GameConnector, string> = {
  melonds: "MelonDS",
  bizhawk: "BizHawk",
};

export default function ConnectionPanel({
  run,
  compact = false,
  minimal = false,
}: {
  run?: Run;
  compact?: boolean;
  minimal?: boolean;
}) {
  const { desktopStatus, playerByRun, setPlayer } = useRunStore();
  const { lang } = useLanguage();
  const [view, setView] = useState<View | null>(null);
  const playerId = run ? (playerByRun[run.id] ?? getPlayerId(run)) : "solo";
  const room = desktopStatus?.room;
  const roomActive = Boolean(room && room.mode !== "offline");
  const ownRun = Boolean(run && room?.runId === run.id);
  const game = getGameVersion(run?.gameVersion);
  const gameName = game ? getGameName(game, lang) : "";
  const connector = getGameConnector(run?.gameVersion);
  const emulator = connector ? EMULATORS[connector] : "";

  const gameState = (() => {
    if (!run || !connector || !desktopStatus) return undefined;
    if (connector === "melonds") {
      const melon = desktopStatus.melonDs;
      if (!melon?.attached) return "off";
      return melon.state === "tracking" ? "tracking" : "waiting";
    }
    const bridge = desktopStatus.bridge;
    if (bridge.runId !== run.id || bridge.playerId !== playerId) return "off";
    return bridge.lastSeenAt ? "tracking" : "waiting";
  })();

  const titles: Record<View, string> = {
    home: t(hub.title, lang),
    game: t(hub.gameTitle, lang),
    soullink: t(hub.soulLinkTitle, lang),
    overlay: t(hub.overlayTitle, lang),
    backup: t(hub.backupTitle, lang),
    compatibility: t(hub.compatibilityTitle, lang),
  };

  const entries: {
    view: View;
    description: string;
    status?: React.ReactNode;
  }[] = [];
  if (run && desktopStatus)
    entries.push({
      view: "game",
      description: connector
        ? t(hub.gameDescription, lang)(gameName, emulator)
        : game
          ? t(hub.gameManual, lang)(gameName)
          : t(hub.noGameVersion, lang),
      status: gameState && (
        <GameStateChip state={gameState} emulator={emulator} />
      ),
    });
  if (desktopStatus && (!run || run.isSoulLinkMode || roomActive))
    entries.push({
      view: "soullink",
      description: t(
        run?.isSoulLinkMode ? hub.soulLinkDescription : hub.joinDescription,
        lang,
      ),
      status: roomActive && room && (
        <Chip size="small" color="success" label={room.mode} />
      ),
    });
  if (run && desktopStatus)
    entries.push({
      view: "overlay",
      description: t(hub.overlayDescription, lang),
    });
  entries.push(
    { view: "backup", description: t(hub.backupDescription, lang) },
    {
      view: "compatibility",
      description: t(hub.compatibilityDescription, lang),
    },
  );

  const crumbs: string[] =
    view === "game" && connector
      ? [titles.game, `${emulator} (${gameName})`]
      : view && view !== "home"
        ? [titles[view]]
        : [];

  return (
    <Box sx={{ p: minimal ? 0 : 2 }}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", rowGap: 1.5, alignItems: "center" }}
      >
        {run && !compact && <OpenLightTrackerButton runId={run.id} />}
        <Button
          size={minimal ? "small" : "medium"}
          aria-label={t(hub.ariaLabel, lang)}
          variant="outlined"
          onClick={() => setView("home")}
        >
          {minimal ? "..." : t(run ? hub.button : hub.ariaLabel, lang)}
        </Button>
        {!minimal && gameState && (
          <GameStateChip
            state={gameState}
            emulator={emulator}
            onClick={() => setView("game")}
          />
        )}
        {!minimal && roomActive && room && (
          <Chip
            size="small"
            color={
              room.mode === "connected" || room.mode === "hosting"
                ? "success"
                : "warning"
            }
            label={`SoulLink: ${room.mode}`}
            onClick={() => setView("soullink")}
          />
        )}
        {!minimal && run?.isSoulLinkMode && (
          <TextField
            select
            size="small"
            label={t(tr.knowledgePlayer, lang)}
            value={playerId}
            disabled={ownRun}
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
        open={view !== null}
        onClose={() => setView(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Breadcrumbs aria-label={t(hub.title, lang)}>
            {crumbs.length ? (
              <Link
                component="button"
                underline="hover"
                color="inherit"
                onClick={() => setView("home")}
                sx={{ fontSize: "inherit" }}
              >
                {titles.home}
              </Link>
            ) : (
              <Typography variant="h6" component="span">
                {titles.home}
              </Typography>
            )}
            {crumbs.slice(0, -1).map((crumb) => (
              <Typography
                key={crumb}
                component="span"
                sx={{ fontSize: "inherit" }}
              >
                {crumb}
              </Typography>
            ))}
            {crumbs.length > 0 && (
              <Typography variant="h6" component="span" color="text.primary">
                {crumbs[crumbs.length - 1]}
              </Typography>
            )}
          </Breadcrumbs>
        </DialogTitle>
        <DialogContent>
          {view === "home" && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t(hub.intro, lang)}
              </Typography>
              {!desktopStatus && (
                <Alert severity="info">{t(hub.desktopOnly, lang)}</Alert>
              )}
              <List disablePadding>
                {entries.map((entry) => (
                  <ListItemButton
                    key={entry.view}
                    onClick={() => setView(entry.view)}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      gap: 1,
                    }}
                  >
                    <ListItemText
                      primary={titles[entry.view]}
                      secondary={entry.description}
                      slotProps={{ primary: { sx: { fontWeight: 700 } } }}
                    />
                    {entry.status}
                    <Typography color="text.secondary" aria-hidden>
                      ›
                    </Typography>
                  </ListItemButton>
                ))}
              </List>
            </Stack>
          )}
          {view === "game" &&
            run &&
            (connector === "melonds" ? (
              <MelonDsPanel run={run} insideLight={compact} />
            ) : connector === "bizhawk" ? (
              <BizHawkGuide run={run} insideLight={compact} />
            ) : (
              <Alert severity="info">
                {t(game ? hub.manualExplanation : hub.pickGameVersion, lang)}
              </Alert>
            ))}
          {view === "soullink" && <SoulLinkRoomPanel run={run} />}
          {view === "overlay" && run && <OverlayControls run={run} />}
          {view === "backup" && (
            <Stack spacing={2}>
              <Typography variant="body2">{t(hub.backupInfo, lang)}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ wordBreak: "break-all" }}
              >
                {desktopStatus
                  ? `${t(tr.savedLocally, lang)} ${desktopStatus.storagePath}`
                  : t(tr.browserStorage, lang)}
              </Typography>
              <ArchiveControls runId={run?.id} />
            </Stack>
          )}
          {view === "compatibility" && <CompatibilityInfo run={run} />}
        </DialogContent>
        <DialogActions>
          {view !== "home" && (
            <Button onClick={() => setView("home")}>{t(hub.back, lang)}</Button>
          )}
          <Button onClick={() => setView(null)}>{t(hub.close, lang)}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function GameStateChip({
  state,
  emulator,
  onClick,
}: {
  state: "off" | "waiting" | "tracking";
  emulator: string;
  onClick?: () => void;
}) {
  const { lang } = useLanguage();
  const label =
    state === "tracking"
      ? t(hub.statusTracking, lang)(emulator)
      : state === "waiting"
        ? t(hub.statusWaiting, lang)(emulator)
        : t(hub.statusOff, lang);
  return (
    <Chip
      size="small"
      color={
        state === "tracking"
          ? "success"
          : state === "waiting"
            ? "warning"
            : "default"
      }
      label={label}
      onClick={onClick}
    />
  );
}
