import { create } from "zustand";
import { Run, Zone, Capture, RandomizerOptions, SoulLinkPlayer } from "@/lib/types";
import { getRuns, saveRun, deleteRun as deleteRunStorage } from "@/lib/storage";
import { getZonesForRegion } from "@/lib/zones";
import { saveRunToCloud, deleteRunFromCloud } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";

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
    isSoulLinkMode?: boolean;
    soulLinkPlayers?: SoulLinkPlayer[];
  }) => Run;
  updateRun: (run: Run) => void;
  deleteRun: (id: string) => void;
  addCapture: (
    runId: string,
    zoneId: string,
    capture: Omit<Capture, "id" | "createdAt">,
    abilityPanel?: string[],
  ) => void;
  removeCapture: (runId: string, zoneId: string, captureId: string) => void;
  setSelectedZone: (zoneId: string | null) => void;
  updateTeam: (runId: string, team: Capture[], playerIndex?: number) => void;
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
      zoneName: zt.zoneNames?.en ?? zt.regionArea ?? "Unknown",
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
      ...(data.isSoulLinkMode && data.soulLinkPlayers
        ? {
            isSoulLinkMode: true,
            soulLinkPlayers: data.soulLinkPlayers,
            playerTeams: {},
          }
        : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveRun(run);
    set((state) => ({ runs: [...state.runs, run] }));
    return run;
  },

  updateRun: (run: Run) => {
    // Clean dead captures from team
    const cleanedTeam = run.team.filter((capture) => !capture.isDead);
    // Also clean dead captures from playerTeams if soul link mode
    const cleanedPlayerTeams: Record<number, Capture[]> | undefined =
      run.playerTeams
        ? Object.fromEntries(
            Object.entries(run.playerTeams).map(([idx, t]) => [
              idx,
              (t as Capture[]).filter((c) => !c.isDead),
            ]),
          )
        : undefined;
    const updated = {
      ...run,
      team: cleanedTeam,
      ...(cleanedPlayerTeams !== undefined
        ? { playerTeams: cleanedPlayerTeams }
        : {}),
      updatedAt: Date.now(),
    };
    saveRun(updated);
    // Fire-and-forget cloud sync when enabled
    if (updated.cloudSyncEnabled && isFirebaseConfigured()) {
      saveRunToCloud(updated).catch(() => {
        // Cloud sync failure must never block the UI
      });
    }
    set((state) => ({
      runs: state.runs.map((r) => (r.id === updated.id ? updated : r)),
      currentRun:
        state.currentRun?.id === updated.id ? updated : state.currentRun,
    }));
  },

  deleteRun: (id) => {
    const run = get().runs.find((r) => r.id === id);
    deleteRunStorage(id);
    // Fire-and-forget cloud delete when the run was synced
    if (run?.cloudSyncEnabled && isFirebaseConfigured()) {
      deleteRunFromCloud(id).catch(() => {
        // Cloud sync failure must never block the UI
      });
    }
    set((state) => ({
      runs: state.runs.filter((r) => r.id !== id),
      currentRun: state.currentRun?.id === id ? null : state.currentRun,
    }));
  },

  addCapture: (runId, zoneId, captureData, abilityPanel) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    const zone = run.zones.find((z) => z.id === zoneId);

    if (run.isSoulLinkMode) {
      // In soul link mode: max 1 capture per player per zone
      const playerIdx = captureData.playerIndex ?? 0;
      if (
        zone &&
        zone.captures.some((c) => (c.playerIndex ?? 0) === playerIdx)
      ) {
        return;
      }
    } else {
      const maxCaptures = run.isShinyHuntMode ? 2 : 1;
      if (zone && zone.captures.length >= maxCaptures) return;
      // In shiny hunt mode, one of the two captures must be shiny
      if (run.isShinyHuntMode && zone && zone.captures.length === 1) {
        const existingIsShiny = zone.captures[0].isShiny;
        if (!existingIsShiny && !captureData.isShiny) return;
      }
    }

    const capture: Capture = {
      ...captureData,
      id: newId(),
      createdAt: Date.now(),
    };
    const nextCustomTypesByPokemonId = {
      ...(run.customTypesByPokemonId ?? {}),
    };
    if (captureData.customTypes && captureData.customTypes.length > 0) {
      nextCustomTypesByPokemonId[captureData.pokemon.id] =
        captureData.customTypes;
    }
    const nextCustomAbilitiesByPokemonId = {
      ...(run.customAbilitiesByPokemonId ?? {}),
    };
    if (abilityPanel && abilityPanel.length > 0) {
      // Cap at 3 to enforce the panel limit regardless of caller
      nextCustomAbilitiesByPokemonId[captureData.pokemon.id] =
        abilityPanel.slice(0, 3);
    }

    // Determine zone status
    const determineZoneStatus = (
      currentStatus: Zone["status"],
    ): Zone["status"] => {
      if (captureData.isDead && captureData.failedCapture) return "lost";
      if (!captureData.isDead) {
        if (run.isSoulLinkMode && run.soulLinkPlayers) {
          // In soul link: "captured" only when all players have a real capture
          const playerCount = run.soulLinkPlayers.length;
          const existingRealCaptures = (zone?.captures ?? []).filter(
            (c) => !c.failedCapture,
          ).length;
          // +1 for this new capture (if not a fail)
          return existingRealCaptures + 1 >= playerCount
            ? "captured"
            : "visited";
        }
        return "captured";
      }
      return currentStatus;
    };

    const updatedRun = {
      ...run,
      customTypesByPokemonId:
        Object.keys(nextCustomTypesByPokemonId).length > 0
          ? nextCustomTypesByPokemonId
          : undefined,
      customAbilitiesByPokemonId:
        Object.keys(nextCustomAbilitiesByPokemonId).length > 0
          ? nextCustomAbilitiesByPokemonId
          : undefined,
      zones: run.zones.map((z) => {
        if (z.id !== zoneId) return z;
        return {
          ...z,
          status: determineZoneStatus(z.status),
          captures: [...z.captures, capture],
          updatedAt: Date.now(),
        };
      }),
    };

    if (run.isSoulLinkMode) {
      // In soul link mode: add to the appropriate playerTeam
      if (!captureData.isDead) {
        const playerIdx = captureData.playerIndex ?? 0;
        const currentPlayerTeam = updatedRun.playerTeams?.[playerIdx] ?? [];
        if (currentPlayerTeam.length < 6) {
          updatedRun.playerTeams = {
            ...(updatedRun.playerTeams ?? {}),
            [playerIdx]: [...currentPlayerTeam, capture],
          };
        }
      }
    } else {
      // Classic mode: add to shared team
      if (!captureData.isDead && updatedRun.team.length < 6) {
        updatedRun.team = [...updatedRun.team, capture];
      }
    }

    get().updateRun(updatedRun);
  },

  removeCapture: (runId, zoneId, captureId) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    const updatedPlayerTeams: Record<number, Capture[]> | undefined =
      run.playerTeams
        ? Object.fromEntries(
            Object.entries(run.playerTeams).map(([idx, t]) => [
              idx,
              (t as Capture[]).filter((c) => c.id !== captureId),
            ]),
          )
        : undefined;
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
      ...(updatedPlayerTeams !== undefined
        ? { playerTeams: updatedPlayerTeams }
        : {}),
    };
    get().updateRun(updatedRun);
  },

  setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId }),

  updateTeam: (runId, team, playerIndex) => {
    const run = get().runs.find((r) => r.id === runId);
    if (!run) return;
    if (run.isSoulLinkMode && playerIndex !== undefined) {
      // Update the specific player's team
      get().updateRun({
        ...run,
        playerTeams: {
          ...(run.playerTeams ?? {}),
          [playerIndex]: team,
        },
      });
    } else {
      get().updateRun({ ...run, team });
    }
  },
}));
