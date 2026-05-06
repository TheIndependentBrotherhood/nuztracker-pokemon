"use client";

import { Box } from "@mui/material";
import { Capture, PokemonData, Run } from "@/lib/types";
import { typeColors } from "@/lib/type-chart";
import { getCaptureTypesForRun, isRandomTypesMode } from "@/lib/capture-types";

interface Props {
  team: Capture[];
  pokemonData: Record<number, PokemonData>;
  run?: Run;
  showTypes?: boolean;
  tightTypes?: boolean;
  mirror?: boolean;
  fullHeight?: boolean;
  isRipMode?: boolean;
}

export default function TeamColumn({
  team,
  pokemonData,
  run,
  showTypes = true,
  tightTypes = false,
  mirror = false,
  fullHeight = false,
  isRipMode = false,
}: Props) {
  const randomTypesMode = isRandomTypesMode(run);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isRipMode ? "row" : "column",
        width: isRipMode ? "fit-content" : "fit-content",
        height: fullHeight ? "100%" : isRipMode ? "200px" : "auto",
        gap: isRipMode ? 2 : 0,
        p: 0,
        alignItems: isRipMode ? "center" : "flex-start",
        justifyContent: isRipMode ? "center" : "flex-start",
      }}
    >
      {team.map((capture) => {
        const data = pokemonData[capture.pokemon.id];
        const fallbackTypes = data?.types ?? [];
        const resolvedTypes = getCaptureTypesForRun(
          capture,
          run,
          fallbackTypes,
        );
        const types =
          randomTypesMode && resolvedTypes.length === 0
            ? ["???"]
            : resolvedTypes;

        return (
          <Box
            key={capture.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: isRipMode
                ? "column"
                : mirror
                  ? "row-reverse"
                  : "row",
              height: isRipMode
                ? "auto"
                : fullHeight
                  ? "calc(100% / 6)"
                  : "180px",
              width: isRipMode ? "auto" : "auto",
              minHeight: isRipMode ? "auto" : "120px",
              minWidth: isRipMode ? "auto" : "200px",
              mr: !isRipMode && mirror ? 0 : !isRipMode ? 0.5 : 0,
              ml: !isRipMode && mirror ? 0.5 : 0,
              p: isRipMode ? 0 : 1,
              py: isRipMode ? 0 : 2,
            }}
          >
            {/* Sprite */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: isRipMode ? "80px" : "120px",
                height: isRipMode ? "80px" : "120px",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  capture.selectedSprite?.url ||
                  (capture.isShiny
                    ? capture.pokemon.sprites.shiny.default
                    : capture.pokemon.sprites.normal.default)
                }
                data-export-fallback-src={
                  capture.isShiny
                    ? capture.pokemon.sprites.shiny.default
                    : capture.pokemon.sprites.normal.default
                }
                alt={capture.pokemon.technicalName}
                onError={(event) => {
                  const fallbackUrl = capture.isShiny
                    ? capture.pokemon.sprites.shiny.default
                    : capture.pokemon.sprites.normal.default;
                  if (event.currentTarget.src !== fallbackUrl) {
                    event.currentTarget.src = fallbackUrl;
                  }
                }}
                style={{
                  width: isRipMode ? "64px" : "96px",
                  height: isRipMode ? "64px" : "96px",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
              />
            </Box>

            {/* Types - stacked vertically (hidden in RIP mode) */}
            {showTypes && !isRipMode && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  transform: tightTypes
                    ? `translateX(${mirror ? "25px" : "-25px"})`
                    : "none",
                }}
              >
                {types.map((typeName) => (
                  <Box
                    key={typeName}
                    sx={{
                      background:
                        typeColors[typeName] ??
                        (typeName === "???" ? "#64748b" : "#888"),
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      textTransform: "capitalize",
                      minWidth: "80px",
                      textAlign: "center",
                    }}
                  >
                    {typeName}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
