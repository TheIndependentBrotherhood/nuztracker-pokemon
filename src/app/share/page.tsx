"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box } from "@mui/material";
import { Capture, PokemonApiData, Run } from "@/lib/types";
import { decodeTeam } from "@/lib/share";
import { fetchPokemon } from "@/lib/pokemon-api";
import TeamColumn from "@/components/share/TeamColumn";

function ShareContent() {
  const searchParams = useSearchParams();
  const showTypes = searchParams.get("showTypes") !== "false";
  const tightTypes =
    showTypes && searchParams.get("tightTypes") === "true";
  const [team, setTeam] = useState<Capture[]>([]);
  const [shareRun, setShareRun] = useState<Run | undefined>(undefined);
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
      const hasCustomTypes = captures.some(
        (capture) => (capture.customTypes?.length ?? 0) > 0,
      );
      if (hasCustomTypes) {
        const customTypesByPokemonId: Record<number, string[]> = {};
        for (const capture of captures) {
          if (capture.customTypes && capture.customTypes.length > 0) {
            customTypesByPokemonId[capture.pokemonId] = capture.customTypes;
          }
        }

        setShareRun({
          id: "share",
          gameName: "share",
          region: "share",
          difficulty: "normal",
          isShinyHuntMode: false,
          isRandomMode: true,
          randomizerOptions: {
            randomizeTypes: true,
            randomizeAbilities: false,
            randomizeEncounters: false,
            randomizeEvolvedForms: false,
          },
          customTypesByPokemonId,
          status: "in-progress",
          zones: [],
          team: captures,
          typeChartGeneration: "gen6+",
          createdAt: 0,
          updatedAt: 0,
        });
      } else {
        setShareRun(undefined);
      }

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
      <TeamColumn
        team={team}
        pokemonData={pokemonData}
        run={shareRun}
        showTypes={showTypes}
        tightTypes={tightTypes}
        fullHeight
      />

      {/* Right column - mirror */}
      <TeamColumn
        team={team}
        pokemonData={pokemonData}
        run={shareRun}
        showTypes={showTypes}
        tightTypes={tightTypes}
        mirror
        fullHeight
      />
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
