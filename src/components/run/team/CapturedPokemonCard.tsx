"use client";

import { Capture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";
import EvolutionModal from "../modals/EvolutionModal";
import { useState } from "react";
import { useRunStore } from "@/store/runStore";
import PokemonDetailModal from "../modals/PokemonDetailModal";
import { getPokemonCardActions } from "./pokemonCardActions";

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

  const actions = getPokemonCardActions({
    lang,
    onEvolve: onToggleDead ? () => setShowEvolution(true) : undefined,
    onToggleDead,
    captureId: capture.id,
    primaryAction: {
      icon: "+",
      title: t(tr.capturedPokemonCard.addToTeam, lang),
      className: "add-to-team-btn",
      onClick: () => onAddToTeam(capture),
    },
  });

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
