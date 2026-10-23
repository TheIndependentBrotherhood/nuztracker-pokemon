"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function RegionalPokedexesPage() {
  return (
    <SyncPanel
      step="regional-pokedexes"
      title="📘 Pokédex régionaux"
      outputFile="regional-pokedexes.json"
      description="Synchronise les Pokédex régionaux depuis PokeAPI. Les remakes et versions alternatives (Platine, HGSS, ROSA, USUL, DLC…) sont fusionnés avec le Pokédex original de chaque région."
    />
  );
}
