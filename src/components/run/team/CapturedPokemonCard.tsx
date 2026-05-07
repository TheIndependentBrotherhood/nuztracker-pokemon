"use client";

import { Capture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";
import EvolutionModal from "../modals/EvolutionModal";
import { useState } from "react";
import { useRunStore } from "@/store/runStore";
import PokemonDetailModal from "../modals/PokemonDetailModal";

interface Props {
  capture: Capture;
  runId: string;
  onAddToTeam: (capture: Capture) => void;
  onToggleDead?: (captureId: string) => void;
  zone: string;
}

export default function CapturedPokemonCard({
  capture,
  runId,
  onAddToTeam,
  onToggleDead,
  zone,
}: Props) {
  const { runs } = useRunStore();
  const [showEvolution, setShowEvolution] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [evolvedCapture, setEvolvedCapture] = useState<Capture | null>(null);
  const { lang } = useLanguage();
  const tr = translations;

  const run = runs.find((r) => r.id === runId);

  const actions = [
    ...(onToggleDead
      ? [
          {
            icon: "⬆",
            title: t(tr.pokemonCard.evolveButton, lang),
            className: "evolve-btn",
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
          {
            icon: "⚰️",
            title: t(tr.capturedPokemonCard.markAsDead, lang),
            className: "mark-dead-btn",
            onClick: () => onToggleDead(capture.id),
            sx: {
              position: "absolute",
              bottom: 3,
              left: 3,
              width: "1.75rem",
              height: "1.75rem",
              minWidth: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              color: "#ef4444",
              background: "rgba(255, 255, 255, 0.9)",
              borderRadius: "0.25rem",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              cursor: "pointer",
              fontWeight: 600,
              zIndex: 10,
              "&:hover": {
                color: "#dc2626",
                background: "rgba(255, 255, 255, 0.95)",
                borderColor: "rgba(239, 68, 68, 0.5)",
              },
            },
          },
        ]
      : []),
    {
      icon: "+",
      title: t(tr.capturedPokemonCard.addToTeam, lang),
      className: "add-to-team-btn",
      onClick: () => onAddToTeam(capture),
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
        color: "#3b82f6",
        background: "rgba(255, 255, 255, 0.9)",
        borderRadius: "0.25rem",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        cursor: "pointer",
        fontWeight: 600,
        zIndex: 10,
        "&:hover": {
          color: "#2563eb",
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(59, 130, 246, 0.5)",
        },
      },
    },
  ];

  return (
    <>
      <PokemonDisplayCard
        capture={capture}
        runId={runId}
        zone={zone}
        lang={lang}
        background="#f0f4f8"
        borderColor="#cbd5e1"
        hoverBorderColor="#3b82f6"
        hoverBackground="#e0f2fe"
        draggableData={{
          key: "capturedPokemonId",
          effectAllowed: "copy",
        }}
        actions={actions}
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
