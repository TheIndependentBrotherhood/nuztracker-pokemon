'use client';

import { useEffect, useState } from 'react';
import { useRunStore } from '@/store/runStore';
import RunList from '@/components/RunList';
import CreateRunModal from '@/components/CreateRunModal';

export default function HomePage() {
  const { runs, loadRuns } = useRunStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black tracking-wider text-yellow-400 drop-shadow-lg mb-2">
            NuzTracker
          </h1>
          <p className="text-blue-300 text-lg">Your Nuzlocke Run Companion</p>
          <div className="flex gap-2 justify-center mt-2">
            <span className="text-2xl">🎮</span>
            <span className="text-2xl">⚔️</span>
            <span className="text-2xl">🏆</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{runs.length}</div>
            <div className="text-xs text-gray-400">Total Runs</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">
              {runs.filter((r) => r.status === 'in-progress').length}
            </div>
            <div className="text-xs text-gray-400">Active</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {runs.reduce((acc, r) => acc + r.team.length, 0)}
            </div>
            <div className="text-xs text-gray-400">Captures</div>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            + New Run
          </button>
        </div>

        <RunList runs={runs} />

        {showCreate && <CreateRunModal onClose={() => setShowCreate(false)} />}
      </div>
    </main>
  );
}
