"use client";

import { Box, Typography } from "@mui/material";
import { Capture } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";
import EvolutionModal from "../modals/EvolutionModal";
import PokemonDetailModal from "../modals/PokemonDetailModal";
import { useState } from "react";
import { getPokemonCardActions } from "./pokemonCardActions";

interface Props {
  capture: Capture | null;
  slotIndex: number;
  runId: string;
  zone: string;
  onToggleDead?: (captureId: string) => void;
}

export default function TeamPokemonCard({
  capture,
  slotIndex,
  runId,
  zone,
  onToggleDead,
}: Props) {
  const { runs, updateTeam } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;
  const [showEvolution, setShowEvolution] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [evolvedCapture, setEvolvedCapture] = useState<Capture | null>(null);

  const run = runs.find((r) => r.id === runId);

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
          {(tr.teamView.slot as Record<string, (n: number) => string>)[lang](slotIndex + 1)}
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
        actions={getPokemonCardActions({
          lang,
          onEvolve: () => setShowEvolution(true),
          onToggleDead,
          captureId: capture.id,
          primaryAction: {
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
          },
        })}
      />

      {showEvolution && run && (
        <EvolutionModal
          pokemonCaptured={capture}
          run={run}
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
          pokemonCaptured={evolvedCapture}
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
