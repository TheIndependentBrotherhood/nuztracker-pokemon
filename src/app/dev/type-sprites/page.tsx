"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function TypeSpritesPage() {
  return (
    <SyncPanel
      step="type-sprites"
      title="🎨 Type Sprites"
      outputFile="type-sprites.json"
      description="Synchronise les sprites des types depuis PokeAPI."
    />
  );
}
