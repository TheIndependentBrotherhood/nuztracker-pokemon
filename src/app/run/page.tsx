'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRunStore } from '@/store/runStore';
import { getRun } from '@/lib/storage';
import StatsBar from '@/components/StatsBar';
import MapView from '@/components/MapView';
import ZoneList from '@/components/ZoneList';
import TeamView from '@/components/TeamView';
import TypeAnalysis from '@/components/TypeAnalysis';
import ExportPanel from '@/components/ExportPanel';
import Header from '@/components/Header';

type Tab = 'zones' | 'team' | 'types';

function RunPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { runs, loadRuns, setCurrentRun, updateRun } = useRunStore();
  const [tab, setTab] = useState<Tab>('zones');
  const [mounted, setMounted] = useState(false);

  const id = searchParams.get('id') ?? '';

  useEffect(() => {
    setMounted(true);
    loadRuns();
  }, [loadRuns]);

  const run = runs.find((r) => r.id === id) ?? (mounted ? getRun(id) : null);

  useEffect(() => {
    if (run) setCurrentRun(run);
  }, [run, setCurrentRun]);

  if (!mounted) return null;

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😿</div>
          <p className="text-slate-400 text-lg">Run introuvable</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  const statusActions =
    run.status === 'in-progress' ? (
      <>
        <button
          onClick={() => updateRun({ ...run, status: 'completed' })}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          ✓ Terminer
        </button>
        <button
          onClick={() => updateRun({ ...run, status: 'abandoned' })}
          className="text-xs bg-red-800/80 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          ✗ Abandonner
        </button>
      </>
    ) : (
      <>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            run.status === 'completed'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}
        >
          {run.status === 'completed' ? '✓ Terminé' : '✗ Abandonné'}
        </span>
        <button
          onClick={() => updateRun({ ...run, status: 'in-progress' })}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          ↩ Reprendre
        </button>
      </>
    );

  const headerSubtitle = [
    run.region,
    run.difficulty,
    run.isShinyHuntMode && '✨ Shiny',
    run.isRandomMode && '🎲 Random',
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header
        showBack
        title={run.gameName}
        subtitle={headerSubtitle}
        actions={statusActions}
      />

      <StatsBar run={run} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Map */}
        <div className="w-3/5 p-4 overflow-y-auto border-r border-slate-700/50">
          <MapView run={run} />
          <ExportPanel run={run} teamViewId="team-export-target" />
        </div>

        {/* Right: Tabs */}
        <div className="w-2/5 flex flex-col overflow-hidden bg-slate-900/40">
          <div className="flex border-b border-slate-700/50">
            {(['zones', 'team', 'types'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-all ${
                  tab === t
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'zones' ? '🗺 Zones' : t === 'team' ? '⚔️ Équipe' : '🔬 Types'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'zones' && <ZoneList run={run} />}
            {tab === 'team' && (
              <div className="p-3">
                <TeamView run={run} id="team-export-target" />
              </div>
            )}
            {tab === 'types' && (
              <div className="p-3">
                <TypeAnalysis run={run} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RunPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Chargement...
        </div>
      }
    >
      <RunPageContent />
    </Suspense>
  );
}
