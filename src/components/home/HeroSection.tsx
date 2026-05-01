"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import StyledButton from "@/components/ui/StyledButton";
import StatCard from "@/components/ui/StatCard";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  runsCount: number;
  activeCount: number;
  capturesCount: number;
  onNewRun: () => void;
}

export default function HeroSection({
  runsCount,
  activeCount,
  capturesCount,
  onNewRun,
}: Props) {
  const { lang } = useLanguage();
  const tr = translations;

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 6 }, px: 2 }}>
      <Container maxWidth="md">
        <Stack spacing={2.5} sx={{ alignItems: "center" }}>
          {/* Title */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.5rem", sm: "3.5rem", lg: "4.5rem" },
              fontWeight: 900,
              color: "#000",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            NuzTracker
          </Typography>

          {/* Subtitle */}
          <Stack spacing={1} sx={{ alignItems: "center", maxWidth: "600px" }}>
            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: "1.125rem", sm: "1.5rem" },
                fontWeight: 700,
                color: "#000",
                textAlign: "center",
              }}
            >
              {t(tr.hero.subtitle, lang)}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.9rem", sm: "1rem" },
                color: "#666",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {t(tr.hero.description, lang)}
            </Typography>
          </Stack>

          {/* Stats Cards */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ width: "100%", maxWidth: "600px" }}
          >
            <StatCard value={runsCount} label="Runs" color="#E3F2FD" />
            <StatCard value={activeCount} label={t(tr.hero.statActive, lang)} color="#E8F5E9" />
            <StatCard value={capturesCount} label={t(tr.hero.statCaptures, lang)} color="#F3E5F5" />
          </Stack>

          {/* CTA Button */}
          <StyledButton onClick={onNewRun} variant="primary" shape="pill">
            {t(tr.hero.startRun, lang)}
          </StyledButton>
        </Stack>
      </Container>
    </Box>
  );
}
