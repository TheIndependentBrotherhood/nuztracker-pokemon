"use client";

import { Run } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useRunStore } from "@/store/runStore";

interface RunListProps {
  runs: Run[];
}

export default function RunList({ runs }: RunListProps) {
  const router = useRouter();
  const { deleteRun } = useRunStore();

  if (runs.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="text-7xl mb-6 animate-bounce">🎮</div>
        <h3 className="text-xl font-bold text-black mb-2">
          Aucun run pour l&apos;instant
        </h3>
        <p className="text-gray-700 text-base font-medium">
          Lancez votre premier Nuzlocke et démarrez l&apos;aventure !
        </p>
      </div>
    );
  }

  const statusConfig: Record<
    string,
    { label: string; icon: string; className: string; barColor: string }
  > = {
    "in-progress": {
      label: "Active",
      icon: "▶️",
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      barColor: "from-emerald-500 to-green-400",
    },
    completed: {
      label: "Terminé",
      icon: "✓",
      className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      barColor: "from-blue-500 to-cyan-400",
    },
    abandoned: {
      label: "Abandonné",
      icon: "✕",
      className: "bg-red-500/10 border-red-500/30 text-red-400",
      barColor: "from-red-500 to-orange-400",
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {runs.map((run) => {
        const captureCount = run.zones.reduce(
          (acc, z) => acc + z.captures.length,
          0,
        );
        const visitedCount = run.zones.filter(
          (z) => z.status !== "not-visited",
        ).length;
        const progress =
          run.zones.length > 0 ? (visitedCount / run.zones.length) * 100 : 0;
        const status = statusConfig[run.status] ?? statusConfig["in-progress"];

        return (
          <div
            key={run.id}
            className="group relative bg-[#E3F2FD] border-3 border-black rounded-2xl p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => router.push(`/run/?id=${run.id}`)}
          >
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 pointer-events-none transition-all duration-300" />

            {/* Content */}
            <div className="relative z-10 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-black group-hover:text-blue-600 transition-colors truncate leading-tight">
                    {run.gameName}
                  </h3>
                  <p className="text-gray-700 text-xs mt-1.5 capitalize font-medium">
                    📍{" "}
                    {run.region.charAt(0).toUpperCase() + run.region.slice(1)}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 border transition-all flex items-center gap-1 ${status.className}`}
                >
                  <span>{status.icon}</span>
                  {status.label}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#E8F5E9] rounded-lg p-3 border-2 border-black">
                  <p className="text-xs text-black font-bold mb-0.5">Zones</p>
                  <p className="text-lg font-bold text-[#10b981]">
                    {visitedCount}/{run.zones.length}
                  </p>
                </div>
                <div className="bg-[#F3E5F5] rounded-lg p-3 border-2 border-black">
                  <p className="text-xs text-black font-bold mb-0.5">
                    Captures
                  </p>
                  <p className="text-lg font-bold text-[#8b5cf6]">
                    {captureCount}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-black font-bold">Progression</span>
                  <span className="font-bold text-black">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${status.barColor}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Modes */}
              <div className="flex flex-wrap gap-2 pt-1">
                {run.isShinyHuntMode && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-medium">
                    ✨ Shiny
                  </span>
                )}
                {run.isRandomMode && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium">
                    🎲 Random
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30 font-medium">
                  📅 {new Date(run.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Supprimer ce run ?")) deleteRun(run.id);
                }}
                className="w-full text-xs py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all font-medium opacity-0 group-hover:opacity-100"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
