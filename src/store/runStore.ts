import { create } from "zustand";
import { Run, Zone, Capture, RandomizerOptions } from "@/lib/types";
import { getRuns, saveRun, deleteRun as deleteRunStorage } from "@/lib/storage";
import { getZonesForRegion } from "@/lib/zones";

interface RunStore {
  runs: Run[];
  currentRun: Run | null;
  selectedZoneId: string | null;
  loadRuns: () => void;
  setCurrentRun: (run: Run | null) => void;
  createRun: (data: {
    gameName: string;
    region: string;
    isShinyHuntMode: boolean;
    isRandomMode: boolean;
    typeChartGeneration: "gen1" | "gen2-5" | "gen6+";
    randomizerOptions?: RandomizerOptions;
  }) => Run;
  updateRun: (run: Run) => void;
  deleteRun: (id: string) => void;
  setZoneStatus: (
    runId: string,
    zoneId: string,
    status: Zone["status"],
  ) => void;
  addCapture: (
    runId: string,
    zoneId: string,
    capture: Omit<Capture, "id" | "createdAt">,
  ) => void;
  removeCapture: (runId: string, zoneId: string, captureId: string) => void;
  setSelectedZone: (zoneId: string | null) => void;
  updateTeam: (runId: string, team: Capture[]) => void;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + two random segments for collision resistance
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const useRunStore = create<RunStore>((set, get) => ({
  runs: [],
  currentRun: null,
  selectedZoneId: null,

  loadRuns: () => {
    const runs = getRuns();
    set({ runs });
  },

  setCurrentRun: (run) => set({ currentRun: run, selectedZoneId: null }),

  createRun: (data) => {
    const zoneTemplates = getZonesForRegion(data.region);
    const zones: Zone[] = zoneTemplates.map((zt) => ({
      id: zt.id,
      zoneName: zt.zoneName,
      zoneNames: zt.zoneNames,
      regionArea: zt.regionArea,
      status: "not-visited" as const,
      captures: [],
      updatedAt: Date.now(),
    }));

    const run: Run = {
      id: newId(),
      ...data,
      difficulty: "normal",
      status: "in-progress",
      zones,
      team: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveRun(run);
    set((state) => ({ runs: [...state.runs, run] }));
    return run;
  },

  updateRun: (run) => {
    const updated = { ...run, updatedAt: Date.now() };
    saveRun(updated);
    set((state) => ({
      runs: state.runs.map((r) => (r.id === updated.id ? updated : r)),
      currentRun:
        state.currentRun?.id === updated.id ? updated : state.currentRun,
    }));
  },

  deleteRun: (id) => {
    deleteRunStorage(id);
    set((state) => ({
      runs: state.runs.filter((r) => r.id !== id),
      currentRun: state.currentRun?.id === id ? null : state.currentRun,
    }));
  },

  setZoneStatus: (runId, zoneId, status) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    const updatedRun = {
      ...run,
      zones: run.zones.map((z) =>
        z.id === zoneId ? { ...z, status, updatedAt: Date.now() } : z,
      ),
    };
    get().updateRun(updatedRun);
  },

  addCapture: (runId, zoneId, captureData) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    const capture: Capture = {
      ...captureData,
      id: newId(),
      createdAt: Date.now(),
    };
    const updatedRun = {
      ...run,
      zones: run.zones.map((z) =>
        z.id === zoneId
          ? {
              ...z,
              status: "captured" as const,
              captures: [...z.captures, capture],
              updatedAt: Date.now(),
            }
          : z,
      ),
    };
    if (updatedRun.team.length < 6) {
      updatedRun.team = [...updatedRun.team, capture];
    }
    get().updateRun(updatedRun);
  },

  removeCapture: (runId, zoneId, captureId) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    const updatedRun = {
      ...run,
      zones: run.zones.map((z) => {
        if (z.id !== zoneId) return z;
        const remaining = z.captures.filter((c) => c.id !== captureId);
        return {
          ...z,
          captures: remaining,
          status: remaining.length === 0 ? ("visited" as const) : z.status,
          updatedAt: Date.now(),
        };
      }),
      team: run.team.filter((c) => c.id !== captureId),
    };
    get().updateRun(updatedRun);
  },

  setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId }),

  updateTeam: (runId, team) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    get().updateRun({ ...run, team });
  },
}));
