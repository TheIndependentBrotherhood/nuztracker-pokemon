"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Box } from "@mui/material";
import { Capture, Run } from "@/lib/types";
import { decodeTeam } from "@/lib/share";
import TeamColumn from "@/components/share/TeamColumn";
import { getGameVersion, gameTypeChart } from "@/lib/game-catalog";
import { validationMessage } from "@/lib/tracker/schema";

function ShareContent() {
  const searchParams = useSearchParams();
  const showTypes = searchParams.get("showTypes") !== "false";
  const tightTypes = showTypes && searchParams.get("tightTypes") === "true";
  const isRipMode = searchParams.get("isRip") === "true";
  const [team, setTeam] = useState<Capture[]>([]);
  const [shareRun, setShareRun] = useState<Run | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadTeam() {
      try {
        const encoded = searchParams.get("team");
        if (!encoded) throw new Error("This link does not contain a team.");
        const game = searchParams.get("game");
        const gameVersion = game ? getGameVersion(game)?.id : undefined;
        if (game && !gameVersion) throw new Error("This link uses an unsupported game reference.");
        const captures = await decodeTeam(encoded);
        if (cancelled) return;
        setTeam(captures);
        setError("");
        const hasCustomTypes = searchParams.get("randomTypes") === "true" || captures.some(
          (capture) => (capture.customTypes?.length ?? 0) > 0,
        );
        const customTypesByPokemonId: Record<number, string[]> = {};
        for (const capture of captures) {
          if (capture.customTypes && capture.customTypes.length > 0) {
            customTypesByPokemonId[capture.pokemon.id] = capture.customTypes;
          }
        }

        setShareRun({
          id: "share",
          gameName: "share",
          gameVersion,
          region: "share",
          difficulty: "normal",
          isShinyHuntMode: false,
          isRandomMode: hasCustomTypes,
          randomizerOptions: {
            randomizeTypes: hasCustomTypes,
            randomizeAbilities: false,
            randomizeEncounters: false,
            randomizeEvolvedForms: false,
          },
          customTypesByPokemonId,
          status: "in-progress",
          zones: [],
          team: captures,
          typeChartGeneration: gameVersion ? gameTypeChart(gameVersion) : "gen6+",
          createdAt: 0,
          updatedAt: 0,
        });
      } catch (failure) {
        if (!cancelled) setError(validationMessage(failure));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTeam();
    return () => { cancelled = true; };
  }, [searchParams]);

  if (error) return <Alert severity="error">{error}</Alert>;
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
        justifyContent: isRipMode ? "center" : "space-between",
        alignItems: isRipMode ? "center" : "stretch",
        overflow: "hidden",
      }}
    >
      {isRipMode ? (
        /* RIP mode - single horizontal line */
        <TeamColumn
          team={team}
          pokemonData={{}}
          run={shareRun}
          showTypes={showTypes}
          tightTypes={tightTypes}
          isRipMode
        />
      ) : (
        <>
          {/* Left column */}
          <TeamColumn
            team={team}
            pokemonData={{}}
            run={shareRun}
            showTypes={showTypes}
            tightTypes={tightTypes}
            fullHeight
          />

          {/* Right column - mirror */}
          <TeamColumn
            team={team}
            pokemonData={{}}
            run={shareRun}
            showTypes={showTypes}
            tightTypes={tightTypes}
            mirror
            fullHeight
          />
        </>
      )}
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
