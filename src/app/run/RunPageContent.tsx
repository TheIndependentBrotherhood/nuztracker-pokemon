"use client";

import { useLayoutEffect, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { getRun } from "@/lib/storage";
import StatsBar from "@/components/run/StatsBar";
import MapView from "@/components/run/MapView";
import ZoneList from "@/components/run/ZoneList";
import TeamView from "@/components/run/TeamView";
import TeamColumn from "@/components/share/TeamColumn";
import TypeAnalysis from "@/components/run/TypeAnalysis";
import Header from "@/components/layout/Header";
import StyledButton from "@/components/ui/StyledButton";
import { fetchPokemon } from "@/lib/pokemon-api";
import { PokemonApiData } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

type Tab = "zones" | "team";

export default function RunPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { runs, loadRuns, setCurrentRun, updateRun } = useRunStore();
  const [tab, setTab] = useState<Tab>("zones");
  const [showTypesDrawer, setShowTypesDrawer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pokemonData, setPokemonData] = useState<
    Record<number, PokemonApiData>
  >({});
  const { lang } = useLanguage();
  const tr = translations;

  const id = searchParams.get("id") ?? "";

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const run = runs.find((r) => r.id === id) ?? (mounted ? getRun(id) : null);

  useEffect(() => {
    if (run) setCurrentRun(run);
  }, [run, setCurrentRun]);

  // Load pokemon data for export display
  useEffect(() => {
    if (!run || run.team.length === 0) {
      setPokemonData({});
      return;
    }

    const loadPokemonData = async () => {
      const dataMap: Record<number, PokemonApiData> = {};
      await Promise.all(
        run.team.map(async (pokemon) => {
          try {
            dataMap[pokemon.pokemonId] = await fetchPokemon(pokemon.pokemonId);
          } catch (error) {
            console.error(
              `Failed to fetch pokemon ${pokemon.pokemonId}:`,
              error,
            );
          }
        }),
      );
      setPokemonData(dataMap);
    };

    loadPokemonData();
  }, [run]);

  if (!mounted) return null;

  if (!run) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom right, #FFFEF0, #FEF3C7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            background: "#fff",
            border: "4px solid #000",
            borderRadius: "1.875rem",
            p: 4,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography sx={{ fontSize: "3rem", mb: 2 }}>😿</Typography>
          <Typography
            sx={{
              color: "#000",
              fontSize: "1.125rem",
              fontWeight: 700,
              mb: 3,
            }}
          >
            {t(tr.runPage.runNotFound, lang)}
          </Typography>
          <StyledButton
            onClick={() => router.push("/")}
            variant="secondary"
            sx={{ px: 6, py: 1 }}
          >
            {t(tr.runPage.backHome, lang)}
          </StyledButton>
        </Box>
      </Box>
    );
  }

  const statusActions =
    run.status === "in-progress" ? (
      <>
        <StyledButton
          onClick={() => updateRun({ ...run, status: "completed" })}
          variant="primary"
        >
          {t(tr.runPage.finish, lang)}
        </StyledButton>
        <StyledButton
          onClick={() => updateRun({ ...run, status: "abandoned" })}
          variant="danger"
        >
          {t(tr.runPage.abandon, lang)}
        </StyledButton>
      </>
    ) : (
      <>
        <Box
          sx={{
            display: "inline-block",
            background: run.status === "completed" ? "#d1fae5" : "#fee2e2",
            color: run.status === "completed" ? "#065f46" : "#7f1d1d",
            padding: "12px 16px",
            borderRadius: "2rem",
            border: "3px solid #000",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          {run.status === "completed"
            ? t(tr.runPage.completed, lang)
            : t(tr.runPage.abandoned, lang)}
        </Box>
        <StyledButton
          onClick={() => updateRun({ ...run, status: "in-progress" })}
          variant="secondary"
        >
          {t(tr.runPage.resume, lang)}
        </StyledButton>
      </>
    );

  const backAction = (
    <StyledButton
      onClick={() => router.push("/")}
      variant="secondary"
      sx={{ px: 3 }}
    >
      {t(tr.runPage.home, lang)}
    </StyledButton>
  );

  const headerSubtitle = [
    run.region,
    run.difficulty,
    run.isShinyHuntMode && "✨ Shiny",
    run.isRandomMode && "🎲 Random",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(to bottom right, #FFFEF0, #FEF3C7, #E0D5FF)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        showBack
        title={run.gameName}
        subtitle={headerSubtitle}
        backAction={backAction}
        actions={statusActions}
      />

      <StatsBar run={run} />

      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          gap: 2,
          p: 2,
        }}
      >
        {/* Left: Tabs */}
        <Box
          sx={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            border: "3px solid #000",
            borderRadius: "1rem",
            overflow: "hidden",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            zIndex: 10,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              borderBottom: "3px solid #000",
              background: "linear-gradient(to right, #DBEAFE, #E9D5FF)",
            }}
          >
            {(["zones", "team"] as Tab[]).map((tabKey) => (
              <Box
                component="button"
                key={tabKey}
                onClick={() => setTab(tabKey)}
                sx={{
                  flex: 1,
                  py: 1.5,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                  borderBottom: "4px solid",
                  borderBottomColor: tab === tabKey ? "#000" : "transparent",
                  backgroundColor: tab === tabKey ? "#7dd3fc" : "transparent",
                  color: tab === tabKey ? "#000" : "#64748b",
                  "&:hover": {
                    color: "#000",
                    backgroundColor: tab === tabKey ? "#7dd3fc" : "#f0f4f8",
                  },
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {tabKey === "zones"
                  ? t(tr.runPage.tabZones, lang)
                  : t(tr.runPage.tabTeam, lang)}
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {tab === "zones" && <ZoneList run={run} />}
            {tab === "team" && (
              <Box sx={{ p: 2 }}>
                <TeamView
                  run={run}
                  onToggleAnalysis={() => setShowTypesDrawer(!showTypesDrawer)}
                />
              </Box>
            )}
          </Box>

          {/* Hidden export view for PNG - sprite + types in columns */}
          <Box
            id="team-export-target"
            sx={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              width: "1920px",
              height: "1080px",
              background: "transparent",
              display: "flex",
              justifyContent: "space-between",
              flexDirection: "row",
              padding: "0",
            }}
          >
            <TeamColumn
              team={run.team}
              pokemonData={pokemonData}
              preferAnimated={false}
            />
            <TeamColumn
              team={run.team}
              pokemonData={pokemonData}
              mirror
              preferAnimated={false}
            />
          </Box>
        </Box>

        {/* Right: Map or Analysis with simultaneous transitions */}
        <Box
          sx={{
            position: "relative",
            width: "50%",
            overflow: "hidden",
          }}
        >
          {/* Map Panel */}
          <Box
            sx={{
              transform: showTypesDrawer ? "translateX(100%)" : "translateX(0)",
              opacity: showTypesDrawer ? 0 : 1,
              transition: "all 500ms ease-out",
            }}
          >
            <MapView run={run} />
          </Box>

          {/* Analysis Panel */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              background: "#FEF3E2",
              border: "3px solid #000",
              borderRadius: "1rem",
              overflow: "hidden",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              transform: showTypesDrawer
                ? "translateX(0)"
                : "translateX(-100%)",
              opacity: showTypesDrawer ? 1 : 0,
              transition: "all 500ms ease-out",
            }}
          >
            {/* Drawer Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: "2px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}
              >
                {t(tr.runPage.analysis, lang)}
              </Typography>
              <Box
                component="button"
                onClick={() => setShowTypesDrawer(false)}
                sx={{
                  color: "#000",
                  fontSize: "1.5rem",
                  p: 0.5,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  "&:hover": {
                    opacity: 0.7,
                  },
                }}
                title={t(tr.runPage.close, lang)}
              >
                ✕
              </Box>
            </Box>

            {/* Analysis Content */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2,
              }}
            >
              <TypeAnalysis run={run} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
