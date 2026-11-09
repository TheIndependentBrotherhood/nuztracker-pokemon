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
import type { Run } from "@/lib/types";
import type { OverlayMember } from "@/lib/tracker/overlay";
import {
  knowledgeForPlayer,
  viewRunForPlayer,
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
const MAX_LISTED_COMBOS = 24;

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
    setOpen(true);
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
          </>
        }
        headerActions={
          canEdit ? (
            <TrackerDialogIconButton
              label={confirmLabel}
              active={confirming}
              onClick={() => setConfirming((value) => !value)}
            >
              ✓
            </TrackerDialogIconButton>
          ) : null
        }
        actions={
          <>
            <Button size="small" disabled={busy} onClick={() => setOpen(false)}>
              {t(text.closeAction, lang)}
            </Button>
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
              {combos.length <= MAX_LISTED_COMBOS ? (
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}
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
              ) : (
                <Typography sx={{ fontSize: "0.7rem" }}>
                  {t(text.investigationTooMany, lang)}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </TrackerDialog>
    </>
  );
}
