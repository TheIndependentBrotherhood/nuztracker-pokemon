"use client";

import { Run } from "@/lib/types";
import { Box, Grid, Typography } from "@mui/material";
import PokemonCard from "./PokemonCard";

interface Props {
  run: Run;
  id?: string;
}

export default function TeamView({ run, id }: Props) {
  const teamSlots = Array.from({ length: 6 }, (_, i) => run.team[i] ?? null);

  return (
    <Box
      id={id}
      sx={{
        background: "linear-gradient(to bottom, #EFF6FF, #F3E8FF)",
        border: "2px solid #000",
        borderRadius: "1rem",
        p: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          pb: 1.5,
          borderBottom: "2px solid #000",
        }}
      >
        <Typography
          sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#000" }}
        >
          Équipe
        </Typography>
        <Box
          sx={{
            fontSize: "0.875rem",
            fontWeight: 700,
            background: "#3b82f6",
            color: "#fff",
            px: 1.5,
            py: 0.5,
            borderRadius: "0.5rem",
            border: "2px solid #000",
          }}
        >
          {run.team.length}/6
        </Box>
      </Box>
      <Grid container spacing={1.5}>
        {teamSlots.map((capture, i) => (
          <Grid item xs={6} sm={4} key={i}>
            <PokemonCard capture={capture} slotIndex={i} runId={run.id} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
