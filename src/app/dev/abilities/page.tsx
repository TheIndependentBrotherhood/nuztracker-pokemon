"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function AbilitiesPage() {
  return (
    <SyncPanel
      step="abilities"
      title="⚡ Abilities"
      outputFile="abilities.json"
      description="Synchronise les capacités et immunités depuis PokeAPI."
    />
  );
}
