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
  TextField,
  Pagination,
} from "@mui/material";
import { Capture, PokemonData, Run } from "@/lib/types";
import {
  getAvailableEvolutions,
  getLocalizedPokemonName,
} from "@/lib/pokemon-data";
import {
  createEvolvedCapture,
  getEvolutionHistoryForSpecies,
  addEvolutionStep,
  buildInitialEvolutionHistory,
  updateRunWithEvolutionHistory,
} from "@/lib/evolution-utils";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  pokemonCaptured: Capture;
  run: Run;
  onClose: () => void;
  onEvolveComplete?: (evolvedCapture: Capture) => void;
}

export default function EvolutionModal({
  pokemonCaptured,
  run,
  onClose,
  onEvolveComplete,
}: Props) {
  const { updateRun } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;
  const [evolutions, setEvolutions] = useState<PokemonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvolution, setSelectedEvolution] =
    useState<PokemonData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  useEffect(() => {
    async function loadEvolutions() {
      setLoading(true);
      try {
        const available = await getAvailableEvolutions(
          pokemonCaptured.pokemon,
          run,
        );
        setEvolutions(available);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to load evolutions:", error);
        setEvolutions([]);
      } finally {
        setLoading(false);
      }
    }

    loadEvolutions();
  }, [pokemonCaptured, run]);

  // Filter evolutions based on search query
  const filteredEvolutions = evolutions.filter((evolution) => {
    const nameEn =
      evolution.names?.en?.toLowerCase() ??
      evolution.technicalName.toLowerCase();
    const nameFr = evolution.names?.fr?.toLowerCase() ?? "";
    const technicalName = evolution.technicalName.toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    return (
      nameEn.includes(searchLower) ||
      nameFr.includes(searchLower) ||
      technicalName.includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvolutions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvolutions = filteredEvolutions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    setCurrentPage(page);
  };

  const handleEvolve = async () => {
    if (!selectedEvolution) return;

    try {
      // Create the evolved capture
      const evolvedCapture = createEvolvedCapture(
        pokemonCaptured,
        selectedEvolution,
        run.customTypesByPokemonId,
      );

      // Track evolution history at the original species level
      // Use originalCapturedPokemonId if available (in case this capture already evolved)
      const originalPokemonId =
        pokemonCaptured.originalCapturedPokemonId || pokemonCaptured.pokemon.id;
      const timestamp = Date.now();

      // Get existing history for the original species, or start a new one
      const currentHistory = getEvolutionHistoryForSpecies(
        run,
        originalPokemonId,
      );
      const newHistory =
        currentHistory.length === 0
          ? buildInitialEvolutionHistory(
              pokemonCaptured.pokemon,
              pokemonCaptured.createdAt,
            )
          : currentHistory;

      // Add the new evolution step
      const updatedHistory = addEvolutionStep(
        newHistory,
        selectedEvolution,
        timestamp,
      );

      // Update the run with both the evolved capture and the evolution history
      let updatedRun = {
        ...run,
        team: run.team.map((teamCapture) =>
          teamCapture.id === pokemonCaptured.id ? evolvedCapture : teamCapture,
        ),
        zones: run.zones.map((zone) => ({
          ...zone,
          captures: zone.captures.map((zoneCapture) =>
            zoneCapture.id === pokemonCaptured.id
              ? evolvedCapture
              : zoneCapture,
          ),
        })),
      };

      // Update the evolution history in the run
      updatedRun = updateRunWithEvolutionHistory(
        updatedRun,
        originalPokemonId,
        updatedHistory,
      );

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

        {/* Search bar */}
        <TextField
          placeholder={t(tr.evolution.searchPlaceholder, lang)}
          value={searchQuery}
          onChange={handleSearchChange}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              style: { fontSize: "0.875rem" },
            },
          }}
        />

        {/* Grid of evolutions */}
        <Grid container spacing={1.5}>
          {paginatedEvolutions.map((evolution) => (
            <Grid key={evolution.id} size={{ xs: 3 }}>
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
                  src={
                    pokemonCaptured.isShiny
                      ? evolution.sprites.shiny.default
                      : evolution.sprites.normal.default
                  }
                  alt={evolution.technicalName}
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
                  {getLocalizedPokemonName(evolution, lang)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}

        {/* Results info */}
        {filteredEvolutions.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "#999",
              mt: 2,
              textAlign: "center",
            }}
          >
            {filteredEvolutions.length}{" "}
            {t(
              filteredEvolutions.length === 1
                ? tr.evolution.resultSingular
                : tr.evolution.resultPlural,
              lang,
            )}
          </Typography>
        )}

        {searchQuery && filteredEvolutions.length === 0 && (
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: "#999",
              mt: 2,
              textAlign: "center",
            }}
          >
            {(() => {
              const noResultsEntry = t(
                tr.evolution.noResults as unknown as {
                  fr: string | ((...args: unknown[]) => string);
                  en: string | ((...args: unknown[]) => string);
                },
                lang,
              );
              return typeof noResultsEntry === "function"
                ? (noResultsEntry as (query: string) => string)(searchQuery)
                : noResultsEntry;
            })()}
          </Typography>
        )}
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
