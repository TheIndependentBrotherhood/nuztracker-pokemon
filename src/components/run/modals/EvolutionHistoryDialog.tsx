import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { EvolutionHistoryEntry } from "@/lib/types";
import { getPokemonById } from "@/lib/pokemon-data";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { getEvolutionStepCount } from "@/lib/evolution-display-utils";

interface Props {
  evolutionHistory: EvolutionHistoryEntry[];
  open: boolean;
  onClose: () => void;
}

/**
 * Display a detailed evolution history dialog for a Pokémon species.
 * Shows all evolution steps with dates and species information.
 */
export function EvolutionHistoryDialog({
  evolutionHistory,
  open,
  onClose,
}: Props) {
  const { lang } = useLanguage();
  const tr = translations;
  const [pokemonData, setPokemonData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  const stepCount = getEvolutionStepCount(evolutionHistory);

  useEffect(() => {
    if (!open || !evolutionHistory.length) {
      setLoading(false);
      return;
    }

    // Load pokemon data for all species in the history
    (async () => {
      const data: Record<number, any> = {};
      for (const entry of evolutionHistory) {
        if (!pokemonData[entry.pokemonId]) {
          try {
            const pokemon = await getPokemonById(entry.pokemonId);
            data[entry.pokemonId] = pokemon;
          } catch (error) {
            console.error(`Failed to load pokemon ${entry.pokemonId}:`, error);
          }
        }
      }
      setPokemonData((prev) => ({ ...prev, ...data }));
      setLoading(false);
    })();
  }, [open, evolutionHistory]);

  if (!evolutionHistory || evolutionHistory.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(
      lang === "fr" ? "fr-FR" : "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t(tr.pokemonDetail?.evolutionHistory ?? "Evolution History", lang)}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {evolutionHistory.map((entry, index) => {
              const pokemon = pokemonData[entry.pokemonId];
              const isLast = index === evolutionHistory.length - 1;
              const displayName =
                lang === "fr"
                  ? (pokemon?.names?.fr ?? entry.technicalName)
                  : (pokemon?.names?.en ?? entry.technicalName);

              return (
                <Box key={`${entry.pokemonId}-${index}`}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                      borderRadius: "0.5rem",
                      background: isLast ? "#eff6ff" : "#f9fafb",
                      border: isLast
                        ? "2px solid #0284c7"
                        : "1px solid #e5e7eb",
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "40px",
                        height: "40px",
                        borderRadius: "0.5rem",
                        background: isLast ? "#0284c7" : "#e5e7eb",
                        color: isLast ? "#fff" : "#666",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      {index === 0 ? "🎯" : "⬆️"}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          color: "#000",
                        }}
                      >
                        {displayName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "#666",
                          mt: 0.25,
                        }}
                      >
                        {index === 0
                          ? lang === "fr"
                            ? "Espèce capturée"
                            : "Captured species"
                          : lang === "fr"
                            ? `Évolution #${index}`
                            : `Evolution #${index}`}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.65rem",
                          color: "#999",
                          mt: 0.25,
                        }}
                      >
                        {formatDate(entry.timestamp)}
                      </Typography>
                    </Box>

                    {/* Step indicator */}
                    {index < evolutionHistory.length - 1 && (
                      <Box
                        sx={{
                          fontSize: "1.25rem",
                          color: "#cbd5e1",
                          fontWeight: 300,
                        }}
                      >
                        ↓
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            color: "#0284c7",
          }}
        >
          {t(tr.pokemonDetail?.closeButton ?? "Close", lang)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
