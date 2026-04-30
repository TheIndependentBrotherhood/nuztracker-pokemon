"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box, Typography, Grid } from "@mui/material";
import { Capture, PokemonApiData } from "@/lib/types";
import { decodeTeam } from "@/lib/share";
import { fetchPokemon, getSpriteUrl } from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";

function ShareContent() {
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<Capture[]>([]);
  const [pokemonData, setPokemonData] = useState<
    Record<number, PokemonApiData>
  >({});
  const [loading, setLoading] = useState(true);

  const showTypes = searchParams.get("showTypes") === "true";
  const showLevels = searchParams.get("showLevels") === "true";

  useEffect(() => {
    const encoded = searchParams.get("team");
    if (!encoded) {
      setLoading(false);
      return;
    }
    decodeTeam(encoded).then(async (captures) => {
      setTeam(captures);
      const dataMap: Record<number, PokemonApiData> = {};
      await Promise.all(
        captures.map(async (c) => {
          try {
            dataMap[c.pokemonId] = await fetchPokemon(c.pokemonId);
          } catch {}
        }),
      );
      setPokemonData(dataMap);
      setLoading(false);
    });
  }, [searchParams]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#111827",
          color: "#fff",
        }}
      >
        Loading team...
      </Box>
    );
  }

  if (team.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#111827",
          color: "#fff",
        }}
      >
        No team data found
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#111827",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Box
        sx={{
          background: "#1f2937",
          borderRadius: "1rem",
          p: 4,
          border: "1px solid #4b5563",
          width: "100%",
          maxWidth: "1280px",
          aspectRatio: "16 / 9",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          sx={{
            fontSize: "1.875rem",
            fontWeight: 900,
            color: "#fbbf24",
            textAlign: "center",
            mb: 4,
          }}
        >
          NuzTracker Team
        </Typography>
        <Grid container spacing={2} sx={{ flex: 1 }}>
          {team.map((capture) => {
            const data = pokemonData[capture.pokemonId];
            const types = data?.types.map((t) => t.type.name) ?? [];

            return (
              <Grid item xs={2} key={capture.id}>
                <Box
                  sx={{
                    background: "#374151",
                    borderRadius: "0.75rem",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    height: "100%",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
                    alt={capture.pokemonName}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "contain",
                    }}
                  />
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        fontSize: "0.875rem",
                      }}
                    >
                      {capture.nickname || capture.pokemonName}
                      {capture.isShiny && " ✨"}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#9ca3af",
                        fontSize: "0.75rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {capture.pokemonName}
                    </Typography>
                    {showLevels && (
                      <Typography
                        sx={{ color: "#d1d5db", fontSize: "0.75rem" }}
                      >
                        Lv.{capture.level}
                      </Typography>
                    )}
                  </Box>
                  {showTypes && types.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      {types.map((t) => (
                        <Box
                          key={t}
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: "0.25rem",
                            fontSize: "0.75rem",
                            color: "#fff",
                            textTransform: "capitalize",
                            fontWeight: 500,
                            background: typeColors[t] ?? "#888",
                          }}
                        >
                          {t}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: "100vh",
            background: "#111827",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Loading...
        </Box>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
