import { create } from "zustand";
import {
  Run,
  Zone,
  Capture,
  RandomizerOptions,
  SoulLinkPlayer,
} from "@/lib/types";
import { getRuns, saveRun, deleteRun as deleteRunStorage } from "@/lib/storage";
import { getZonesForRegion } from "@/lib/zones";
import { isZoneLockedForPlayer } from "@/lib/zone-progress";

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

/**
 * Zone status derived from the whole set of captures in the zone
 * (relevant in Soul Link where several players share one zone).
 */
export function deriveZoneStatus(
  captures: Capture[],
  currentStatus: Zone["status"],
): Zone["status"] {
  if (captures.length === 0) return "not-visited";
  if (captures.some((c) => !c.isDead)) return "captured";
  if (captures.every((c) => c.failedCapture)) return "lost";
  // Only dead-after-capture Pokémon left: the zone was captured
  if (captures.some((c) => c.isDead && !c.failedCapture)) return "captured";
  return currentStatus;
}

/**
 * Soul Link rule: when a player fails a zone or loses the Pokémon caught there,
 * the partners' Pokémon from that zone are released — they count as dead.
 * Linked deaths are flagged so they can be reverted if the root cause is removed.
 */
export function applySoulLinkDeaths(run: Run): Run {
  if (!run.isSoulLinkMode) return run;

  let changed = false;
  const now = Date.now();

  const zones = run.zones.map((zone) => {
    // Root causes: deaths that were not themselves caused by the link
    const rootDeaths = zone.captures.filter((c) => c.isDead && !c.linkedDeath);
    let zoneChanged = false;

    const captures = zone.captures.map((capture) => {
      const playerIdx = capture.playerIndex ?? 0;
      const cause = rootDeaths.find((c) => (c.playerIndex ?? 0) !== playerIdx);

      if (!capture.isDead && cause) {
        zoneChanged = true;
        return {
          ...capture,
          isDead: true,
          linkedDeath: true,
          diedAt: now,
          killedByPlayerIndex: cause.playerIndex ?? 0,
        };
      }

      if (capture.isDead && capture.linkedDeath && !cause) {
        // The partner's failure/death was removed: the Pokémon comes back (in the reserve)
        zoneChanged = true;
        const revived = { ...capture, isDead: false };
        delete revived.linkedDeath;
        delete revived.diedAt;
        delete revived.killedByPlayerIndex;
        return revived;
      }

      return capture;
    });

    if (!zoneChanged) return zone;
    changed = true;
    return { ...zone, captures, updatedAt: now };
  });

  return changed ? { ...run, zones } : run;
}

function normalizeRuns(runs: Run[]): Run[] {
  const validStatuses: Zone["status"][] = ["not-visited", "captured", "lost"];

  return runs.map((run) => ({
    ...run,
    zones: run.zones.map((zone) => ({
      ...zone,
      // Normalize unknown statuses to "not-visited"
      status: validStatuses.includes(zone.status as Zone["status"])
        ? (zone.status as Zone["status"])
        : ("not-visited" as const),
    })),
  }));
}

/** Dead captures (by flag or by their state in zones) never stay in a team */
function removeDeadFromTeam(team: Capture[], zones: Zone[]): Capture[] {
  return team.filter(
    (c) =>
      !c.isDead &&
      !zones.some((z) => z.captures.some((zc) => zc.id === c.id && zc.isDead)),
  );
}

/** Apply run-wide invariants: Soul Link linked deaths, then teams without dead Pokémon */
function finalizeRun(inputRun: Run): Run {
  const run = applySoulLinkDeaths(inputRun);
  const team = removeDeadFromTeam(run.team, run.zones);
  const playerTeams: Record<number, Capture[]> | undefined = run.playerTeams
    ? Object.fromEntries(
        Object.entries(run.playerTeams).map(([idx, t]) => [
          idx,
          removeDeadFromTeam(t as Capture[], run.zones),
        ]),
      )
    : undefined;

  return {
    ...run,
    team,
    ...(playerTeams !== undefined ? { playerTeams } : {}),
  };
}

export const useRunStore = create<RunStore>((set, get) => ({
  runs: [],
  currentRun: null,
  selectedZoneId: null,

  loadRuns: () => {
    const stored = getRuns();
    const runs = normalizeRuns(stored).map((run) => finalizeRun(run));
    // Persist runs whose state was fixed on load (e.g. Soul Link linked deaths)
    runs.forEach((run, index) => {
      if (JSON.stringify(run) !== JSON.stringify(stored[index])) saveRun(run);
    });
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

  updateRun: (inputRun) => {
    const updated = { ...finalizeRun(inputRun), updatedAt: Date.now() };
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
      // The link is broken for everyone once a partner lost the zone
      if (zone && isZoneLockedForPlayer(zone, playerIdx)) return;
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

    // Determine zone status from the whole set of captures in the zone
    // (relevant in Soul Link where several players share one zone)
    const determineZoneStatus = deriveZoneStatus;

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
        const nextCaptures = [...z.captures, capture];
        return {
          ...z,
          status: determineZoneStatus(nextCaptures, z.status),
          captures: nextCaptures,
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
          status: deriveZoneStatus(remaining, z.status),
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
