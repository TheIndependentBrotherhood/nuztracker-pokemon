"use client";

import { Box, Typography } from "@mui/material";
import { Capture } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PokemonDisplayCard from "./PokemonDisplayCard";

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
            left: 3,
            fontSize: "0.75rem",
            color: "#dc2626",
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: "0.25rem",
            px: 0.5,
            py: 0.25,
            border: "1px solid #f87171",
            cursor: "pointer",
            fontWeight: 600,
            "&:hover": {
              color: "#991b1b",
              background: "#fca5a5",
            },
          },
        },
      ]}
    />
  );
}
