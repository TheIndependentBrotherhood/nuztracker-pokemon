"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from "@mui/material";

interface Props {
  runsCount: number;
  activeCount: number;
  capturesCount: number;
  onNewRun: () => void;
}

const StatCard = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => (
  <Card
    sx={{
      background: color,
      border: "3px solid #000",
      borderRadius: "1.5rem",
      boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.2)",
      flex: 1,
      minWidth: 0,
      transition: "all 0.3s ease-in-out",
      "&:hover": {
        transform: "scale(1.05)",
        boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.3)",
      },
    }}
  >
    <CardContent sx={{ textAlign: "center", p: { xs: 1.5, sm: 3 } }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 900,
          fontSize: { xs: "2rem", sm: "3rem" },
          color: "#000",
          mb: 1,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: "0.75rem", sm: "0.875rem" },
          fontWeight: 700,
          color: "#000",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </Typography>
    </CardContent>
  </Card>
);

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
          <Button
            onClick={onNewRun}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "3px solid #000",
              borderRadius: "9999px",
              color: "#fff",
              px: 4,
              py: 1.5,
              fontWeight: 700,
              fontSize: "1rem",
              boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.3)",
              transition: "all 0.2s ease-in-out",
              textTransform: "none",
              "&:hover": {
                transform: "translate(-2px, -2px)",
                boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.4)",
              },
              "&:active": {
                transform: "translate(1px, 1px)",
                boxShadow: "2px 2px 0 rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            🚀 Démarrer mon Run
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
