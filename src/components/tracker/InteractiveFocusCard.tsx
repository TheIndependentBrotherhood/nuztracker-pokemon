"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import type { OverlayMember } from "@/lib/tracker/overlay";
import { viewRunForPlayer, withSpeciesNotes } from "@/lib/tracker/knowledge";
import {
  TYPES,
  getTypeDefensesForGeneration,
  getEffectivenessLabel,
  getTypeTranslation,
  typeColors,
} from "@/lib/type-chart";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import type { CaptureSpriteOption } from "@/lib/pokemon-data";
import FocusCard from "./FocusCard";

const text = translations.focusCard;
const paperSx = {
  width: "min(460px, calc(100vw - 16px))",
  m: 1,
  maxHeight: "calc(100dvh - 16px)",
};

export default function InteractiveFocusCard({
  run,
  playerId,
  member,
  opponentLevel,
  onSpriteChange,
  fallback,
}: {
  run: Run;
  playerId: string;
  member?: OverlayMember;
  opponentLevel?: number;
  onSpriteChange?: (sprite: CaptureSpriteOption) => void;
  fallback?: ReactNode;
}) {
  const { lang } = useLanguage();
  const { updateRun, canEditRun, reportError } = useRunStore();
  const [editor, setEditor] = useState<{
    run: Run;
    playerId: string;
    pokemonId: number;
    name: string;
    draft: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [typeTarget, setTypeTarget] = useState<{
    member: OverlayMember;
    defenses?: Record<string, number>;
    error?: boolean;
  }>();
  const defenses = typeTarget?.defenses;

  function openTypes(target: OverlayMember) {
    try {
      setTypeTarget({
        member: target,
        defenses: target.types.length
          ? getTypeDefensesForGeneration(target.types, run.typeChartGeneration)
          : undefined,
      });
    } catch (error: unknown) {
      setTypeTarget({ member: target, error: true });
      reportError(error);
    }
  }

  async function saveNotes() {
    if (!editor) return;
    setBusy(true);
    setSaveError(false);
    try {
      const saved = await updateRun(
        withSpeciesNotes(editor.run, editor.pokemonId, editor.draft),
        editor.run,
        editor.playerId,
      );
      if (saved) setEditor(undefined);
      else setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {member ? (
        <FocusCard
          member={member}
          gameVersion={run.gameVersion}
          opponentLevel={opponentLevel}
          onSpriteChange={onSpriteChange}
          actions={
            <Stack spacing={0.25} sx={{ mt: 0.5 }}>
              <Tooltip title={t(translations.pokemonDetail.speciesNotes, lang)}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ py: 0, fontSize: "0.6rem" }}
                  onClick={() => {
                    const view = viewRunForPlayer(run, playerId);
                    setSaveError(false);
                    setEditor({
                      run: view,
                      playerId,
                      pokemonId: member.pokemonId,
                      name: member.names?.[lang] ?? member.name,
                      draft:
                        view.pokedexNotesByPokemonId?.[member.pokemonId] ?? "",
                    });
                  }}
                >
                  {t(text.notes, lang)}
                </Button>
              </Tooltip>
              <Tooltip title={t(text.typeMatchups, lang)}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ py: 0, fontSize: "0.6rem" }}
                  onClick={() => openTypes(member)}
                >
                  {t(text.typesAction, lang)}
                </Button>
              </Tooltip>
            </Stack>
          }
        />
      ) : (
        fallback
      )}
      <Dialog
        open={Boolean(editor)}
        onClose={() => {
          if (!busy) setEditor(undefined);
        }}
        maxWidth={false}
        slotProps={{ paper: { sx: paperSx } }}
      >
        <DialogTitle sx={{ px: 2, py: 1, fontSize: "0.95rem" }}>
          {t(text.notes, lang)} — {editor?.name}
        </DialogTitle>
        <DialogContent sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" component="p" sx={{ mb: 1 }}>
            {t(text.notesHint, lang)}
          </Typography>
          {saveError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {t(text.notesError, lang)}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            label={t(translations.pokemonDetail.speciesNotes, lang)}
            placeholder={t(
              translations.pokemonDetail.speciesNotesPlaceholder,
              lang,
            )}
            value={editor?.draft ?? ""}
            disabled={
              busy ||
              Boolean(editor && !canEditRun(editor.run.id, editor.playerId))
            }
            onChange={(event) => {
              const draft = event.target.value;
              setEditor((current) => current && { ...current, draft });
            }}
            slotProps={{ htmlInput: { maxLength: 20000 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2 }}>
          <Button disabled={busy} onClick={() => setEditor(undefined)}>
            {t(text.cancelAction, lang)}
          </Button>
          <Button
            variant="contained"
            disabled={
              busy || !editor || !canEditRun(editor.run.id, editor.playerId)
            }
            onClick={() => void saveNotes()}
          >
            {t(text.saveAction, lang)}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(typeTarget)}
        onClose={() => setTypeTarget(undefined)}
        maxWidth={false}
        slotProps={{ paper: { sx: paperSx } }}
      >
        <DialogTitle sx={{ px: 2, py: 1, fontSize: "0.95rem" }}>
          {t(text.typeMatchups, lang)} —{" "}
          {typeTarget?.member.names?.[lang] ?? typeTarget?.member.name}
        </DialogTitle>
        <DialogContent sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" component="p" sx={{ mb: 1 }}>
            {t(text.typeMatchupsHint, lang)}
          </Typography>
          {typeTarget?.error ? (
            <Alert severity="error">{t(text.typeChartError, lang)}</Alert>
          ) : !typeTarget?.member.types.length ? (
            <Alert severity="info">{t(text.unknownTypes, lang)}</Alert>
          ) : defenses ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 0.5,
              }}
            >
              {TYPES.filter((type) => type in defenses).map((type) => {
                const multiplier = defenses[type];
                const label = getEffectivenessLabel(multiplier, "defense");
                return (
                  <Box
                    key={type}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 0.5,
                      p: 0.5,
                      bgcolor: "#0f1922",
                      borderRadius: 0.5,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.7rem", color: typeColors[type] }}
                    >
                      {getTypeTranslation(type, lang)}
                    </Typography>
                    <Tooltip
                      title={t(translations.typeAnalysis[label.labelKey], lang)}
                    >
                      <Typography
                        tabIndex={0}
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: label.color,
                        }}
                      >
                        ×{multiplier}
                      </Typography>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2 }}>
          <Button onClick={() => setTypeTarget(undefined)}>
            {t(text.closeAction, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
