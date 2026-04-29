'use client';

import { Run } from '@/lib/types';

interface Props {
  run: Run;
}

export default function StatsBar({ run }: Props) {
  const total = run.zones.length;
  const visited = run.zones.filter((z) => z.status !== 'not-visited').length;
  const captured = run.zones.filter((z) => z.status === 'captured').length;
  const totalCaptures = run.zones.reduce((acc, z) => acc + z.captures.length, 0);
  const captureRate = visited > 0 ? Math.round((captured / visited) * 100) : 0;

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Zones Visited:</span>
        <span className="font-bold text-blue-400">{visited}/{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Captured:</span>
        <span className="font-bold text-green-400">{captured} zones</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Total Captures:</span>
        <span className="font-bold text-yellow-400">{totalCaptures}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Capture Rate:</span>
        <span className="font-bold text-purple-400">{captureRate}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Team:</span>
        <span className="font-bold text-orange-400">{run.team.length}/6</span>
      </div>
    </div>
  );
}
