"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box } from "@mui/material";
import { Capture, PokemonApiData } from "@/lib/types";
import { decodeTeam } from "@/lib/share";
import { fetchPokemon } from "@/lib/pokemon-api";
import TeamColumn from "@/components/share/TeamColumn";

function ShareContent() {
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<Capture[]>([]);
  const [pokemonData, setPokemonData] = useState<
    Record<number, PokemonApiData>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const encoded = searchParams.get("team");
    if (!encoded) {
      setLoading(false);
      return;
    }
    decodeTeam(encoded).then(async (captures) => {
      setTeam(captures);
      // Fetch pokemon data for types
      const dataMap: Record<number, PokemonApiData> = {};
      await Promise.all(
        captures.map(async (c) => {
          try {
            dataMap[c.pokemonId] = await fetchPokemon(c.pokemonId);
          } catch {
            // silently fail
          }
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
          backgroundColor: "rgba(0, 0, 0, 0)",
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
          backgroundColor: "rgba(0, 0, 0, 0)",
        }}
      >
        No team data found
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0)",
        display: "flex",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      {/* Left column */}
      <TeamColumn team={team} pokemonData={pokemonData} fullHeight />

      {/* Right column - mirror */}
      <TeamColumn team={team} pokemonData={pokemonData} mirror fullHeight />
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
