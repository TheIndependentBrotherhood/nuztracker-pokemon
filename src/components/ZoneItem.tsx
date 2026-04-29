'use client';

import { useState } from 'react';
import { Zone } from '@/lib/types';
import { useRunStore } from '@/store/runStore';
import AddCaptureModal from './AddCaptureModal';
import { getSpriteUrl } from '@/lib/pokemon-api';

interface Props {
  zone: Zone;
  runId: string;
  isSelected: boolean;
}

const statusColors: Record<string, string> = {
  'not-visited': 'border-gray-600 bg-gray-800/50',
  visited: 'border-blue-500 bg-blue-900/20',
  captured: 'border-green-500 bg-green-900/20',
};

const statusDots: Record<string, string> = {
  'not-visited': 'bg-gray-500',
  visited: 'bg-blue-400',
  captured: 'bg-green-500',
};

export default function ZoneItem({ zone, runId, isSelected }: Props) {
  const { setZoneStatus, setSelectedZone } = useRunStore();
  const [showCapture, setShowCapture] = useState(false);

  function handleStatusCycle() {
    const order: Zone['status'][] = ['not-visited', 'visited', 'captured'];
    const current = order.indexOf(zone.status);
    const next = order[(current + 1) % order.length];
    setZoneStatus(runId, zone.id, next);
  }

  return (
    <>
      <div
        className={`border-b border-gray-700/50 p-3 transition-all ${statusColors[zone.status]} ${
          isSelected ? 'ring-2 ring-yellow-400/50' : ''
        }`}
        onClick={() => setSelectedZone(isSelected ? null : zone.id)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDots[zone.status]}`} />
          <span className="text-sm font-medium flex-1 cursor-pointer">{zone.zoneName}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusCycle();
            }}
            className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
            title="Cycle status"
          >
            {zone.status === 'not-visited' ? '👁' : zone.status === 'visited' ? '✓' : '🔴'}
          </button>
          {zone.status !== 'not-visited' && zone.captures.length === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCapture(true);
              }}
              className="text-xs text-yellow-400 hover:text-yellow-300 bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
            >
              + Catch
            </button>
          )}
        </div>

        {zone.captures.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {zone.captures.map((c) => (
              <div key={c.id} className="flex items-center gap-1 bg-gray-700/60 rounded px-1.5 py-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSpriteUrl(c.pokemonId, c.isShiny)}
                  alt={c.pokemonName}
                  className="w-6 h-6 object-contain"
                />
                <span className="text-xs text-gray-300">{c.nickname || c.pokemonName}</span>
                <span className="text-xs text-gray-500">Lv{c.level}</span>
              </div>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCapture(true);
              }}
              className="text-xs text-yellow-400 bg-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-600"
            >
              +
            </button>
          </div>
        )}
      </div>

      {showCapture && (
        <AddCaptureModal
          runId={runId}
          zoneId={zone.id}
          zoneName={zone.zoneName}
          onClose={() => setShowCapture(false)}
        />
      )}
    </>
  );
}
