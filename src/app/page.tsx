'use client';

import { useEffect, useState } from 'react';
import { useRunStore } from '@/store/runStore';
import RunList from '@/components/RunList';
import CreateRunModal from '@/components/CreateRunModal';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeatureCard from '@/components/FeatureCard';

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Cartes Interactives',
    description: 'Visualisez vos zones sur des cartes interactives pour chaque région Pokémon.',
  },
  {
    icon: '⚔️',
    title: 'Gestion d\'Équipe',
    description: 'Gérez votre équipe de 6 Pokémon avec sprites, types et statistiques.',
  },
  {
    icon: '📊',
    title: 'Analyse de Types',
    description: 'Analysez les forces et faiblesses de votre équipe en temps réel.',
  },
  {
    icon: '✨',
    title: 'Mode Shiny Hunt',
    description: 'Activez le mode Shiny Hunt pour vos runs à la recherche des raretés.',
  },
];

export default function HomePage() {
  const { runs, loadRuns } = useRunStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pb-16">
        <HeroSection
          runsCount={runs.length}
          activeCount={runs.filter((r) => r.status === 'in-progress').length}
          capturesCount={runs.reduce((acc, r) => acc + r.team.length, 0)}
          onNewRun={() => setShowCreate(true)}
        />

        {/* Features */}
        <section className="mb-12 animate-fade-slide-in" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4 text-center">
            Fonctionnalités
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Recent runs */}
        {runs.length > 0 && (
          <section className="animate-fade-slide-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Vos Runs
            </h2>
            <RunList runs={runs} />
          </section>
        )}
      </main>

      {showCreate && <CreateRunModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

