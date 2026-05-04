"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function TypeChartsPage() {
  return (
    <SyncPanel
      step="type-charts"
      title="📊 Type Charts"
      outputFile="type-charts.json"
      description="Synchronise les tables d'efficacité des types depuis PokeAPI (weakTo, resistsAgainst, immuneTo, strongAgainst)."
    />
  );
}
