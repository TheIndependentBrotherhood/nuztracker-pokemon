"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import RunList from "@/components/home/RunList";
import CreateRunModal from "@/components/ui/CreateRunModal";
import HeroSection from "@/components/home/HeroSection";
import FeatureCard from "@/components/home/FeatureCard";
import StyledButton from "@/components/ui/StyledButton";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import Header from "@/components/layout/Header";

const SPRITE_SOURCES = [
  {
    title: "Retronc - Gen 5 Style Gallery",
    description:
      "Collection DeviantArt de sprites au style Gen 5 utilisée comme source principale pour de nombreuses formes et animations.",
    url: "https://www.deviantart.com/retronc/gallery/98179468/in-gen-5-style",
  },
  {
    title: "Smogon Sprite Project",
    description:
      "Thread communautaire Smogon utilisé pour compléter des sprites animés ou alternatifs conservés manuellement dans le cache.",
    url: "https://www.smogon.com/forums/threads/smogon-sprite-project.3647722/",
  },
  {
    title: "mbcmechachu - Favourite Gen 5 Style Sprites",
    description:
      "Sélection DeviantArt de sprites animés Gen 5 style utilisée comme source complémentaire pendant la curation.",
    url: "https://www.deviantart.com/mbcmechachu/favourites/70416144/pokemon-animated-sprites-gen-5-style",
  },
  {
    title: "PokeAPI",
    description:
      "API officielle utilisée pour les données Pokémon et les sprites statiques de fallback.",
    url: "https://pokeapi.co/",
  },
] as const;

export default function HomePage() {
  const { runs, loadRuns } = useRunStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showSpriteSources, setShowSpriteSources] = useState(false);
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

        <Box
          component="section"
          sx={{
            mt: runs.length > 0 ? 8 : 6,
            pt: 4,
            borderTop: "3px solid #000",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Stack spacing={1.5} sx={{ alignItems: "center", maxWidth: 720 }}>
            <StyledButton
              onClick={() => setShowSpriteSources(true)}
              variant="secondary"
              shape="pill"
            >
              {t(tr.home.spriteSourcesButton, lang)}
            </StyledButton>
            <Typography
              sx={{
                color: "#666",
                fontSize: "0.95rem",
                fontWeight: 500,
                textAlign: "center",
                px: 2,
              }}
            >
              {t(tr.home.spriteSourcesDescription, lang)}
            </Typography>
          </Stack>
        </Box>

        {showCreate && <CreateRunModal onClose={() => setShowCreate(false)} />}

        <Dialog
          open={showSpriteSources}
          onClose={() => setShowSpriteSources(false)}
          maxWidth="md"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                background: "#FEF3E2",
                border: "3px solid #000",
                borderRadius: "1.5rem",
                boxShadow: "0 20px 25px rgba(0, 0, 0, 0.2)",
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 900,
              fontSize: "1.5rem",
              color: "#000",
              pb: 1,
            }}
          >
            {t(tr.home.spriteSourcesTitle, lang)}
          </DialogTitle>

          <DialogContent sx={{ pb: 3, pt: 2 }}>
            <Typography
              sx={{
                color: "#666",
                fontSize: "0.95rem",
                fontWeight: 500,
                mb: 3,
              }}
            >
              {t(tr.home.spriteSourcesSubtitle, lang)}
            </Typography>

            <Stack spacing={2}>
              {SPRITE_SOURCES.map((source) => (
                <Box
                  key={source.url}
                  sx={{
                    p: 2.5,
                    border: "2px solid #000",
                    borderRadius: "1rem",
                    background: "rgba(255, 255, 255, 0.45)",
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: "#000", mb: 0.75 }}>
                    {source.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#4b5563",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      mb: 1.5,
                    }}
                  >
                    {source.description}
                  </Typography>
                  <Link
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{
                      color: "#2563eb",
                      fontWeight: 700,
                      wordBreak: "break-all",
                    }}
                  >
                    {t(tr.home.visitSource, lang)}: {source.url}
                  </Link>
                </Box>
              ))}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
            <StyledButton
              onClick={() => setShowSpriteSources(false)}
              variant="secondary"
              shape="pill"
            >
              {t(tr.createRun.cancel, lang)}
            </StyledButton>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
