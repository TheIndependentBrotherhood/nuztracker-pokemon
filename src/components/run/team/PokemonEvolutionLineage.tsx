"use client";

import { Box, Tooltip } from "@mui/material";
import { Capture, EvolutionHistoryEntry } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { getPokemonById } from "@/lib/pokemon-data";
import { getEvolutionStepCount } from "@/lib/evolution-display-utils";

interface Props {
  capture: Capture;
  evolutionHistory?: EvolutionHistoryEntry[];
  onClick?: () => void;
}

interface PokemonDisplay {
  spriteUrl: string;
  technicalName: string;
  frenchName: string;
  englishName: string;
}

/**
 * Display evolution lineage with small sprites and translated names in tooltips.
 * Shows 3 pokémon: previous → current → next
 * Click opens detailed evolution history dialog.
 */
export function PokemonEvolutionLineage({
  capture,
  evolutionHistory,
  onClick,
}: Props) {
  const { lang } = useLanguage();
  const [pokemonList, setPokemonList] = useState<PokemonDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  if (!evolutionHistory || evolutionHistory.length === 0) {
    return null;
  }

  const stepCount = getEvolutionStepCount(evolutionHistory);
  const isClickable = Boolean(onClick && stepCount > 0);

  // Load pokemon data (sprites and names) for display
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data: PokemonDisplay[] = [];
        for (const entry of evolutionHistory) {
          const pokemon = await getPokemonById(entry.pokemonId);
          data.push({
            spriteUrl: pokemon.sprites?.normal?.default || "",
            technicalName: entry.technicalName,
            frenchName: pokemon.names?.fr || entry.technicalName,
            englishName: pokemon.names?.en || entry.technicalName,
          });
        }
        setPokemonList(data);
      } catch (error) {
        console.error("Failed to load pokemon data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [evolutionHistory]);

  if (loading || pokemonList.length === 0) {
    return null;
  }

  // Show 3 sprites: n-1, n, n+1
  // If we have only 2 entries, show both
  // If we have 3+, show last 3
  const displayIndices =
    pokemonList.length === 2
      ? [0, 1]
      : [
          Math.max(0, pokemonList.length - 3),
          Math.max(0, pokemonList.length - 2),
          pokemonList.length - 1,
        ];

  return (
    <Box
      component="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 0.75,
        py: 0.5,
        background: "none",
        border: "none",
        cursor: isClickable ? "pointer" : "default",
        transition: "all 150ms",
        "&:hover": isClickable
          ? {
              opacity: 0.8,
              transform: "scale(1.05)",
            }
          : {},
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#666",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Evo
      </span>

      {/* Sprites */}
      <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
        {displayIndices.map((idx) => {
          const data = pokemonList[idx];
          const label =
            lang === "fr"
              ? `${data.frenchName} (${data.englishName})`
              : `${data.englishName} (${data.frenchName})`;

          return (
            <Tooltip key={idx} title={label} placement="top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.spriteUrl}
                alt={data.technicalName}
                style={{
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  opacity:
                    idx === displayIndices[displayIndices.length - 1] ? 1 : 0.6,
                  filter: isClickable
                    ? "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                    : "none",
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* Evolution count indicator */}
      {stepCount > 0 && (
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: "#0284c7",
            marginLeft: "2px",
          }}
        >
          +{stepCount}
        </span>
      )}
    </Box>
  );
}

/**
 * Compact version showing just the evolution count badge.
 */
export function PokemonEvolutionBadge({
  evolutionHistory,
}: {
  evolutionHistory?: EvolutionHistoryEntry[];
}) {
  const stepCount = getEvolutionStepCount(evolutionHistory || []);

  if (stepCount === 0) {
    return null;
  }

  return (
    <Tooltip title="Evolution steps">
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "20px",
          height: "20px",
          borderRadius: "999px",
          backgroundColor: "#0284c7",
          color: "#fff",
          fontSize: "0.65rem",
          fontWeight: 700,
        }}
      >
        {stepCount}
      </Box>
    </Tooltip>
  );
}
