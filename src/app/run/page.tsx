"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRunStore } from "@/store/runStore";
import { getRun } from "@/lib/storage";
import StatsBar from "@/components/StatsBar";
import MapView from "@/components/MapView";
import ZoneList from "@/components/ZoneList";
import TeamView from "@/components/TeamView";
import TypeAnalysis from "@/components/TypeAnalysis";
import ExportPanel from "@/components/ExportPanel";
import Header from "@/components/Header";
import StyledButton from "@/components/StyledButton";

type Tab = "zones" | "team" | "types";

function RunPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { runs, loadRuns, setCurrentRun, updateRun } = useRunStore();
  const [tab, setTab] = useState<Tab>("zones");
  const [mounted, setMounted] = useState(false);

  const id = searchParams.get("id") ?? "";

  useEffect(() => {
    setMounted(true);
    loadRuns();
  }, [loadRuns]);

  const run = runs.find((r) => r.id === id) ?? (mounted ? getRun(id) : null);

  useEffect(() => {
    if (run) setCurrentRun(run);
  }, [run, setCurrentRun]);

  if (!mounted) return null;

  if (!run) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center bg-white border-4 border-black rounded-3xl p-8 shadow-lg">
          <div className="text-6xl mb-4">😿</div>
          <p className="text-black text-lg font-bold mb-6">Run introuvable</p>
          <StyledButton
            onClick={() => router.push("/")}
            variant="secondary"
            sx={{ px: 6, py: 1 }}
          >
            ← Retour à l&apos;accueil
          </StyledButton>
        </div>
      </div>
    );
  }

  const statusActions =
    run.status === "in-progress" ? (
      <>
        <StyledButton
          onClick={() => updateRun({ ...run, status: "completed" })}
          variant="primary"
        >
          ✓ Terminer
        </StyledButton>
        <StyledButton
          onClick={() => updateRun({ ...run, status: "abandoned" })}
          variant="danger"
        >
          ✗ Abandonner
        </StyledButton>
      </>
    ) : (
      <>
        <div
          style={{
            display: "inline-block",
            background: run.status === "completed" ? "#d1fae5" : "#fee2e2",
            color: run.status === "completed" ? "#065f46" : "#7f1d1d",
            padding: "12px 16px",
            borderRadius: "2rem",
            border: "3px solid #000",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          {run.status === "completed" ? "✓ Terminé" : "✗ Abandonné"}
        </div>
        <StyledButton
          onClick={() => updateRun({ ...run, status: "in-progress" })}
          variant="secondary"
        >
          ↩ Reprendre
        </StyledButton>
      </>
    );

  const backAction = (
    <StyledButton
      onClick={() => router.push("/")}
      variant="secondary"
      sx={{ px: 3 }}
    >
      ← Accueil
    </StyledButton>
  );

  const headerSubtitle = [
    run.region,
    run.difficulty,
    run.isShinyHuntMode && "✨ Shiny",
    run.isRandomMode && "🎲 Random",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-blue-50 to-purple-50 flex flex-col">
      <Header
        showBack
        title={run.gameName}
        subtitle={headerSubtitle}
        backAction={backAction}
        actions={statusActions}
      />

      <StatsBar run={run} />

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Left: Tabs */}
        <div className="w-1/2 flex flex-col bg-white border-3 border-black rounded-2xl overflow-hidden shadow-lg">
          <div className="flex border-b-2 border-black bg-gradient-to-r from-blue-100 to-purple-100">
            {(["zones", "team", "types"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-bold transition-all border-b-4 ${
                  tab === t
                    ? "text-black bg-blue-200 border-black"
                    : "text-slate-600 hover:text-black border-transparent"
                }`}
              >
                {t === "zones"
                  ? "🗺 Zones"
                  : t === "team"
                    ? "⚔️ Équipe"
                    : "🔬 Types"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "zones" && <ZoneList run={run} />}
            {tab === "team" && (
              <div className="p-4">
                <TeamView run={run} id="team-export-target" />
              </div>
            )}
            {tab === "types" && (
              <div className="p-4">
                <TypeAnalysis run={run} />
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="w-1/2 bg-white border-3 border-black rounded-2xl overflow-hidden shadow-lg flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <MapView run={run} />
          </div>
          <div className="border-t-2 border-black p-4 bg-yellow-50">
            <ExportPanel run={run} teamViewId="team-export-target" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RunPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Chargement...
        </div>
      }
    >
      <RunPageContent />
    </Suspense>
  );
}
