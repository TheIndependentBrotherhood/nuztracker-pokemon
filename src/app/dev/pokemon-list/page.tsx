"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function PokemonListPage() {
  return (
    <SyncPanel
      step="pokemon-list"
      title="📦 Pokémon List"
      outputFile="pokemon-list.json"
      description="Synchronise la liste complète des Pokémon depuis PokeAPI. Génère le format sprites.{normal,shiny}.{default, alternatives}. Les alternatives existantes sont préservées."
    />
  );
}
