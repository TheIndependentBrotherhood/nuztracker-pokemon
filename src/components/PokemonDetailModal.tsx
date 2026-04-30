"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Button, Grid, CircularProgress } from "@mui/material";
import { Capture, PokemonApiData } from "@/lib/types";
import { fetchPokemon, getSpriteUrl } from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";

interface Props {
  capture: Capture;
  onClose: () => void;
}

const statLabels: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Vit",
};

function StatBar({
  name,
  value,
  max = 255,
}: {
  name: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#3b82f6" : "#ef4444";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: "#64748b",
          width: "32px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {statLabels[name] ?? name}
      </Typography>
      <Box
        sx={{
          flex: 1,
          background: "rgba(71, 85, 105, 0.6)",
          borderRadius: "999px",
          height: "6px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "999px",
            transition: "width 500ms ease",
            background: color,
            width: `${pct}%`,
          }}
        />
      </Box>
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: "#94a3b8",
          width: "28px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function PokemonDetailModal({ capture, onClose }: Props) {
  const [data, setData] = useState<PokemonApiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemon(capture.pokemonId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [capture.pokemonId]);

  const genderSymbol =
    capture.gender === "male" ? "♂" : capture.gender === "female" ? "♀" : null;
  const genderColor = capture.gender === "male" ? "#60a5fa" : "#ec4899";

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
        animation: "fadeIn 300ms ease",
        "@keyframes fadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          background: "#1e293b",
          borderRadius: "1rem",
          p: 3,
          width: "100%",
          maxWidth: "448px",
          border: "1px solid rgba(71, 85, 105, 0.6)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "slideUp 300ms ease",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <Box sx={{ textAlign: "center", py: 6, color: "#64748b" }}>
            Chargement...
          </Box>
        ) : data ? (
          <>
            {/* Header */}
            <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
                alt={data.name}
                style={{
                  width: "96px",
                  height: "96px",
                  objectFit: "contain",
                  filter: "drop-shadow(0 10px 15px -3px rgba(0, 0, 0, 0.1))",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    textTransform: "capitalize",
                    lineHeight: 1.25,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                    color: "#fff",
                  }}
                >
                  {capture.nickname || capture.pokemonName}
                  {capture.isShiny && (
                    <span style={{ fontSize: "1rem" }}>✨</span>
                  )}
                  {genderSymbol && (
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 400,
                        color: genderColor,
                      }}
                    >
                      {genderSymbol}
                    </span>
                  )}
                </Typography>
                <Typography
                  sx={{
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    textTransform: "capitalize",
                    mt: 0.25,
                  }}
                >
                  {data.name} #{data.id.toString().padStart(3, "0")}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}
                >
                  {data.types.map(({ type }) => (
                    <Box
                      key={type.name}
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#fff",
                        textTransform: "capitalize",
                        background: typeColors[type.name] ?? "#888",
                      }}
                    >
                      {type.name}
                    </Box>
                  ))}
                </Box>
                <Typography
                  sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 0.75 }}
                >
                  Lv. {capture.level}
                </Typography>
              </Box>
            </Box>

            {/* Base Stats */}
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#64748b",
                  mb: 1,
                }}
              >
                Statistiques de base
              </Typography>
              {data.stats.map((s) => (
                <StatBar
                  key={s.stat.name}
                  name={s.stat.name}
                  value={s.base_stat}
                />
              ))}
            </Box>

            {/* Physical info */}
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(71, 85, 105, 0.25)",
                    borderRadius: "0.5rem",
                    p: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      mb: 0.25,
                    }}
                  >
                    Taille
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {(data.height / 10).toFixed(1)} m
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(71, 85, 105, 0.25)",
                    borderRadius: "0.5rem",
                    p: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      mb: 0.25,
                    }}
                  >
                    Poids
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {(data.weight / 10).toFixed(1)} kg
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </>
        ) : (
          <Box sx={{ textAlign: "center", py: 6, color: "#f87171" }}>
            Impossible de charger les données
          </Box>
        )}

        <Button
          onClick={onClose}
          sx={{
            mt: 2.5,
            width: "100%",
            background: "#475569",
            color: "#cbd5e1",
            py: 1.5,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            textTransform: "none",
            transition: "all 200ms",
            "&:hover": {
              background: "#64748b",
              color: "#fff",
            },
          }}
        >
          Fermer
        </Button>
      </Box>
    </Box>
  );
}
