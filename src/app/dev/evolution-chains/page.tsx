"use client";

import SyncPanel from "@/components/dev/SyncPanel";

export default function EvolutionChainsPage() {
  return (
    <SyncPanel
      step="evolution-chains"
      title="🔄 Evolution Chains"
      outputFile="evolution-chains.json"
      description="Synchronise les chaînes d'évolution (base, stage2, stage3) depuis PokeAPI. Chaque chaîne contient les trois stades d'évolution quand disponibles."
    />
  );
}
