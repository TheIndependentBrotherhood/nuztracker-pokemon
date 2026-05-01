"use client";

import { useEffect, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import RunList from "@/components/home/RunList";
import CreateRunModal from "@/components/ui/CreateRunModal";
import HeroSection from "@/components/home/HeroSection";
import FeatureCard from "@/components/home/FeatureCard";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import Header from "@/components/layout/Header";

export default function HomePage() {
  const { runs, loadRuns } = useRunStore();
  const [showCreate, setShowCreate] = useState(false);
  const { lang } = useLanguage();
  const tr = translations;

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const FEATURES = [
    {
      icon: "🗺️",
      title: t(tr.home.features.interactiveMaps.title, lang),
      description: t(tr.home.features.interactiveMaps.description, lang),
    },
    {
      icon: "⚔️",
      title: t(tr.home.features.teamManagement.title, lang),
      description: t(tr.home.features.teamManagement.description, lang),
    },
    {
      icon: "📊",
      title: t(tr.home.features.typeAnalysis.title, lang),
      description: t(tr.home.features.typeAnalysis.description, lang),
    },
    {
      icon: "✨",
      title: t(tr.home.features.shinyHunt.title, lang),
      description: t(tr.home.features.shinyHunt.description, lang),
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6, pb: 10 }}>
        {/* Hero Section */}
        <HeroSection
          runsCount={runs.length}
          activeCount={runs.filter((r) => r.status === "in-progress").length}
          capturesCount={runs.reduce((acc, r) => acc + r.team.length, 0)}
          deadCount={runs.reduce(
            (acc, r) =>
              acc +
              r.zones.reduce(
                (zAcc, z) => zAcc + z.captures.filter((c) => c.isDead).length,
                0,
              ),
            0,
          )}
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
                {t(tr.home.readyToStart, lang)}
              </Typography>
              <Typography
                sx={{
                  color: "#666",
                  fontSize: "1.05rem",
                  fontWeight: 500,
                }}
              >
                {t(tr.home.discoverFeatures, lang)}
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
                {t(tr.home.yourRuns, lang)}
              </Typography>
              <Typography
                sx={{
                  color: "#666",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                }}
              >
                {t(tr.home.runsInProgress, lang)(runs.length)}
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
