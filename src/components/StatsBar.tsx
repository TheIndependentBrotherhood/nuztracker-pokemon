"use client";

import { Stack, Typography, Box } from "@mui/material";
import { Run } from "@/lib/types";
import StatCard from "./StatCard";
import { getSpriteUrl } from "@/lib/pokemon-api";

interface Props {
  run: Run;
}

export default function StatsBar({ run }: Props) {
  const total = run.zones.length;
  const visited = run.zones.filter((z) => z.status !== "not-visited").length;
  const captured = run.zones.filter((z) => z.status === "captured").length;
  const missed = visited - captured;
  const captureRate = visited > 0 ? Math.round((captured / visited) * 100) : 0;
  const shinyCount = run.zones.reduce(
    (acc, z) => acc + z.captures.filter((c) => c.isShiny).length,
    0,
  );
  const progress = total > 0 ? (visited / total) * 100 : 0;

  // Zones hover content (shiny mode)
  const zonesHoverContent = run.isShinyHuntMode && (
    <>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: "2rem", sm: "3rem" },
          color: "#000",
          mb: 1,
        }}
      >
        {shinyCount}
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
        Shinies
      </Typography>
    </>
  );

  // Capturées hover content (taux et loupés)
  const captureesHoverContent = (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
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
      sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}
    >
      {run.team.map((pokemon) => (
        <Box
          key={pokemon.id}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSpriteUrl(pokemon.pokemonId, pokemon.isShiny)}
            alt={pokemon.pokemonName}
            style={{
              width: "40px",
              height: "40px",
              imageRendering: "pixelated",
            }}
          />
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#000",
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {pokemon.nickname || pokemon.pokemonName}
          </Typography>
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
          value={`${visited}/${total}`}
          label="Zones"
          color="#E3F2FD"
          hoverContent={zonesHoverContent}
        />
        <StatCard
          value={captured}
          label="Capturées"
          color="#E8F5E9"
          hoverContent={captureesHoverContent}
        />
        <StatCard
          value={`${run.team.length}/6`}
          label="Équipe"
          color="#FFE8E8"
          hoverContent={equipeHoverContent}
        />
      </Stack>

      {/* Global progress bar */}
      <div className="h-3 bg-white border-2 border-black rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-blue-500 to-purple-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </Box>
  );
}
