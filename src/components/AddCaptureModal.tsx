"use client";

import { useState, useEffect } from "react";
import { useRunStore } from "@/store/runStore";
import {
  searchPokemon,
  getPokemonIdFromUrl,
  getSpriteUrl,
} from "@/lib/pokemon-api";
import { Capture } from "@/lib/types";

interface Props {
  runId: string;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

export default function AddCaptureModal({
  runId,
  zoneId,
  zoneName,
  onClose,
}: Props) {
  const { addCapture } = useRunStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; url: string }>>(
    [],
  );
  const [selected, setSelected] = useState<{ name: string; id: number } | null>(
    null,
  );
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState(5);
  const [gender, setGender] = useState<Capture["gender"]>("unknown");
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
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700/60 shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-white">Ajouter une capture</h2>
          <p className="text-slate-400 text-sm mt-0.5">📍 {zoneName}</p>
        </div>

        {/* Pokemon search */}
        <div className="relative mb-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
            Pokémon
          </label>
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              placeholder="Rechercher un Pokémon..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              autoFocus
            />
            {selected && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getSpriteUrl(selected.id, isShiny)}
                alt={`${isShiny ? "Shiny " : ""}${selected.name} sprite`}
                className="w-12 h-12 object-contain shrink-0 drop-shadow"
              />
            )}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-600 rounded-xl mt-1 max-h-48 overflow-y-auto z-10 shadow-xl">
              {results.map((r) => (
                <button
                  key={r.url}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/60 text-sm capitalize text-slate-200 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  onClick={() => handleSelect(r)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="text-xs text-slate-500 mt-1">Recherche...</div>
          )}
        </div>

        {/* Nickname */}
        <div className="mb-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
            Surnom (optionnel)
          </label>
          <input
            className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            placeholder="Entrez un surnom..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        {/* Level & Gender */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Niveau
            </label>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              value={level}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setLevel(isNaN(val) ? 1 : Math.min(100, Math.max(1, val)));
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Genre
            </label>
            <select
              className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none"
              value={gender}
              onChange={(e) => setGender(e.target.value as Capture["gender"])}
            >
              <option value="unknown">Inconnu</option>
              <option value="male">Mâle ♂</option>
              <option value="female">Femelle ♀</option>
            </select>
          </div>
        </div>

        {/* Shiny toggle */}
        <label className="flex items-center gap-3 mb-5 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={isShiny}
              onChange={(e) => setIsShiny(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                isShiny ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            />
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                isShiny ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
            ✨ Est Shiny ?
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected}
            className="flex-1 btn-gradient py-2.5 rounded-lg text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
