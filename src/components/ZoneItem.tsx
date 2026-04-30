'use client';

import { useState, useRef, useEffect } from 'react';
import { Zone } from '@/lib/types';
import { useRunStore } from '@/store/runStore';
import AddCaptureModal from './AddCaptureModal';
import { getSpriteUrl } from '@/lib/pokemon-api';

interface Props {
  zone: Zone;
  runId: string;
  isSelected: boolean;
}

const statusConfig: Record<string, { bg: string; dot: string }> = {
  'not-visited': {
    bg: 'bg-transparent',
    dot: 'bg-slate-600',
  },
  visited: {
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-400',
  },
  captured: {
    bg: 'bg-emerald-500/5',
    dot: 'bg-emerald-500',
  },
  multiple: {
    bg: 'bg-orange-500/5',
    dot: 'bg-orange-400',
  },
};

const cycleLabel: Record<string, string> = {
  'not-visited': '👁',
  visited: '✓',
  captured: '🔴',
};

export default function ZoneItem({ zone, runId, isSelected }: Props) {
  const { setZoneStatus, setSelectedZone } = useRunStore();
  const [showCapture, setShowCapture] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  const visualStatus = zone.captures.length >= 2 ? 'multiple' : zone.status;
  const config = statusConfig[visualStatus] ?? statusConfig['not-visited'];

  function handleStatusCycle() {
    if (zone.captures.length > 0 && zone.status === 'captured') return;
    const order: Zone['status'][] = ['not-visited', 'visited', 'captured'];
    const current = order.indexOf(zone.status);
    const next = order[(current + 1) % order.length];
    setZoneStatus(runId, zone.id, next);
  }

  return (
    <>
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={`border-b border-slate-700/30 p-3 transition-all duration-150 ${config.bg} ${
          isSelected ? 'ring-1 ring-inset ring-blue-500/40 bg-blue-500/10' : 'hover:bg-slate-800/40'
        }`}
        onClick={() => setSelectedZone(isSelected ? null : zone.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedZone(isSelected ? null : zone.id);
          }
        }}
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />

          <span className="text-sm font-medium flex-1 text-slate-200 truncate">
            {zone.zoneName}
          </span>

          {zone.captures.length > 0 && (
            <span className="text-xs text-slate-500 shrink-0">{zone.captures.length}</span>
          )}

          {/* Cycle status */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusCycle();
            }}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
              zone.captures.length > 0 && zone.status === 'captured'
                ? 'text-slate-700 cursor-not-allowed'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
            title={
              zone.captures.length > 0 && zone.status === 'captured'
                ? 'Supprimer les captures pour changer le statut'
                : 'Changer le statut'
            }
            aria-label={
              zone.captures.length > 0 && zone.status === 'captured'
                ? 'Supprimer les captures pour changer le statut'
                : 'Changer le statut'
            }
            disabled={zone.captures.length > 0 && zone.status === 'captured'}
          >
            {cycleLabel[zone.status]}
          </button>

          {/* Add capture */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCapture(true);
            }}
            className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded transition-colors font-medium"
          >
            + Capturer
          </button>
        </div>

        {/* Capture thumbnails */}
        {zone.captures.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {zone.captures.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-1 bg-slate-700/40 border border-slate-600/30 rounded-lg px-1.5 py-0.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSpriteUrl(c.pokemonId, c.isShiny)}
                  alt={c.pokemonName}
                  className="w-6 h-6 object-contain"
                />
                <span className="text-xs text-slate-300">{c.nickname || c.pokemonName}</span>
                <span className="text-xs text-slate-500">Lv{c.level}</span>
                {c.isShiny && <span className="text-xs">✨</span>}
              </div>
            ))}
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
