"use client";

import type { Capture, PokemonData, Run } from "@/lib/types";
import { getCaptureTypesForRun } from "@/lib/capture-types";
import SpriteTeam from "./SpriteTeam";

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

export default function TeamColumn({ team, pokemonData, run, ...options }: Props) {
  return <SpriteTeam {...options} members={team.map((capture) => {
    const fallbackSpriteUrl = capture.isShiny
      ? capture.pokemon.sprites.shiny.default : capture.pokemon.sprites.normal.default;
    return {
      id: capture.id,
      name: capture.nickname ?? capture.pokemon.technicalName,
      spriteUrl: capture.selectedSprite?.url || fallbackSpriteUrl,
      fallbackSpriteUrl,
      types: getCaptureTypesForRun(capture, run, pokemonData[capture.pokemon.id]?.types ?? capture.pokemon.types),
    };
  })} />;
}
