"use client";

import { Box, Typography } from "@mui/material";
import { Capture, Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";
import EvolutionModal from "../modals/EvolutionModal";
import PokemonDetailModal from "../modals/PokemonDetailModal";
import { useState } from "react";

interface Props {
  capture: Capture | null;
  slotIndex: number;
  runId: string;
  zone: string;
}

export default function TeamPokemonCard({
  capture,
  slotIndex,
  runId,
  zone,
}: Props) {
  const { runs, updateTeam } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;
  const [showEvolution, setShowEvolution] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [evolvedCapture, setEvolvedCapture] = useState<Capture | null>(null);

  const run = runs.find((r) => r.id === runId);

  // Determine if evolution is available
  const canEvolve =
    !run?.isRandomMode ||
    (run?.isRandomMode && run?.randomizerOptions?.randomizeEvolvedForms);

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    const run = runs.find((r) => r.id === runId);
    if (!run || !capture) return;
    updateTeam(
      runId,
      run.team.filter((c) => c.id !== capture.id),
    );
  }

  if (!capture) {
    return (
      <Box
        sx={{
          background: "#f0f4f8",
          border: "2px dashed #cbd5e1",
          borderRadius: "0.75rem",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "154px",
          minWidth: "120px",
          transition: "all 200ms ease",
          "&:hover": {
            borderColor: "#3b82f6",
            background: "#e0f2fe",
          },
        }}
      >
        <Typography
          sx={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}
        >
          {t(tr.teamView.slot, lang)(slotIndex + 1)}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <PokemonDisplayCard
        capture={capture}
        runId={runId}
        zone={zone}
        lang={lang}
        background="#fff3cd"
        borderColor="#f59e0b"
        hoverBorderColor="#3b82f6"
        draggableData={{
          key: "pokemonId",
          effectAllowed: "move",
        }}
        actions={[
          ...(canEvolve
            ? [
                {
                  icon: "⬆",
                  title: lang === "fr" ? "Évoluer" : "Evolve",
                  onClick: () => setShowEvolution(true),
                  sx: {
                    position: "absolute",
                    top: 3,
                    left: 3,
                    width: "1.75rem",
                    height: "1.75rem",
                    minWidth: "1.75rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    color: "#10b981",
                    background: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "0.25rem",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    cursor: "pointer",
                    fontWeight: 600,
                    zIndex: 10,
                    "&:hover": {
                      color: "#047857",
                      background: "rgba(255, 255, 255, 0.95)",
                      borderColor: "rgba(16, 185, 129, 0.5)",
                    },
                  },
                },
              ]
            : []),
          {
            icon: "✕",
            title: t(tr.pokemonCard.removeFromTeam, lang),
            className: "remove-btn",
            onClick: () => {
              const run = runs.find((r) => r.id === runId);
              if (!run) return;
              updateTeam(
                runId,
                run.team.filter((cardCapture) => cardCapture.id !== capture.id),
              );
            },
            sx: {
              position: "absolute",
              top: 3,
              right: 3,
              width: "1.75rem",
              height: "1.75rem",
              minWidth: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              color: "#dc2626",
              background: "rgba(255, 255, 255, 0.9)",
              borderRadius: "0.25rem",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              cursor: "pointer",
              fontWeight: 600,
              zIndex: 10,
              "&:hover": {
                color: "#991b1b",
                background: "rgba(255, 255, 255, 0.95)",
                borderColor: "rgba(220, 38, 38, 0.5)",
              },
            },
          },
        ]}
      />

      {showEvolution && run && (
        <EvolutionModal
          capture={capture}
          run={run}
          runId={runId}
          zoneId="" // Not used in EvolutionModal for team
          onClose={() => setShowEvolution(false)}
          onEvolveComplete={(evolved) => {
            setEvolvedCapture(evolved);
            setShowDetail(true);
            setShowEvolution(false);
          }}
        />
      )}

      {showDetail && evolvedCapture && (
        <PokemonDetailModal
          capture={evolvedCapture}
          runId={runId}
          onClose={() => {
            setShowDetail(false);
            setEvolvedCapture(null);
          }}
        />
      )}
    </>
  );
}
