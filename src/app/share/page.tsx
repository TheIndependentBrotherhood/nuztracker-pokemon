"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box } from "@mui/material";
import { Capture, PokemonData, Run } from "@/lib/types";
import { decodeTeam } from "@/lib/share";
import { getPokemonById } from "@/lib/pokemon-data";
import { getRunFromCloud } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import TeamColumn from "@/components/share/TeamColumn";

function ShareContent() {
  const searchParams = useSearchParams();
  const showTypes = searchParams.get("showTypes") !== "false";
  const tightTypes = showTypes && searchParams.get("tightTypes") === "true";
  const isRipMode = searchParams.get("isRip") === "true";
  const runId = searchParams.get("runId");
  const exportType = searchParams.get("type"); // "team" | "rip" | null
  const [team, setTeam] = useState<Capture[]>([]);
  const [shareRun, setShareRun] = useState<Run | undefined>(undefined);
  const [pokemonData, setPokemonData] = useState<Record<number, PokemonData>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // ── Live Firestore mode ──────────────────────────────────────────────
      if (runId && isFirebaseConfigured()) {
        try {
          const run = await getRunFromCloud(runId);
          if (run) {
            const isRip = exportType === "rip";
            const captures = isRip
              ? run.zones
                  .flatMap((z) => z.captures)
                  .filter((c) => c.isDead)
                  .sort((a, b) => (b.diedAt ?? 0) - (a.diedAt ?? 0))
                  .slice(0, 3)
              : run.team;

            setTeam(captures);
            setShareRun(run);

            const dataMap: Record<number, PokemonData> = {};
            await Promise.all(
              captures.map(async (c) => {
                try {
                  const data = await getPokemonById(c.pokemon.id);
                  if (data) dataMap[c.pokemon.id] = data;
                } catch {
                  // silently fail
                }
              }),
            );
            setPokemonData(dataMap);
          }
        } catch {
          // silently fail — fall through to empty state
        }
        setLoading(false);
        return;
      }

      // ── Legacy base64 mode ───────────────────────────────────────────────
      const encoded = searchParams.get("team");
      if (!encoded) {
        setLoading(false);
        return;
      }
      const captures = await decodeTeam(encoded);
      setTeam(captures);
      const hasCustomTypes = captures.some(
        (capture) => (capture.customTypes?.length ?? 0) > 0,
      );
      if (hasCustomTypes) {
        const customTypesByPokemonId: Record<number, string[]> = {};
        for (const capture of captures) {
          if (capture.customTypes && capture.customTypes.length > 0) {
            customTypesByPokemonId[capture.pokemon.id] = capture.customTypes;
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

      const dataMap: Record<number, PokemonData> = {};
      await Promise.all(
        captures.map(async (c) => {
          try {
            const data = await getPokemonById(c.pokemon.id);
            if (data) {
              dataMap[c.pokemon.id] = data;
            }
          } catch {
            // silently fail
          }
        }),
      );
      setPokemonData(dataMap);
      setLoading(false);
    }

    load();
  }, [searchParams, runId, exportType]);

  // Derive effective RIP mode: explicit param or type=rip
  const effectiveIsRip = isRipMode || exportType === "rip";

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
        justifyContent: effectiveIsRip ? "center" : "space-between",
        alignItems: effectiveIsRip ? "center" : "stretch",
        overflow: "hidden",
      }}
    >
      {effectiveIsRip ? (
        /* RIP mode - single horizontal line */
        <TeamColumn
          team={team}
          pokemonData={pokemonData}
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
