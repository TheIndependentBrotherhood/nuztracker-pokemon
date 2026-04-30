"use client";

import { useState } from "react";
import { Stack, Typography, Box } from "@mui/material";
import { Run, Zone, Capture } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";
import { getSpriteUrl } from "@/lib/pokemon-api";
import { encodeTeam, buildShareUrl } from "@/lib/share";

interface Props {
  run: Run;
}

export default function StatsBar({ run }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const total = run.zones.length;
  const visited = run.zones.filter(
    (z: Zone) => z.status !== "not-visited",
  ).length;
  const captured = run.zones.filter(
    (z: Zone) => z.status === "captured",
  ).length;
  const missed = visited - captured;
  const captureRate = visited > 0 ? Math.round((captured / visited) * 100) : 0;
  const shinyCount = run.zones.reduce(
    (acc: number, z: Zone) =>
      acc + z.captures.filter((c: Capture) => c.isShiny).length,
    0,
  );
  const progress = total > 0 ? (visited / total) * 100 : 0;

  // Export handlers for team stats card
  async function handleExportPng() {
    setExporting(true);
    setExportError("");

    try {
      const element = document.getElementById("team-export-target");
      if (!element) {
        setExportError("Team view element not found");
        return;
      }

      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(element, {
        width: 1280,
        height: 720,
        scale: 2,
        backgroundColor: "#FFFEF0",
        logging: false,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `team-${new Date().getTime()}.png`;
      link.click();
    } catch (error) {
      console.error("PNG export error:", error);
      setExportError("Failed to export PNG. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateUrl() {
    try {
      const encoded = await encodeTeam(run.team);
      const shareUrl = buildShareUrl(encoded);
      const link = document.createElement("a");
      link.href = shareUrl;
      link.target = "_blank";
      link.click();
    } catch (error) {
      console.error("URL generation error:", error);
      setExportError("Failed to generate share URL");
    }
  }

  const teamActions = [
    {
      icon: "🖼",
      title: "Export team as PNG (1280x720)",
      onClick: handleExportPng,
      disabled: exporting || run.team.length === 0,
    },
    {
      icon: "🔗",
      title: "Generate shareable URL",
      onClick: handleGenerateUrl,
      disabled: run.team.length === 0,
    },
  ];

  // Zones with regular captures
  const zonesWithRegularCaptures = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => !c.isShiny),
  ).length;

  // Zones with shiny captures
  const zonesWithShinyCaptures = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => c.isShiny),
  ).length;

  // Display values (x2 total if shiny hunt mode)
  const displayVisited = visited;
  const displayTotal = run.isShinyHuntMode ? total * 2 : total;

  // Zones hover content (regular and shiny)
  const zonesHoverContent = (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 6 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {zonesWithRegularCaptures}/{total}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Zones Pokémons
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {zonesWithShinyCaptures}/{total}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Zones Shinies
        </Typography>
      </Box>
    </Box>
  );

  // Caught hover content (rate and missed)
  const captureesHoverContent = (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 6 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {captureRate}%
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Taux
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {missed}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Loupés
        </Typography>
      </Box>
    </Box>
  );

  // Équipe hover content (team sprites)
  const equipeHoverContent = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        columnGap: 12,
      }}
    >
      {run.team.map((pokemon: Capture) => (
        <Box
          key={pokemon.id}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            columnGap: 0.5,
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSpriteUrl(pokemon.pokemonId, pokemon.isShiny)}
            alt={pokemon.pokemonName}
            style={{
              width: "80px",
              height: "80px",
              imageRendering: "pixelated",
            }}
          />
          {/* Badge with nickname/name */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              padding: "4px 6px",
              borderRadius: "0 0 4px 4px",
              fontSize: "0.65rem",
              fontWeight: 700,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pokemon.nickname || pokemon.pokemonName}
          </Box>
        </Box>
      ))}
      {run.team.length < 6 &&
        Array.from({ length: 6 - run.team.length }).map((_, i) => (
          <Box
            key={`empty-${i}`}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
            }}
          >
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#000" }}
            >
              ?
            </Typography>
            <Typography
              sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#000" }}
            >
              -
            </Typography>
          </Box>
        ))}
    </Box>
  );

  return (
    <Box
      sx={{
        px: 4,
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={4}
        sx={{ mb: 3, pt: 2 }}
      >
        <StatCard
          value={`${displayVisited}/${displayTotal}`}
          label="Zones"
          color="#E3F2FD"
          hoverContent={zonesHoverContent}
        />
        <StatCard
          value={captured}
          label="Caught"
          color="#E8F5E9"
          hoverContent={captureesHoverContent}
        />
        <StatCard
          value={`${run.team.length}/6`}
          label="Team"
          color="#FFE8E8"
          hoverContent={equipeHoverContent}
          actions={teamActions}
        />
      </Stack>

      {/* Global progress bar */}
      <Box
        sx={{
          height: "12px",
          background: "#fff",
          border: "2px solid #000",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "999px",
            transition: "width 700ms ease",
            background: "linear-gradient(to right, #3b82f6, #a855f7)",
            width: `${progress}%`,
          }}
        />
      </Box>
    </Box>
  );
}
