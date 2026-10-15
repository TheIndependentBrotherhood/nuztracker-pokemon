"use client";

import { Box, Typography } from "@mui/material";
import { Run } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import StyledButton from "@/components/ui/StyledButton";

interface Props {
  localRun: Run;
  cloudRun: Run;
  onKeepLocal: () => void;
  onKeepCloud: () => void;
}

function formatDate(ts: number, lang: string): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export default function SyncConflictDialog({
  localRun,
  cloudRun,
  onKeepLocal,
  onKeepCloud,
}: Props) {
  const { lang } = useLanguage();
  const tr = translations;

  return (
    /* Backdrop */
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      {/* Card */}
      <Box
        sx={{
          background: "#fff",
          border: "4px solid #000",
          borderRadius: "1.5rem",
          p: { xs: 3, sm: 4 },
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        }}
      >
        <Typography
          sx={{ fontSize: "1.25rem", fontWeight: 800, mb: 1, color: "#000" }}
        >
          {t(tr.cloudSync.conflictTitle, lang)}
        </Typography>

        <Typography sx={{ fontSize: "0.9rem", color: "#444", mb: 3 }}>
          {t(tr.cloudSync.conflictDescription, lang)}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          {/* Local */}
          <Box
            sx={{
              border: "3px solid #000",
              borderRadius: "1rem",
              p: 2,
              background: "linear-gradient(135deg,#e0f2fe 0%,#bae6fd 100%)",
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 0.5 }}>
              {t(tr.cloudSync.conflictLocalLabel, lang)}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#374151" }}>
              {t(tr.cloudSync.conflictLastUpdated, lang)}
            </Typography>
            <Typography
              sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#000" }}
            >
              {formatDate(localRun.updatedAt, lang)}
            </Typography>
          </Box>

          {/* Cloud */}
          <Box
            sx={{
              border: "3px solid #000",
              borderRadius: "1rem",
              p: 2,
              background: "linear-gradient(135deg,#d1fae5 0%,#6ee7b7 100%)",
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 0.5 }}>
              {t(tr.cloudSync.conflictCloudLabel, lang)}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#374151" }}>
              {t(tr.cloudSync.conflictLastUpdated, lang)}
            </Typography>
            <Typography
              sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#000" }}
            >
              {formatDate(cloudRun.updatedAt, lang)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <StyledButton variant="secondary" onClick={onKeepLocal}>
            {t(tr.cloudSync.conflictKeepLocal, lang)}
          </StyledButton>
          <StyledButton variant="primary" onClick={onKeepCloud}>
            {t(tr.cloudSync.conflictKeepCloud, lang)}
          </StyledButton>
        </Box>
      </Box>
    </Box>
  );
}
