"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Capture, Run } from "@/lib/types";
import {
  getAvailableEvolutions,
  fetchPokemon,
  getCaptureSpriteUrl,
  getCaptureSpriteFallbackUrl,
  type PokemonEvolution,
} from "@/lib/pokemon-api";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  capture: Capture;
  run: Run;
  runId: string;
  zoneId: string;
  onClose: () => void;
  onEvolveComplete?: (evolvedCapture: Capture) => void;
}

export default function EvolutionModal({
  capture,
  run,
  runId,
  zoneId,
  onClose,
  onEvolveComplete,
}: Props) {
  const { updateRun } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;
  const [evolutions, setEvolutions] = useState<PokemonEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvolution, setSelectedEvolution] =
    useState<PokemonEvolution | null>(null);

  useEffect(() => {
    async function loadEvolutions() {
      setLoading(true);
      try {
        const available = await getAvailableEvolutions(capture, run);
        setEvolutions(available);
      } catch (error) {
        console.error("Failed to load evolutions:", error);
        setEvolutions([]);
      } finally {
        setLoading(false);
      }
    }

    loadEvolutions();
  }, [capture, run]);

  const handleEvolve = async () => {
    if (!selectedEvolution) return;

    try {
      // Fetch the new pokemon data
      const newPokemon = await fetchPokemon(selectedEvolution.id);

      // Create the evolved capture
      const evolvedCapture = {
        ...capture,
        pokemonId: selectedEvolution.id,
        pokemonName: selectedEvolution.name,
        pokemonNames: selectedEvolution.names,
      };

      // Update the run with the evolved capture
      const updatedRun = {
        ...run,
        team: run.team.map((teamCapture) =>
          teamCapture.id === capture.id ? evolvedCapture : teamCapture,
        ),
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((zoneCapture) =>
            zoneCapture.id === capture.id ? evolvedCapture : zoneCapture,
          ),
        })),
      };

      updateRun(updatedRun);

      // Call the callback to open PokemonDetailModal
      if (onEvolveComplete) {
        onEvolveComplete(evolvedCapture);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to evolve pokemon:", error);
    }
  };

  if (loading) {
    return (
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t(tr.evolution.title, lang)}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 4,
          }}
        >
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  if (evolutions.length === 0) {
    return (
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t(tr.evolution.title, lang)}</DialogTitle>
        <DialogContent>
          <Typography sx={{ py: 2, textAlign: "center", color: "#666" }}>
            {t(tr.evolution.noEvolutionsAvailable, lang)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t(tr.evolution.closeButton, lang)}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t(tr.evolution.title, lang)}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.875rem", color: "#666", mb: 2 }}>
          {t(tr.evolution.selectEvolution, lang)}
        </Typography>
        <Grid container spacing={1.5}>
          {evolutions.map((evolution) => (
            <Grid item xs={6} key={evolution.id}>
              <Box
                component="button"
                onClick={() => setSelectedEvolution(evolution)}
                sx={{
                  width: "100%",
                  background:
                    selectedEvolution?.id === evolution.id ? "#3b82f6" : "#fff",
                  border:
                    selectedEvolution?.id === evolution.id
                      ? "2px solid #1d4ed8"
                      : "2px solid #000",
                  borderRadius: "0.5rem",
                  p: 1.5,
                  cursor: "pointer",
                  transition: "all 150ms",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  color:
                    selectedEvolution?.id === evolution.id ? "#fff" : "#000",
                  "&:hover": {
                    background:
                      selectedEvolution?.id === evolution.id
                        ? "#2563eb"
                        : "#f0f0f0",
                  },
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evolution.id}.png`}
                  alt={evolution.name}
                  style={{
                    width: "64px",
                    height: "64px",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolution.id}.png`;
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {evolution.names?.[lang] || evolution.name}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ height: "2rem", px: 2 }}>
          {t(tr.evolution.cancelButton, lang)}
        </Button>
        <Button
          onClick={handleEvolve}
          disabled={!selectedEvolution}
          variant="contained"
          sx={{ height: "2rem", px: 2 }}
        >
          {t(tr.evolution.evolveButton, lang)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
