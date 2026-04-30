"use client";

import { useState } from "react";
import { useRunStore } from "@/store/runStore";
import { useRouter } from "next/navigation";
import { regions } from "@/lib/zones";
import { Run } from "@/lib/types";

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-600">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">
          Start New Run
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Game Name
            </label>
            <input
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
              placeholder="e.g. FireRed Nuzlocke"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Region</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
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

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isShinyHuntMode}
                onChange={(e) => setIsShinyHuntMode(e.target.checked)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className="text-sm text-gray-300">✨ Shiny Hunt Mode</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRandomMode}
                onChange={(e) => setIsRandomMode(e.target.checked)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className="text-sm text-gray-300">🎲 Randomizer</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!gameName.trim()}
            className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Run!
          </button>
        </div>
      </div>
    </div>
  );
}
