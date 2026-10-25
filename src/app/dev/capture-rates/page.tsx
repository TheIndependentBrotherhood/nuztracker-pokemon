"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function CaptureRatesPage() {
  return (
    <SyncPanel
      step="capture-rates"
      title="🎯 Taux de capture"
      outputFile="pokemon-list.json"
      description="Enrichit pokemon-list.json avec le taux de capture (capture_rate) de chaque espèce depuis PokeAPI, sans retélécharger les autres données."
    />
  );
}
