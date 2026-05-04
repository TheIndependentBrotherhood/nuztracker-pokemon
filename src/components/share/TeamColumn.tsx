"use client";

import { Box } from "@mui/material";
import { Capture, PokemonApiData, Run } from "@/lib/types";
import {
  getCaptureSpriteFallbackUrl,
  getCaptureSpriteUrl,
} from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";
import { getCaptureTypesForRun, isRandomTypesMode } from "@/lib/capture-types";

interface Props {
  team: Capture[];
  pokemonData: Record<number, PokemonApiData>;
  run?: Run;
  showTypes?: boolean;
  tightTypes?: boolean;
  mirror?: boolean;
  fullHeight?: boolean;
  preferAnimated?: boolean;
}

export default function TeamColumn({
  team,
  pokemonData,
  run,
  showTypes = true,
  tightTypes = false,
  mirror = false,
  fullHeight = false,
  preferAnimated = true,
}: Props) {
  const randomTypesMode = isRandomTypesMode(run);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "fit-content",
        height: fullHeight ? "100%" : "auto",
        gap: 0,
        p: 0,
      }}
    >
      {team.map((capture) => {
        const data = pokemonData[capture.pokemonId];
        const fallbackTypes = data?.types?.map((t) => t.type.name) ?? [];
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
              flexDirection: mirror ? "row-reverse" : "row",
              height: fullHeight ? "calc(100% / 6)" : "180px",
              width: "auto",
              minHeight: "120px",
              minWidth: "200px",
              mr: mirror ? 0 : 0.5,
              ml: mirror ? 0.5 : 0,
              p: 1,
              py: 2,
            }}
          >
            {/* Sprite */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "120px",
                height: "120px",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCaptureSpriteUrl(capture, preferAnimated)}
                alt={capture.pokemonName}
                onError={(event) => {
                  const fallbackUrl = getCaptureSpriteFallbackUrl(capture);
                  if (event.currentTarget.src !== fallbackUrl) {
                    event.currentTarget.src = fallbackUrl;
                  }
                }}
                style={{
                  width: "96px",
                  height: "96px",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
              />
            </Box>

            {/* Types - stacked vertically */}
            {showTypes && (
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
