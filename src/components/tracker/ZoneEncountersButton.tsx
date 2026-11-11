"use client";

import { useEffect, useState } from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { getPokemonById } from "@/lib/pokemon-data";
import type { PokemonData } from "@/lib/types";
import type {
  OverlayZoneEncounter,
  OverlayZoneEncounters,
} from "@/lib/tracker/overlay";
import type { EncounterCondition, EncounterMethod } from "@/lib/tracker/types";
import TrackerDialog from "./TrackerDialog";
import PixelIcon, {
  GRASS_ICON,
  HOOK_ICON,
  MOON_ICON,
  POKE_BALL_ICON,
  POKE_BALL_PALETTE,
  SUN_ICON,
  SUNRISE_ICON,
  SURF_ICON,
} from "./PixelIcon";

const CONDITION_ORDER: EncounterCondition[] = ["morning", "day", "night"];
const CONDITION_STYLES: Record<
  EncounterCondition,
  { rows: string[]; color: string }
> = {
  morning: { rows: SUNRISE_ICON, color: "#fb923c" },
  day: { rows: SUN_ICON, color: "#facc15" },
  night: { rows: MOON_ICON, color: "#a5b4fc" },
};

const conditionRank = (condition?: EncounterCondition) =>
  condition ? CONDITION_ORDER.indexOf(condition) + 1 : 0;

const METHODS: EncounterMethod[] = [
  "grass",
  "surf",
  "old-rod",
  "good-rod",
  "super-rod",
];
const METHOD_ICONS: Record<EncounterMethod, { rows: string[]; color: string }> =
  {
    grass: { rows: GRASS_ICON, color: "#4ade80" },
    surf: { rows: SURF_ICON, color: "#60a5fa" },
    "old-rod": { rows: HOOK_ICON, color: "#c08a52" },
    "good-rod": { rows: HOOK_ICON, color: "#38bdf8" },
    "super-rod": { rows: HOOK_ICON, color: "#f87171" },
  };

export function EncounterMethodIcon({
  method,
  size = 11,
}: {
  method: EncounterMethod;
  size?: number;
}) {
  const { lang } = useLanguage();
  return (
    <PixelIcon
      {...METHOD_ICONS[method]}
      size={size}
      label={t(translations.liveView.encounterMethods[method], lang)}
    />
  );
}

/** Ironmon-style "X/N" counter of the current map's wild table, with the table in a dialog. */
export default function ZoneEncountersButton({
  zone,
}: {
  zone: OverlayZoneEncounters;
}) {
  const { lang } = useLanguage();
  const text = translations.liveView;
  const [open, setOpen] = useState(false);
  const [references, setReferences] = useState<Record<number, PokemonData>>({});
  const knownIds = [
    ...new Set(
      zone.entries.flatMap((entry) =>
        entry.pokemonId === undefined ? [] : [entry.pokemonId],
      ),
    ),
  ];
  const knownSignature = knownIds.join(",");
  useEffect(() => {
    if (!open || !knownSignature) return;
    let cancelled = false;
    void Promise.all(
      knownSignature.split(",").map(async (id) => {
        try {
          return await getPokemonById(Number(id));
        } catch {
          return undefined;
        }
      }),
    ).then((pokemon) => {
      if (cancelled) return;
      setReferences(
        Object.fromEntries(
          pokemon.flatMap((entry) => (entry ? [[entry.id, entry]] : [])),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, knownSignature]);
  const label = text.zoneEncounters[lang](zone.seen, zone.total);
  return (
    <>
      <ButtonBase
        data-testid="zone-encounters"
        title={label}
        aria-label={label}
        onClick={() => setOpen(true)}
        sx={{
          ml: 0.5,
          px: 0.25,
          gap: 0.25,
          borderRadius: 0.5,
          verticalAlign: "middle",
          fontSize: "inherit",
          fontWeight: 800,
          color: zone.seen === zone.total ? "#4ade80" : "#e2e8f0",
          "&:hover, &.Mui-focusVisible": { bgcolor: "#ffffff1a" },
        }}
      >
        <PixelIcon
          rows={POKE_BALL_ICON}
          color={POKE_BALL_PALETTE.r}
          palette={POKE_BALL_PALETTE}
          size={9}
        />
        {zone.seen}/{zone.total}
      </ButtonBase>
      <TrackerDialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        help={t(text.zoneEncountersHelp, lang)}
      >
        <Stack spacing={1} sx={{ pb: 1 }}>
          {METHODS.map((method) => {
            const entries = zone.entries
              .filter((entry) => entry.method === method)
              .sort(
                (left, right) =>
                  conditionRank(left.condition) -
                    conditionRank(right.condition) || right.rate - left.rate,
              );
            if (!entries.length) return null;
            return (
              <Box key={method}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center", mb: 0.5 }}
                >
                  <EncounterMethodIcon method={method} />
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700 }}>
                    {t(text.encounterMethods[method], lang)}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
                    gap: 0.5,
                  }}
                >
                  {entries.map((entry, index) => (
                    <EncounterCell
                      key={`${entry.condition ?? ""}-${entry.pokemonId ?? `unknown-${index}`}`}
                      entry={entry}
                      pokemon={
                        entry.pokemonId === undefined
                          ? undefined
                          : references[entry.pokemonId]
                      }
                    />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </TrackerDialog>
    </>
  );
}

function EncounterCell({
  entry,
  pokemon,
}: {
  entry: OverlayZoneEncounter;
  pokemon?: PokemonData;
}) {
  const { lang } = useLanguage();
  const text = translations.liveView;
  const known = entry.pokemonId !== undefined;
  const name = known
    ? (pokemon?.names?.[lang] ??
      pokemon?.technicalName ??
      `#${entry.pokemonId}`)
    : t(text.unknownPokemon, lang);
  const levels =
    entry.minLevel === entry.maxLevel
      ? `${entry.minLevel}`
      : `${entry.minLevel}-${entry.maxLevel}`;
  const time = entry.condition ? CONDITION_STYLES[entry.condition] : undefined;
  const timeLabel = entry.condition
    ? t(text.encounterConditions[entry.condition], lang)
    : undefined;
  return (
    <Box
      title={timeLabel ? `${name} · ${timeLabel}` : name}
      data-condition={entry.condition}
      sx={{
        position: "relative",
        p: 0.25,
        border: "1px solid",
        borderColor: time
          ? `${time.color}${known ? "b3" : "66"}`
          : known
            ? "#7890a5"
            : "#334155",
        borderRadius: 0.5,
        textAlign: "center",
        bgcolor: time
          ? `${time.color}${known ? "1f" : "0d"}`
          : known
            ? "#ffffff0d"
            : "transparent",
      }}
    >
      {known && pokemon ? (
        <Box
          component="img"
          src={pokemon.sprites.normal.default}
          alt={name}
          sx={{
            width: 40,
            height: 40,
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <Box
          role="img"
          aria-label={name}
          sx={{
            width: 40,
            height: 40,
            mx: "auto",
            display: "grid",
            placeItems: "center",
            fontSize: "1.2rem",
            fontWeight: 800,
            color: known ? "#e2e8f0" : "#64748b",
          }}
        >
          {known ? "…" : "?"}
        </Box>
      )}
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, lineHeight: 1.1 }}>
        {entry.rate}%
      </Typography>
      <Typography
        sx={{ fontSize: "0.6rem", color: "#b8c7d5", lineHeight: 1.1 }}
      >
        {t(translations.focusCard.level, lang)}
        {levels}
      </Typography>
      {time && timeLabel && (
        <Stack
          direction="row"
          spacing={0.25}
          sx={{ mt: 0.25, alignItems: "center", justifyContent: "center" }}
        >
          <PixelIcon {...time} size={8} />
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 700,
              lineHeight: 1.1,
              color: time.color,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {timeLabel}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
