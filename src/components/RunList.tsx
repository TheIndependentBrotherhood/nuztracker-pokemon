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
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🎮</div>
        <p className="text-slate-400 text-base">
          Aucun run pour l&apos;instant. Lancez votre premier Nuzlocke !
        </p>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    "in-progress": {
      label: "Active",
      className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    },
    completed: {
      label: "Terminé",
      className: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    },
    abandoned: {
      label: "Abandonné",
      className: "bg-red-500/15 text-red-400 border border-red-500/30",
    },
  };

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const captureCount = run.zones.reduce(
          (acc, z) => acc + z.captures.length,
          0,
        );
        const visitedCount = run.zones.filter(
          (z) => z.status !== "not-visited",
        ).length;
        const status = statusConfig[run.status] ?? statusConfig["in-progress"];

        return (
          <div
            key={run.id}
            className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-blue-500/40 hover:bg-slate-800/90 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
            onClick={() => router.push(`/run/?id=${run.id}`)}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                  {run.gameName}
                </h3>
                <p className="text-slate-400 text-xs capitalize mt-0.5">
                  {run.region} Region
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${status.className}`}>
                {status.label}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{visitedCount}/{run.zones.length} zones visitées</span>
                <span>{captureCount} captures</span>
              </div>
              <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: run.zones.length > 0
                      ? `${(visitedCount / run.zones.length) * 100}%`
                      : '0%',
                    background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
                  }}
                />
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <div className="flex gap-3 text-xs text-slate-400">
                {run.isShinyHuntMode && <span>✨ Shiny</span>}
                {run.isRandomMode && <span>🎲 Random</span>}
                <span>{new Date(run.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Supprimer ce run ?")) deleteRun(run.id);
                }}
                className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded hover:bg-red-500/10"
              >
                Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
