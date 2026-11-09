"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Run, TypeObservation } from "@/lib/types";
import type { OverlayMember } from "@/lib/tracker/overlay";
import {
  knowledgeForPlayer,
  isManualObservation,
  manualTypeObservation,
  viewRunForPlayer,
  withSpeciesObservations,
  withSpeciesTypes,
} from "@/lib/tracker/knowledge";
import {
  getTypeTranslation,
  loadTypeData,
  typeColors,
  typesForGeneration,
  type TypeChartData,
} from "@/lib/type-chart";
import { possibleTypeCombos } from "@/lib/type-deduction";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import TrackerDialog, { TrackerDialogIconButton } from "./TrackerDialog";

const text = translations.focusCard;
// The combination list keeps a fixed height (about two and a half rows) and scrolls.
const COMBO_LIST_MAX_HEIGHT = 64;
const CLUE_OUTCOMES: TypeObservation["type"][] = [
  "immunity",
  "resistance",
  "neutral",
  "weakness",
];
const clueColors: Record<TypeObservation["type"], string> = {
  immunity: "#10b981",
  weakness: "#ef4444",
  resistance: "#3b82f6",
  neutral: "#8b5cf6",
};

function TypeBadge({ type, lang }: { type: string; lang: "fr" | "en" }) {
  return (
    <Box
      component="span"
      sx={{
        px: 0.5,
        borderRadius: 0.5,
        fontSize: "0.65rem",
        fontWeight: 700,
        color: "#fff",
        bgcolor: typeColors[type] ?? "#555",
        whiteSpace: "nowrap",
      }}
    >
      {getTypeTranslation(type, lang)}
    </Box>
  );
}

/** Investigation shown instead of the type matchups while types are unknown. */
export default function TypeInvestigation({
  run,
  playerId,
  member,
}: {
  run: Run;
  playerId: string;
  member: OverlayMember;
}) {
  const { lang } = useLanguage();
  const { updateRun, canEditRun } = useRunStore();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [addingClue, setAddingClue] = useState(false);
  const [clueOutcome, setClueOutcome] =
    useState<TypeObservation["type"]>("immunity");
  const [clueType, setClueType] = useState("");
  const [draft, setDraft] = useState<[string, string]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [typeData, setTypeData] = useState<{
    generation: Run["typeChartGeneration"];
    data: TypeChartData;
  }>();
  const generation = run.typeChartGeneration;

  useEffect(() => {
    let cancelled = false;
    void loadTypeData(generation).then((data) => {
      if (!cancelled) setTypeData({ generation, data });
    });
    return () => {
      cancelled = true;
    };
  }, [generation]);

  const available = typesForGeneration(generation);
  const knowledge = knowledgeForPlayer(run, playerId);
  const observations =
    knowledge.pokedexObservationsByPokemonId?.[member.pokemonId] ?? [];
  const abilityPanel =
    knowledge.customAbilitiesByPokemonId?.[member.pokemonId] ?? [];
  const data =
    typeData?.generation === generation && Object.keys(typeData.data).length
      ? typeData.data
      : undefined;
  const total = (available.length * (available.length + 1)) / 2;
  const combos = data
    ? possibleTypeCombos(observations, abilityPanel, data).filter((combo) =>
        combo.every((type) => available.includes(type)),
      )
    : undefined;
  const remaining = combos?.length;
  const canEdit = canEditRun(run.id, playerId);

  function openDialog() {
    const [first = "", second = ""] = combos?.length === 1 ? combos[0] : [];
    setDraft([first, second]);
    setSaveError(false);
    setConfirming(false);
    setAddingClue(false);
    setClueType("");
    setOpen(true);
  }

  async function saveObservations(next: TypeObservation[]) {
    setBusy(true);
    setSaveError(false);
    try {
      const view = viewRunForPlayer(run, playerId);
      const saved = await updateRun(
        withSpeciesObservations(view, member.pokemonId, next),
        view,
        playerId,
      );
      if (!saved) setSaveError(true);
      return saved;
    } finally {
      setBusy(false);
    }
  }

  async function addClue() {
    if (!clueType) return;
    const saved = await saveObservations([
      ...observations,
      manualTypeObservation(clueOutcome, clueType),
    ]);
    if (saved) setClueType("");
  }

  async function confirmTypes() {
    if (!draft[0]) return;
    setBusy(true);
    setSaveError(false);
    try {
      const view = viewRunForPlayer(run, playerId);
      const types = draft[1] && draft[1] !== draft[0] ? draft : [draft[0]];
      const saved = await updateRun(
        withSpeciesTypes(view, playerId, member.pokemonId, types),
        view,
        playerId,
      );
      if (saved) setOpen(false);
      else setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  function toggleType(type: string) {
    setDraft(([first, second]) =>
      first === type
        ? [second, ""]
        : second === type
          ? [first, ""]
          : !first
            ? [type, ""]
            : [first, type],
    );
  }

  const sectionLabel = { fontSize: "0.65rem", color: "text.secondary" };
  const progress =
    remaining === undefined
      ? undefined
      : remaining
        ? ((total - remaining) / (total - 1)) * 100
        : 0;
  const confirmLabel = t(text.confirmTypesAction, lang);
  const progressBar = (height: number) =>
    progress === undefined ? (
      <LinearProgress sx={{ height, borderRadius: 1 }} />
    ) : (
      <LinearProgress
        variant="determinate"
        color={remaining === 1 ? "success" : "primary"}
        value={progress}
        sx={{ height, borderRadius: 1 }}
      />
    );

  return (
    <>
      <Tooltip
        title={
          remaining === undefined
            ? t(text.investigationTitle, lang)
            : t(text.investigationProgress, lang)(remaining, total)
        }
      >
        <Button
          size="small"
          variant="outlined"
          color={remaining === 1 ? "success" : "primary"}
          aria-label={t(text.investigationTitle, lang)}
          sx={{
            py: 0.25,
            fontSize: "0.6rem",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 0.25,
          }}
          onClick={openDialog}
        >
          <span>{t(text.investigationAction, lang)}</span>
          {progressBar(3)}
        </Button>
      </Tooltip>
      <TrackerDialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={`${t(text.investigationTitle, lang)} — ${member.names?.[lang] ?? member.name}`}
        help={
          <>
            {t(text.investigationHint, lang)}
            <br />
            {t(text.investigationPickHint, lang)}
            <br />
            {t(text.addClueHint, lang)}
          </>
        }
        headerActions={
          canEdit ? (
            <>
              <TrackerDialogIconButton
                label={t(text.addClueAction, lang)}
                active={addingClue}
                onClick={() => {
                  setSaveError(false);
                  setConfirming(false);
                  setAddingClue((value) => !value);
                }}
              >
                +
              </TrackerDialogIconButton>
              <TrackerDialogIconButton
                label={confirmLabel}
                active={confirming}
                onClick={() => {
                  setSaveError(false);
                  setAddingClue(false);
                  setConfirming((value) => !value);
                }}
              >
                ✓
              </TrackerDialogIconButton>
            </>
          ) : null
        }
        actions={
          <>
            <Button size="small" disabled={busy} onClick={() => setOpen(false)}>
              {t(text.closeAction, lang)}
            </Button>
            {addingClue && (
              <Button
                size="small"
                variant="contained"
                disabled={busy || !canEdit || !clueType}
                onClick={() => void addClue()}
              >
                {t(text.addClueConfirm, lang)}
              </Button>
            )}
            {confirming && (
              <Button
                size="small"
                variant="contained"
                disabled={busy || !canEdit || !draft[0]}
                onClick={() => void confirmTypes()}
              >
                {confirmLabel}
              </Button>
            )}
          </>
        }
      >
        <Stack spacing={0.75}>
          <Collapse in={addingClue} unmountOnExit>
            <Box
              sx={{
                p: 0.75,
                borderRadius: 0.5,
                bgcolor: "action.hover",
              }}
            >
              <Typography sx={sectionLabel}>
                {t(text.addClueOutcome, lang)}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 0.5,
                  mt: 0.25,
                }}
              >
                {CLUE_OUTCOMES.map((outcome) => {
                  const selected = clueOutcome === outcome;
                  return (
                    <ButtonBase
                      key={outcome}
                      disabled={busy}
                      aria-pressed={selected}
                      onClick={() => setClueOutcome(outcome)}
                      sx={{
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: "#fff",
                        bgcolor: clueColors[outcome],
                        opacity: selected ? 1 : 0.45,
                        outline: selected ? "2px solid #fff" : "none",
                        outlineOffset: -2,
                      }}
                    >
                      {t(
                        translations.pokemonDetail.observationTypes[outcome],
                        lang,
                      )}
                    </ButtonBase>
                  );
                })}
              </Box>
              <Typography sx={{ ...sectionLabel, mt: 0.5 }}>
                {t(text.addClueType, lang)}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
                  gap: 0.5,
                  mt: 0.25,
                }}
              >
                {available.map((type) => {
                  const selected = clueType === type;
                  return (
                    <ButtonBase
                      key={type}
                      disabled={busy}
                      aria-pressed={selected}
                      onClick={() => setClueType(selected ? "" : type)}
                      sx={{
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "#fff",
                        bgcolor: typeColors[type] ?? "#555",
                        opacity: selected || !clueType ? 1 : 0.45,
                        outline: selected ? "2px solid #fff" : "none",
                        outlineOffset: -2,
                      }}
                    >
                      {getTypeTranslation(type, lang)}
                    </ButtonBase>
                  );
                })}
              </Box>
              {saveError && (
                <Alert
                  severity="error"
                  sx={{ mt: 0.5, py: 0, fontSize: "0.7rem" }}
                >
                  {t(text.clueSaveError, lang)}
                </Alert>
              )}
            </Box>
          </Collapse>
          <Collapse in={confirming} unmountOnExit>
            <Box
              sx={{
                p: 0.75,
                borderRadius: 0.5,
                bgcolor: "action.hover",
              }}
            >
              <Typography sx={sectionLabel}>
                {t(text.investigationPick, lang)}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
                  gap: 0.5,
                  mt: 0.25,
                }}
              >
                {available.map((type) => {
                  const selected = draft.includes(type);
                  return (
                    <ButtonBase
                      key={type}
                      disabled={busy || !canEdit}
                      aria-pressed={selected}
                      onClick={() => toggleType(type)}
                      sx={{
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "#fff",
                        bgcolor: typeColors[type] ?? "#555",
                        opacity: selected || !draft[1] ? 1 : 0.45,
                        outline: selected ? "2px solid #fff" : "none",
                        outlineOffset: -2,
                      }}
                    >
                      {getTypeTranslation(type, lang)}
                    </ButtonBase>
                  );
                })}
              </Box>
              {saveError && (
                <Alert
                  severity="error"
                  sx={{ mt: 0.5, py: 0, fontSize: "0.7rem" }}
                >
                  {t(text.confirmTypesError, lang)}
                </Alert>
              )}
            </Box>
          </Collapse>
          {remaining === undefined ? (
            <Typography sx={sectionLabel}>
              {t(text.investigationLoading, lang)}
            </Typography>
          ) : (
            <Box>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
                {t(text.investigationProgress, lang)(remaining, total)}
              </Typography>
              <Box sx={{ mt: 0.25 }}>{progressBar(5)}</Box>
            </Box>
          )}
          {remaining === 0 && (
            <Alert severity="warning" sx={{ py: 0, fontSize: "0.7rem" }}>
              {t(text.investigationContradiction, lang)}
            </Alert>
          )}
          <Box>
            <Typography sx={sectionLabel}>
              {t(translations.pokemonDetail.observations, lang)} (
              {observations.length})
            </Typography>
            {observations.length ? (
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}
              >
                {observations.map((observation) => (
                  <Box
                    key={observation.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                      fontSize: "0.65rem",
                    }}
                  >
                    {t(
                      translations.pokemonDetail.observationTypes[
                        observation.type
                      ],
                      lang,
                    )}
                    <TypeBadge type={observation.observationType} lang={lang} />
                    {canEdit && isManualObservation(observation) && (
                      <Tooltip title={t(text.removeClueAction, lang)}>
                        <ButtonBase
                          disabled={busy}
                          aria-label={t(text.removeClueAction, lang)}
                          onClick={() =>
                            void saveObservations(
                              observations.filter(
                                (other) => other.id !== observation.id,
                              ),
                            )
                          }
                          sx={{
                            px: 0.25,
                            fontSize: "0.7rem",
                            lineHeight: 1,
                            color: "text.secondary",
                            borderRadius: 0.5,
                          }}
                        >
                          ×
                        </ButtonBase>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: "0.7rem" }}>
                {t(text.investigationNoClue, lang)}
              </Typography>
            )}
          </Box>
          {combos && combos.length > 0 && observations.length > 0 && (
            <Box>
              <Typography sx={sectionLabel}>
                {remaining === 1
                  ? t(text.investigationSolved, lang)
                  : `${t(text.investigationCandidates, lang)} (${combos.length})`}
              </Typography>
              <Box
                data-testid="investigation-combos"
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignContent: "flex-start",
                  gap: 0.5,
                  mt: 0.25,
                  p: "2px",
                  maxHeight: COMBO_LIST_MAX_HEIGHT,
                  overflowY: "auto",
                  scrollbarWidth: "thin",
                }}
              >
                {combos.map((combo) => {
                  const selected =
                    confirming &&
                    draft[0] === combo[0] &&
                    draft[1] === (combo[1] ?? "");
                  return (
                    <ButtonBase
                      key={combo.join("-")}
                      disabled={busy || !canEdit}
                      aria-pressed={selected}
                      onClick={() => {
                        setDraft([combo[0], combo[1] ?? ""]);
                        setAddingClue(false);
                        setConfirming(true);
                      }}
                      sx={{
                        display: "flex",
                        gap: 0.25,
                        p: 0.25,
                        borderRadius: 0.5,
                        outline: selected ? "2px solid" : "1px solid",
                        outlineColor: selected ? "primary.main" : "divider",
                      }}
                    >
                      {combo.map((type) => (
                        <TypeBadge key={type} type={type} lang={lang} />
                      ))}
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>
          )}
        </Stack>
      </TrackerDialog>
    </>
  );
}
