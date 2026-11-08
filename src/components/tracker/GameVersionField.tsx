"use client";

import { MenuItem, TextField } from "@mui/material";
import {
  GAME_VERSIONS,
  getGameName,
  getGameVersion,
  type GameVersionId,
} from "@/lib/game-catalog";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.gameVersion;

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
  const { lang } = useLanguage();
  const game = getGameVersion(value);
  return (
    <TextField
      select
      fullWidth
      label={t(tr.label, lang)}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => {
        const selected = getGameVersion(event.target.value);
        if (selected) onChange(selected.id);
      }}
      helperText={
        game
          ? t(tr.reference, lang)(game.console, game.generation)
          : t(tr.hint, lang)
      }
    >
      <MenuItem value="" disabled>
        {t(tr.unspecified, lang)}
      </MenuItem>
      {GAME_VERSIONS.filter(
        (entry) => region === "custom" || entry.region === region,
      ).map((entry) => (
        <MenuItem key={entry.id} value={entry.id}>
          {getGameName(entry, lang)} ({entry.console})
        </MenuItem>
      ))}
    </TextField>
  );
}
