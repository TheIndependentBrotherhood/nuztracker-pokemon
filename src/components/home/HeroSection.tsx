"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import StyledButton from "@/components/ui/StyledButton";
import StatCard from "@/components/ui/StatCard";

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
              Votre tracker ultime pour les runs Nuzlocke
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.9rem", sm: "1rem" },
                color: "#666",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              Suivi en temps réel, gestion d&apos;équipe avancée et statistiques
              détaillées pour vos aventures Pokémon les plus difficiles
            </Typography>
          </Stack>

          {/* Stats Cards */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ width: "100%", maxWidth: "600px" }}
          >
            <StatCard value={runsCount} label="Runs" color="#E3F2FD" />
            <StatCard value={activeCount} label="Actifs" color="#E8F5E9" />
            <StatCard value={capturesCount} label="Captures" color="#F3E5F5" />
          </Stack>

          {/* CTA Button */}
          <StyledButton onClick={onNewRun} variant="primary" shape="pill">
            🚀 Démarrer mon Run
          </StyledButton>
        </Stack>
      </Container>
    </Box>
  );
}
