"use client";

import { Capture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";
import { getPokemonCardActions } from "./pokemonCardActions";

interface Props {
  capture: Capture;
  runId: string;
  onResurrect: (captureId: string) => void;
  zone?: string;
}

export default function DeadPokemonCard({
  capture,
  runId,
  onResurrect,
  zone,
}: Props) {
  const { lang } = useLanguage();
  const tr = translations;

  // Only allow resurrection if not a failed capture
  const actions = getPokemonCardActions({
    lang,
    captureId: capture.id,
    primaryAction: !capture.failedCapture
      ? {
          icon: "↻",
          title: t(tr.deadPokemonCard.resurrect, lang),
          className: "resurrect-btn",
          onClick: () => onResurrect(capture.id),
        }
      : undefined,
  });

  return (
    <PokemonDisplayCard
      capture={capture}
      runId={runId}
      zone={zone}
      lang={lang}
      background="#fff"
      borderColor="#ef4444"
      hoverBorderColor="#dc2626"
      hoverBackground="#fecaca"
      draggableData={{
        key: "deadPokemonId",
        effectAllowed: "move",
      }}
      opacity={0.7}
      imageFilter="grayscale(100%) contrast(0.8)"
      actions={actions}
    />
  );
}
