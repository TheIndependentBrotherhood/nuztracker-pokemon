'use client';

import { Run } from '@/lib/types';
import { useRunStore } from '@/store/runStore';
import ZoneItem from './ZoneItem';
import { useState } from 'react';

interface Props {
  run: Run;
}

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'not-visited', label: 'Non visitées' },
  { key: 'visited', label: 'Visitées' },
  { key: 'captured', label: 'Capturées' },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

export default function ZoneList({ run }: Props) {
  const { selectedZoneId } = useRunStore();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const filtered = run.zones.filter((z) => {
    if (filter !== 'all' && z.status !== filter) return false;
    if (search && !z.zoneName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700/50 space-y-2">
        <input
          className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
          placeholder="Rechercher une zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 text-xs py-1 rounded-md transition-all ${
                filter === f.key
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
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
          <div className="text-center text-slate-500 py-10 text-sm">
            Aucune zone trouvée
          </div>
        )}
      </div>
    </div>
  );
}
