"use client";

import { Box, Button, Tooltip, Typography } from "@mui/material";
import { POKEMON_STAT_NAMES, type PokemonStatName, type Run } from "@/lib/types";
import { getPlayerId } from "@/lib/tracker/knowledge";
import { useRunStore } from "@/store/runStore";
import { getGameVersion } from "@/lib/game-catalog";

const labels: Record<PokemonStatName, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  "special-attack": "SpA", "special-defense": "SpD", speed: "Spe",
};

export default function StatAnnotations({
  run,
  pokemonId,
  playerId = getPlayerId(run),
}: {
  run: Run;
  pokemonId: number;
  playerId?: string;
}) {
  const { updateRun, canEditRun } = useRunStore();
  const annotations = run.statAnnotationsByPokemonId?.[pokemonId] ?? {};
  const singleSpecial = getGameVersion(run.gameVersion)?.generation === 1;

  function cycle(stat: PokemonStatName) {
    const next = { ...annotations };
    if (!next[stat]) next[stat] = "high";
    else if (next[stat] === "high") next[stat] = "low";
    else delete next[stat];
    void updateRun({
      ...run,
      statAnnotationsByPokemonId: {
        ...run.statAnnotationsByPokemonId,
        [pokemonId]: next,
      },
    }, run, playerId);
  }

  return (
    <Box>
      <Typography variant="caption" component="p" sx={{ mb: 1 }}>
        Random distribution, unchanged BST. These are your estimates, not measured base stats.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.75 }}>
        {POKEMON_STAT_NAMES.filter((stat) => !singleSpecial || stat !== "special-defense").map((stat) => (
          <Tooltip key={stat} title={`${stat}: ${annotations[stat] ?? "unmarked"}. Cycle + / - / blank.`}>
            <span>
              <Button
                fullWidth
                size="small"
                disabled={!canEditRun(run.id, playerId)}
                aria-label={`${stat} estimate: ${annotations[stat] ?? "unmarked"}`}
                onClick={() => cycle(stat)}
                sx={{ borderRadius: 1, borderWidth: 1, boxShadow: "none", fontVariantNumeric: "tabular-nums" }}
              >
                {singleSpecial && stat === "special-attack" ? "Spc" : labels[stat]} {annotations[stat] === "high" ? "+" : annotations[stat] === "low" ? "-" : "?"}
              </Button>
            </span>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
