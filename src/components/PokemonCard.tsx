'use client';

import { useState } from 'react';
import { Capture } from '@/lib/types';
import { getSpriteUrl } from '@/lib/pokemon-api';
import PokemonDetailModal from './PokemonDetailModal';

interface Props {
  capture: Capture | null;
  slotIndex: number;
  runId: string;
}

export default function PokemonCard({ capture, slotIndex, runId }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  if (!capture) {
    return (
      <div className="bg-gray-700/30 border border-dashed border-gray-600 rounded-xl p-4 flex items-center justify-center min-h-[100px]">
        <span className="text-gray-600 text-sm">Empty Slot {slotIndex + 1}</span>
      </div>
    );
  }

  const genderSymbol = capture.gender === 'male' ? '♂' : capture.gender === 'female' ? '♀' : '';

  return (
    <>
      <div
        className="bg-gray-700/50 border border-gray-600 hover:border-yellow-400/50 rounded-xl p-3 cursor-pointer transition-all hover:scale-105 relative"
        onClick={() => setShowDetail(true)}
      >
        {capture.isShiny && (
          <span className="absolute top-1 right-1 text-xs">✨</span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getSpriteUrl(capture.pokemonId, capture.isShiny)}
          alt={capture.pokemonName}
          className="w-14 h-14 object-contain mx-auto"
        />
        <div className="text-center mt-1">
          <div className="text-sm font-bold text-white truncate">
            {capture.nickname || capture.pokemonName}
            <span className="text-gray-400 ml-1 text-xs">{genderSymbol}</span>
          </div>
          <div className="text-xs text-gray-400 capitalize">{capture.pokemonName}</div>
          <div className="text-xs text-gray-400">Lv.{capture.level}</div>
          {capture.nature && <div className="text-xs text-purple-400">{capture.nature}</div>}
        </div>
      </div>

      {showDetail && (
        <PokemonDetailModal
          capture={capture}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
