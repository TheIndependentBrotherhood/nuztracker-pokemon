"use client";

import { Capture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";

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
      actions={[
        {
          icon: "↻",
          title: t(tr.deadPokemonCard.resurrect, lang),
          className: "resurrect-btn",
          onClick: () => onResurrect(capture.id),
          sx: {
            position: "absolute",
            top: 3,
            right: 3,
            fontSize: "0.75rem",
            color: "#fff",
            background: "#10b981",
            borderRadius: "0.25rem",
            px: 0.5,
            py: 0.25,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            "&:hover": {
              background: "#059669",
            },
          },
        },
      ]}
    />
  );
}
