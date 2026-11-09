"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Run } from "@/lib/types";
import type { OverlayMember } from "@/lib/tracker/overlay";
import { viewRunForPlayer, withSpeciesNotes } from "@/lib/tracker/knowledge";
import { isRandomTypesMode } from "@/lib/capture-types";
import {
  TYPES,
  getTypeDefensesForGeneration,
  getTypeOffensesForGeneration,
  getEffectivenessLabel,
  getTypeTranslation,
  typeColors,
} from "@/lib/type-chart";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import type { CaptureSpriteOption } from "@/lib/pokemon-data";
import FocusCard from "./FocusCard";
import TypeInvestigation from "./TypeInvestigation";
import TrackerDialog from "./TrackerDialog";

const text = translations.focusCard;

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
    offenses?: Record<string, number>;
    error?: boolean;
  }>();
  const [typeMode, setTypeMode] = useState<"defense" | "attack">("defense");
  const matchups =
    typeMode === "attack" ? typeTarget?.offenses : typeTarget?.defenses;

  function openTypes(target: OverlayMember) {
    try {
      setTypeTarget({
        member: target,
        ...(target.types.length
          ? {
              defenses: getTypeDefensesForGeneration(
                target.types,
                run.typeChartGeneration,
              ),
              offenses: getTypeOffensesForGeneration(
                target.types,
                run.typeChartGeneration,
              ),
            }
          : {}),
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
              {isRandomTypesMode(run) && !member.types.length ? (
                <TypeInvestigation
                  run={run}
                  playerId={playerId}
                  member={member}
                />
              ) : (
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
              )}
            </Stack>
          }
        />
      ) : (
        fallback
      )}
      <TrackerDialog
        open={Boolean(editor)}
        onClose={() => {
          if (!busy) setEditor(undefined);
        }}
        title={`${t(text.notes, lang)} — ${editor?.name ?? ""}`}
        help={t(text.notesHint, lang)}
        actions={
          <>
            <Button
              size="small"
              disabled={busy}
              onClick={() => setEditor(undefined)}
            >
              {t(text.cancelAction, lang)}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={
                busy || !editor || !canEditRun(editor.run.id, editor.playerId)
              }
              onClick={() => void saveNotes()}
            >
              {t(text.saveAction, lang)}
            </Button>
          </>
        }
      >
        {saveError && (
          <Alert severity="error" sx={{ mb: 1, py: 0, fontSize: "0.7rem" }}>
            {t(text.notesError, lang)}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          multiline
          size="small"
          minRows={3}
          maxRows={8}
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
          slotProps={{
            htmlInput: {
              maxLength: 20000,
              "aria-label": t(translations.pokemonDetail.speciesNotes, lang),
            },
          }}
          sx={{ mt: 0.5 }}
        />
      </TrackerDialog>
      <TrackerDialog
        open={Boolean(typeTarget)}
        onClose={() => setTypeTarget(undefined)}
        title={`${t(text.typesAction, lang)} — ${
          typeTarget?.member.names?.[lang] ?? typeTarget?.member.name ?? ""
        }`}
        help={t(
          typeMode === "attack" ? text.attackerHint : text.typeMatchupsHint,
          lang,
        )}
        actions={
          <Button size="small" onClick={() => setTypeTarget(undefined)}>
            {t(text.closeAction, lang)}
          </Button>
        }
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          fullWidth
          value={typeMode}
          onChange={(_, value: "defense" | "attack" | null) => {
            if (value) setTypeMode(value);
          }}
          sx={{ mb: 0.75 }}
        >
          <ToggleButton value="defense" sx={{ py: 0, fontSize: "0.7rem" }}>
            {t(text.defenderMode, lang)}
          </ToggleButton>
          <ToggleButton value="attack" sx={{ py: 0, fontSize: "0.7rem" }}>
            {t(text.attackerMode, lang)}
          </ToggleButton>
        </ToggleButtonGroup>
        {typeTarget?.error ? (
          <Alert severity="error" sx={{ py: 0, fontSize: "0.7rem" }}>
            {t(text.typeChartError, lang)}
          </Alert>
        ) : !typeTarget?.member.types.length ? (
          <Alert severity="info" sx={{ py: 0, fontSize: "0.7rem" }}>
            {t(text.unknownTypes, lang)}
          </Alert>
        ) : matchups ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: 0.25,
            }}
          >
            {TYPES.filter((type) => type in matchups).map((type) => {
              const multiplier = matchups[type];
              const label = getEffectivenessLabel(multiplier, typeMode);
              return (
                <Box
                  key={type}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 0.5,
                    px: 0.5,
                    py: 0.25,
                    bgcolor: "#0f1922",
                    borderRadius: 0.5,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "0.65rem", color: typeColors[type] }}
                  >
                    {getTypeTranslation(type, lang)}
                  </Typography>
                  <Typography
                    aria-label={t(
                      translations.typeAnalysis[label.labelKey],
                      lang,
                    )}
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: label.color,
                    }}
                  >
                    ×{multiplier}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : null}
      </TrackerDialog>
    </>
  );
}
