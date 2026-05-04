"use client";

import { Capture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";

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
  const { lang } = useLanguage();
  const tr = translations;

  const actions = [
    ...(onToggleDead
      ? [
          {
            icon: "⚰️",
            title: t(tr.capturedPokemonCard.markAsDead, lang),
            className: "mark-dead-btn",
            onClick: () => onToggleDead(capture.id),
            sx: {
              position: "absolute",
              top: 3,
              left: 3,
              fontSize: "0.75rem",
              color: "#fff",
              background: "#ef4444",
              borderRadius: "0.25rem",
              px: 0.5,
              py: 0.25,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": {
                background: "#dc2626",
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
        fontSize: "0.75rem",
        color: "#fff",
        background: "#3b82f6",
        borderRadius: "0.25rem",
        px: 0.5,
        py: 0.25,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        "&:hover": {
          background: "#2563eb",
        },
      },
    },
  ];

  return (
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
  );
}
