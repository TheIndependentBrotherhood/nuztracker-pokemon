'use client';

import { Run } from '@/lib/types';
import { useRunStore } from '@/store/runStore';
import ZoneItem from './ZoneItem';
import { useState } from 'react';

interface Props {
  run: Run;
}

export default function ZoneList({ run }: Props) {
  const { selectedZoneId } = useRunStore();
  const [filter, setFilter] = useState<'all' | 'not-visited' | 'visited' | 'captured'>('all');
  const [search, setSearch] = useState('');

  const filtered = run.zones.filter((z) => {
    if (filter !== 'all' && z.status !== filter) return false;
    if (search && !z.zoneName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 space-y-2">
        <input
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
          placeholder="Search zones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {(['all', 'not-visited', 'visited', 'captured'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-xs py-1 rounded capitalize transition-colors ${
                filter === f ? 'bg-yellow-400 text-gray-900 font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.map((zone) => (
          <ZoneItem
            key={zone.id}
            zone={zone}
            runId={run.id}
            isSelected={selectedZoneId === zone.id}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">No zones found</div>
        )}
      </div>
    </div>
  );
}
