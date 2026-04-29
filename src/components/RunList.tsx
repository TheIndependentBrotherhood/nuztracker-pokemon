'use client';

import { Run } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useRunStore } from '@/store/runStore';

interface RunListProps {
  runs: Run[];
}

export default function RunList({ runs }: RunListProps) {
  const router = useRouter();
  const { deleteRun } = useRunStore();

  if (runs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎮</div>
        <p className="text-gray-400 text-lg">No runs yet. Start your first Nuzlocke!</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'in-progress': 'text-green-400',
    completed: 'text-blue-400',
    abandoned: 'text-red-400',
  };

  const statusLabels: Record<string, string> = {
    'in-progress': '▶ In Progress',
    completed: '✓ Completed',
    abandoned: '✗ Abandoned',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {runs.map((run) => {
        const captureCount = run.zones.reduce((acc, z) => acc + z.captures.length, 0);
        const visitedCount = run.zones.filter((z) => z.status !== 'not-visited').length;

        return (
          <div
            key={run.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-yellow-400/50 transition-all cursor-pointer group"
            onClick={() => router.push(`/run/${run.id}`)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                  {run.gameName}
                </h3>
                <p className="text-gray-400 text-sm capitalize">{run.region} Region</p>
              </div>
              <span className={`text-sm font-medium ${statusColors[run.status]}`}>
                {statusLabels[run.status]}
              </span>
            </div>

            <div className="mt-3 flex gap-4 text-sm text-gray-300">
              <span>🗺 {visitedCount}/{run.zones.length} zones</span>
              <span>🔴 {captureCount} captures</span>
              <span className="capitalize">⚙ {run.difficulty}</span>
              {run.isShinyHuntMode && <span>✨ Shiny Hunt</span>}
            </div>

            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {new Date(run.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this run?')) deleteRun(run.id);
                }}
                className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
