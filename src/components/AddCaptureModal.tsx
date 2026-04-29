'use client';

import { useState, useEffect } from 'react';
import { useRunStore } from '@/store/runStore';
import { searchPokemon, getPokemonIdFromUrl, getSpriteUrl } from '@/lib/pokemon-api';
import { Capture } from '@/lib/types';

interface Props {
  runId: string;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

const natures = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
];

export default function AddCaptureModal({ runId, zoneId, zoneName, onClose }: Props) {
  const { addCapture } = useRunStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ name: string; url: string }>>([]);
  const [selected, setSelected] = useState<{ name: string; id: number } | null>(null);
  const [nickname, setNickname] = useState('');
  const [level, setLevel] = useState(5);
  const [gender, setGender] = useState<Capture['gender']>('unknown');
  const [nature, setNature] = useState('');
  const [isShiny, setIsShiny] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (query.length < 2) {
        if (!cancelled) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      if (!cancelled) {
        setSearching(true);
      }

      const r = await searchPokemon(query);

      if (cancelled) return;

      setResults(r);
      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query]);

  async function handleSelect(item: { name: string; url: string }) {
    const id = getPokemonIdFromUrl(item.url);
    setSelected({ name: item.name, id });
    setQuery(item.name);
    setResults([]);
  }

  function handleAdd() {
    if (!selected) return;
    addCapture(runId, zoneId, {
      pokemonId: selected.id,
      pokemonName: selected.name,
      nickname: nickname || undefined,
      level,
      gender,
      isShiny,
      nature: nature || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-600" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-yellow-400">Add Capture — {zoneName}</h2>

        <div className="relative mb-4">
          <label className="block text-sm text-gray-300 mb-1">Pokémon</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
              placeholder="Search Pokémon name..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            />
            {selected && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getSpriteUrl(selected.id, isShiny)}
                alt={`${isShiny ? 'Shiny ' : ''}${selected.name} sprite`}
                className="w-10 h-10 object-contain"
              />
            )}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto z-10">
              {results.map((r) => (
                <button
                  key={r.url}
                  className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm capitalize"
                  onClick={() => handleSelect(r)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
          {searching && <div className="text-xs text-gray-400 mt-1">Searching...</div>}
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">Nickname (optional)</label>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
            placeholder="Enter nickname..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-1">Level</label>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
              value={level}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setLevel(isNaN(val) ? 1 : Math.min(100, Math.max(1, val)));
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-1">Gender</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
              value={gender}
              onChange={(e) => setGender(e.target.value as Capture['gender'])}
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male ♂</option>
              <option value="female">Female ♀</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">Nature (optional)</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
            value={nature}
            onChange={(e) => setNature(e.target.value)}
          >
            <option value="">-- Select nature --</option>
            {natures.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={isShiny}
            onChange={(e) => setIsShiny(e.target.checked)}
            className="w-4 h-4 accent-yellow-400"
          />
          <span className="text-sm text-gray-300">✨ Is Shiny?</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected}
            className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Capture
          </button>
        </div>
      </div>
    </div>
  );
}
