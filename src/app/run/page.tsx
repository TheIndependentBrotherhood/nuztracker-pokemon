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

type Tab = 'zones' | 'team' | 'types';

function RunPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { runs, loadRuns, setCurrentRun } = useRunStore();
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😿</div>
          <p className="text-gray-400 text-lg">Run not found</p>
          <button onClick={() => router.push('/')} className="mt-4 text-blue-400 hover:text-blue-300">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors">
          ← Home
        </button>
        <div>
          <h1 className="font-bold text-white text-lg">{run.gameName}</h1>
          <p className="text-xs text-gray-400 capitalize">{run.region} • {run.difficulty}</p>
        </div>
        <div className="ml-auto flex gap-2 text-sm text-gray-400">
          {run.isShinyHuntMode && <span>✨ Shiny</span>}
          {run.isRandomMode && <span>🎲 Random</span>}
          <span className={`capitalize ${run.status === 'in-progress' ? 'text-green-400' : 'text-gray-400'}`}>
            {run.status}
          </span>
        </div>
      </header>

      <StatsBar run={run} />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5 p-4 overflow-y-auto border-r border-gray-700">
          <MapView run={run} />
          <ExportPanel run={run} teamViewId="team-export-target" />
        </div>

        <div className="w-2/5 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-700">
            {(['zones', 'team', 'types'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'zones' ? '🗺 Zones' : t === 'team' ? '⚔️ Team' : '🔬 Types'}
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
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading run...
      </div>
    }>
      <RunPageContent />
    </Suspense>
  );
}
