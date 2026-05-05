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
              color: "#059669",
              background: "rgba(255, 255, 255, 0.95)",
              borderColor: "rgba(16, 185, 129, 0.5)",
            },
          },
        },
      ]}
    />
  );
}
