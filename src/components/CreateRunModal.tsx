"use client";

import { useState } from "react";
import { useRunStore } from "@/store/runStore";
import { useRouter } from "next/navigation";
import { regions } from "@/lib/zones";

interface Props {
  onClose: () => void;
}

export default function CreateRunModal({ onClose }: Props) {
  const { createRun } = useRunStore();
  const router = useRouter();

  const [gameName, setGameName] = useState("");
  const [region, setRegion] = useState("kanto");
  const [isShinyHuntMode, setIsShinyHuntMode] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);

  function handleCreate() {
    if (!gameName.trim()) return;
    const run = createRun({
      gameName: gameName.trim(),
      region,
      isShinyHuntMode,
      isRandomMode,
    });
    onClose();
    router.push(`/run/?id=${run.id}`);
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
          <h2 className="text-xl font-bold text-white">Nouveau Run</h2>
          <p className="text-slate-400 text-sm mt-0.5">Configurez votre aventure Nuzlocke</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Nom du Run
            </label>
            <input
              className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              placeholder="ex. FireRed Nuzlocke"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Région
            </label>
            <select
              className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.game}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isShinyHuntMode}
                  onChange={(e) => setIsShinyHuntMode(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                    isShinyHuntMode ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    isShinyHuntMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                ✨ Mode Shiny Hunt
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRandomMode}
                  onChange={(e) => setIsRandomMode(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                    isRandomMode ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    isRandomMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                🎲 Mode Randomizer
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!gameName.trim()}
            className="flex-1 btn-gradient py-2.5 rounded-lg text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Démarrer !
          </button>
        </div>
      </div>
    </div>
  );
}
