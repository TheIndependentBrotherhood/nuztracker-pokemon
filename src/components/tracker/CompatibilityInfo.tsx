"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { GAME_VERSIONS, getGameName, getGameVersion } from "@/lib/game-catalog";
import type { Run } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.compatibility;
const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default function CompatibilityInfo({ run }: { run?: Run }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const game = getGameVersion(run?.gameVersion);
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {t(tr.button, lang)}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t(tr.title, lang)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {run && (
              <Alert severity={game ? "info" : "warning"}>
                {game
                  ? `${getGameName(game, lang)} / ${capitalize(game.region)} / ${game.console}`
                  : t(tr.noGameVersion, lang)}
              </Alert>
            )}
            <Typography>{t(tr.manualTracking, lang)}</Typography>
            <Alert severity="warning">{t(tr.melonDsWarning, lang)}</Alert>
            <Table size="small" aria-label={t(tr.tableLabel, lang)}>
              <TableHead>
                <TableRow>
                  <TableCell>{t(tr.regionGame, lang)}</TableCell>
                  <TableCell>{t(tr.console, lang)}</TableCell>
                  <TableCell>{t(tr.manual, lang)}</TableCell>
                  <TableCell>{t(tr.automatic, lang)}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {GAME_VERSIONS.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {capitalize(entry.region)} / {getGameName(entry, lang)}
                    </TableCell>
                    <TableCell>{entry.console}</TableCell>
                    <TableCell>{t(tr.yes, lang)}</TableCell>
                    <TableCell>
                      {t(
                        entry.id === "firered"
                          ? tr.fireRedConnector
                          : entry.id === "platinum"
                            ? tr.platinumConnector
                            : tr.noConnector,
                        lang,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant="body2">{t(tr.referenceNote, lang)}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            {t(translations.runPage.close, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
