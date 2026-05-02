"use client";

import { Box } from "@mui/material";
import { Capture, PokemonApiData } from "@/lib/types";
import { getSpriteFallbackUrl, getSpriteUrl } from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";

interface Props {
  team: Capture[];
  pokemonData: Record<number, PokemonApiData>;
  mirror?: boolean;
  fullHeight?: boolean;
  preferAnimated?: boolean;
}

export default function TeamColumn({
  team,
  pokemonData,
  mirror = false,
  fullHeight = false,
  preferAnimated = true,
}: Props) {
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
        const types = data?.types?.map((t) => t.type.name) ?? [];

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
                src={getSpriteUrl(
                  capture.pokemonId,
                  capture.isShiny,
                  preferAnimated,
                )}
                alt={capture.pokemonName}
                onError={(event) => {
                  const fallbackUrl = getSpriteFallbackUrl(
                    capture.pokemonId,
                    capture.isShiny,
                  );
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
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {types.map((typeName) => (
                <Box
                  key={typeName}
                  sx={{
                    background: typeColors[typeName] ?? "#888",
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
          </Box>
        );
      })}
    </Box>
  );
}
