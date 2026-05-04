"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function RegionsPage() {
  return (
    <SyncPanel
      step="regions"
      title="🗺️ Régions"
      outputFile="regions.json"
      description="Synchronise les régions, locations et location-areas depuis PokeAPI. Chaque location est décomposée en ses areas (ex: kanto-route-1-area) avec noms fr/en."
    />
  );
}
