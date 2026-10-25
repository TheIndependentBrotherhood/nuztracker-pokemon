"use client";

import { Box, Tooltip, Typography } from "@mui/material";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import {
  CAPTURE_DIFFICULTY_COLORS,
  formatCatchProbability,
  getCaptureDifficulty,
  getCatchProbability,
} from "@/lib/capture-rate";

interface Props {
  captureRate?: number;
  /** "card" matches the physical info cells of the detail sheet; "chip" is a compact inline badge */
  variant?: "card" | "chip";
}

export default function CaptureRateBadge({
  captureRate,
  variant = "card",
}: Props) {
  const { lang } = useLanguage();
  const tr = translations;

  if (captureRate === undefined) return null;

  const probability = getCatchProbability(captureRate);
  const probabilityLabel = formatCatchProbability(probability, lang);
  const difficulty = getCaptureDifficulty(captureRate);
  const color = CAPTURE_DIFFICULTY_COLORS[difficulty];
  const difficultyLabel = tr.pokemonDetail.captureDifficulty[lang][difficulty];
  const hint = t(tr.pokemonDetail.captureRateHint, lang)(
    captureRate,
    probabilityLabel,
  );

  if (variant === "chip") {
    return (
      <Tooltip arrow title={hint}>
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 0.75,
            py: 0.2,
            borderRadius: "999px",
            border: "1px solid #000",
            background: "#fff",
            fontSize: "0.68rem",
            fontWeight: 800,
            color,
            cursor: "help",
            whiteSpace: "nowrap",
          }}
        >
          🎯 {captureRate} · {probabilityLabel}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip arrow title={hint}>
      <Box
        sx={{
          background: "#f0f4f8",
          border: "2px solid #cbd5e1",
          borderRadius: "0.5rem",
          p: 1.5,
          cursor: "help",
          height: "100%",
        }}
      >
        <Typography sx={{ fontSize: "0.75rem", color: "#666", mb: 0.25 }}>
          🎯 {t(tr.pokemonDetail.captureRate, lang)}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
          <Typography sx={{ fontWeight: 600, color: "#000" }}>
            {captureRate}
            <Box component="span" sx={{ fontSize: "0.7rem", color: "#666" }}>
              /255
            </Box>
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, color }}>
            ≈ {probabilityLabel}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color }}>
          {difficultyLabel}
        </Typography>
      </Box>
    </Tooltip>
  );
}
