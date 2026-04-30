"use client";

import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import ZoneItem from "./ZoneItem";
import { useState } from "react";

interface Props {
  run: Run;
}

const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "not-visited", label: "Non visitées" },
  { key: "visited", label: "Visitées" },
  { key: "captured", label: "Capturées" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function ZoneList({ run }: Props) {
  const { selectedZoneId } = useRunStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filtered = run.zones.filter((z) => {
    if (filter !== "all" && z.status !== filter) return false;
    if (search && !z.zoneName.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b-2 border-black space-y-3 bg-gradient-to-r from-blue-50 to-purple-50">
        <input
          className="w-full bg-white border-2 border-black rounded-2xl px-4 py-2.5 text-sm text-black font-bold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          placeholder="Rechercher une zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 text-xs font-bold py-2 rounded-lg border-2 transition-all ${
                filter === f.key
                  ? "bg-blue-500 text-white border-black shadow-md"
                  : "bg-white text-black border-black hover:bg-blue-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto flex-1 bg-white">
        {filtered.map((zone) => (
          <ZoneItem
            key={zone.id}
            zone={zone}
            runId={run.id}
            isSelected={selectedZoneId === zone.id}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-black font-bold py-10 text-sm">
            Aucune zone trouvée
          </div>
        )}
      </div>
    </div>
  );
}
