"use client";

import {
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import StyledButton from "@/components/ui/StyledButton";
import StyledSelect from "@/components/ui/StyledSelect";
import GameVersionField from "@/components/tracker/GameVersionField";
import { gameTypeChart } from "@/lib/game-catalog";

type TypeChartGeneration = Run["typeChartGeneration"];

interface Props {
  run: Run;
  open: boolean;
  onClose: () => void;
}

export default function RunSettingsModal({ run, open, onClose }: Props) {
  const { updateRun, canEditRun } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;

  const handleTypeChartChange = (event: SelectChangeEvent<unknown>) => {
    const next = event.target.value as TypeChartGeneration;
    if (next === run.typeChartGeneration) return;
    void updateRun({ ...run, typeChartGeneration: next }, run);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: "#FEF3E2",
            border: "3px solid #000",
            borderRadius: "1.5rem",
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
        {t(tr.runSettings.title, lang)}
      </DialogTitle>
      <DialogContent
        sx={{
          pt: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflow: "visible",
        }}
      >
        <GameVersionField
          value={run.gameVersion}
          region={run.region}
          disabled={!canEditRun(run.id)}
          onChange={(gameVersion) => {
            void updateRun(
              {
                ...run,
                gameVersion,
                typeChartGeneration: gameTypeChart(gameVersion),
              },
              run,
            );
          }}
        />
        <FormControlLabel
          label={t(tr.runSettings.randomStats, lang)}
          control={
            <Checkbox
              checked={Boolean(
                run.isRandomMode && run.randomizerOptions?.randomizeStats,
              )}
              disabled={!canEditRun(run.id)}
              onChange={(event) => {
                void updateRun(
                  {
                    ...run,
                    isRandomMode: event.target.checked || run.isRandomMode,
                    randomizerOptions: {
                      randomizeTypes: false,
                      randomizeAbilities: false,
                      randomizeEncounters: false,
                      randomizeEvolvedForms: false,
                      ...run.randomizerOptions,
                      randomizeStats: event.target.checked,
                    },
                  },
                  run,
                );
              }}
            />
          }
        />
        {run.isSoulLinkMode && (
          <FormControlLabel
            label={t(tr.createRun.turnOrder, lang)}
            control={
              <Checkbox
                checked={Boolean(run.soulLinkTurnOrder)}
                disabled={!canEditRun(run.id)}
                onChange={(event) => {
                  void updateRun(
                    { ...run, soulLinkTurnOrder: event.target.checked },
                    run,
                  );
                }}
              />
            }
          />
        )}
        <Box sx={{ pt: 1 }}>
          <StyledSelect
            label={t(tr.createRun.typeChart, lang)}
            value={run.typeChartGeneration}
            disabled={!canEditRun(run.id)}
            onChange={handleTypeChartChange}
            fullWidth
          >
            <MenuItem value="gen1">{t(tr.createRun.gen1, lang)}</MenuItem>
            <MenuItem value="gen2-5">{t(tr.createRun.gen25, lang)}</MenuItem>
            <MenuItem value="gen6+">{t(tr.createRun.gen6, lang)}</MenuItem>
          </StyledSelect>
        </Box>
        <Typography sx={{ fontSize: "0.8rem", color: "#475569" }}>
          {t(tr.runSettings.typeChartHint, lang)}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ gap: 1, p: 2 }}>
        <StyledButton variant="secondary" onClick={onClose}>
          {t(tr.runPage.close, lang)}
        </StyledButton>
      </DialogActions>
    </Dialog>
  );
}
