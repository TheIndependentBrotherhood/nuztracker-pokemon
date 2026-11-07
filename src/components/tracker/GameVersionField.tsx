"use client";

import { MenuItem, TextField } from "@mui/material";
import { GAME_VERSIONS, getGameVersion, type GameVersionId } from "@/lib/game-catalog";

export default function GameVersionField({
  value,
  region,
  disabled,
  onChange,
}: {
  value?: GameVersionId;
  region: string;
  disabled?: boolean;
  onChange: (value: GameVersionId) => void;
}) {
  const game = getGameVersion(value);
  return (
    <TextField
      select
      fullWidth
      label="Game version"
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => {
        const selected = getGameVersion(event.target.value);
        if (selected) onChange(selected.id);
      }}
      helperText={
        game
          ? `${game.console} / Generation ${game.generation} reference. Custom ROM changes may differ.`
          : "Select a game for accurate stats, types and abilities. Unspecified runs retain the generic reference."
      }
    >
      <MenuItem value="" disabled>Unspecified</MenuItem>
      {GAME_VERSIONS.filter((entry) => region === "custom" || entry.region === region).map((entry) => (
        <MenuItem key={entry.id} value={entry.id}>{entry.name} ({entry.console})</MenuItem>
      ))}
    </TextField>
  );
}
