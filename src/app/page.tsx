"use client";

import { useEffect, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import RunList from "@/components/home/RunList";
import CreateRunModal from "@/components/ui/CreateRunModal";
import HeroSection from "@/components/home/HeroSection";
import FeatureCard from "@/components/home/FeatureCard";

const FEATURES = [
  {
    icon: "🗺️",
    title: "Cartes Interactives",
    description:
      "Visualisez vos zones sur des cartes interactives pour chaque région Pokémon.",
  },
  {
    icon: "⚔️",
    title: "Gestion d'Équipe",
    description:
      "Gérez votre équipe de 6 Pokémon avec sprites, types et statistiques.",
  },
  {
    icon: "📊",
    title: "Analyse de Types",
    description:
      "Analysez les forces et faiblesses de votre équipe en temps réel.",
  },
  {
    icon: "✨",
    title: "Mode Shiny Hunt",
    description:
      "Activez le mode Shiny Hunt pour vos runs à la recherche des raretés.",
  },
];

export default function HomePage() {
  const { runs, loadRuns } = useRunStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 6, pb: 10 }}>
        {/* Hero Section */}
        <HeroSection
          runsCount={runs.length}
          activeCount={runs.filter((r) => r.status === "in-progress").length}
          capturesCount={runs.reduce((acc, r) => acc + r.team.length, 0)}
          onNewRun={() => setShowCreate(true)}
        />

        {/* Features Grid */}
        {runs.length === 0 && (
          <Box component="section" sx={{ mt: 3, mb: 4 }}>
            <Box sx={{ mb: 6, textAlign: "center" }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  color: "#000",
                  mb: 1.5,
                  fontSize: { xs: "1.75rem", sm: "2.25rem" },
                }}
              >
                Prêt à commencer ?
              </Typography>
              <Typography
                sx={{
                  color: "#666",
                  fontSize: "1.05rem",
                  fontWeight: 500,
                }}
              >
                Découvrez ce que NuzTracker peut faire pour vous
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "repeat(4, 1fr)",
                },
                gap: 3,
              }}
            >
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </Box>
          </Box>
        )}

        {/* Recent Runs */}
        {runs.length > 0 && (
          <Box component="section" sx={{ mt: 8 }}>
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: "#000",
                  mb: 0.5,
                }}
              >
                Vos Runs
              </Typography>
              <Typography
                sx={{
                  color: "#666",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                }}
              >
                {runs.length} run{runs.length > 1 ? "s" : ""} en cours ou
                complétés
              </Typography>
            </Box>
            <RunList runs={runs} />
          </Box>
        )}

        {showCreate && <CreateRunModal onClose={() => setShowCreate(false)} />}
      </Container>
    </Box>
  );
}
