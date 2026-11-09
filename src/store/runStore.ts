import { create } from "zustand";
import type {
  Run,
  Capture,
  RandomizerOptions,
  SoulLinkPlayer,
} from "@/lib/types";
import {
  getRecords,
  createStoredRecord,
  editStoredRun,
  deleteStoredRun,
  importStoredRecords,
} from "@/lib/storage";
import { getZonesForRegion } from "@/lib/zones";
import { shinyChanceGroup, soulLinkCaptureSlot } from "@/lib/zone-progress";
import { createRecord, newId } from "@/lib/tracker/records";
import { deriveZoneStatus } from "@/lib/tracker/run-rules";
import {
  getPlayerId,
  knowledgeForPlayer,
  saveKnowledgeView,
  viewRunForPlayer,
} from "@/lib/tracker/knowledge";
import { importAsCopies } from "@/lib/tracker/archive";
import { validationMessage } from "@/lib/tracker/schema";
import type { DesktopStatus, RunRecord } from "@/lib/tracker/types";

export { deriveZoneStatus, applySoulLinkDeaths } from "@/lib/tracker/run-rules";

interface CreateRunData {
  gameName: string;
  gameVersion?: Run["gameVersion"];
  region: string;
  isShinyHuntMode: boolean;
  isRandomMode: boolean;
  typeChartGeneration: Run["typeChartGeneration"];
  randomizerOptions?: RandomizerOptions;
  isSoulLinkMode?: boolean;
  soulLinkPlayers?: SoulLinkPlayer[];
  soulLinkTurnOrder?: boolean;
}

interface RunStore {
  records: RunRecord[];
  runs: Run[];
  currentRun: Run | null;
  selectedZoneId: string | null;
  playerByRun: Record<string, string>;
  loaded: boolean;
  pending: number;
  error: string | null;
  desktopStatus: DesktopStatus | null;
  loadRuns: () => Promise<void>;
  setCurrentRun: (run: Run | null) => void;
  setPlayer: (runId: string, playerId: string) => void;
  receiveRecord: (record: RunRecord) => void;
  receiveDeleted: (runId: string) => void;
  setDesktopStatus: (status: DesktopStatus) => void;
  reportError: (error: unknown) => void;
  clearError: () => void;
  createRun: (data: CreateRunData) => Promise<Run | undefined>;
  updateRun: (
    run: Run,
    before: Run,
    knowledgePlayerId?: string,
  ) => Promise<boolean>;
  canEditRun: (runId: string, playerId?: string) => boolean;
  deleteRun: (id: string) => Promise<boolean>;
  importRecords: (records: RunRecord[]) => Promise<RunRecord[] | undefined>;
  addCapture: (
    runId: string,
    zoneId: string,
    capture: Omit<Capture, "id" | "createdAt">,
    abilityPanel?: string[],
  ) => Promise<boolean>;
  removeCapture: (
    runId: string,
    zoneId: string,
    captureId: string,
  ) => Promise<boolean>;
  setSelectedZone: (zoneId: string | null) => void;
  updateTeam: (
    run: Run,
    team: Capture[],
    playerIndex?: number,
  ) => Promise<boolean>;
}

function projectRecords(
  records: RunRecord[],
  playerByRun: Record<string, string>,
): Run[] {
  return records.map(({ run }) =>
    viewRunForPlayer(run, playerByRun[run.id] ?? getPlayerId(run)),
  );
}

export const useRunStore = create<RunStore>((set, get) => {
  let loading: Promise<void> | undefined;

  function refresh(records: RunRecord[], playerByRun = get().playerByRun) {
    const runs = projectRecords(records, playerByRun);
    set({
      records,
      runs,
      playerByRun,
      currentRun: runs.find((run) => run.id === get().currentRun?.id) ?? null,
    });
  }

  async function perform<T>(
    operation: () => Promise<T>,
  ): Promise<T | undefined> {
    set((state) => ({ pending: state.pending + 1 }));
    try {
      return await operation();
    } catch (error) {
      get().reportError(error);
      return undefined;
    } finally {
      set((state) => ({ pending: state.pending - 1 }));
    }
  }

  return {
    records: [],
    runs: [],
    currentRun: null,
    selectedZoneId: null,
    playerByRun: {},
    loaded: false,
    pending: 0,
    error: null,
    desktopStatus: null,

    reportError: (error) => {
      console.error("Tracker operation failed:", error);
      set({ error: validationMessage(error) });
    },
    clearError: () => set({ error: null }),

    loadRuns: async () => {
      if (get().loaded) return;
      loading ??= (async () => {
        await perform(async () => {
          const records = await getRecords();
          for (const record of records) get().receiveRecord(record);
          if (window.nuztracker)
            get().setDesktopStatus(await window.nuztracker.getStatus());
          set({ loaded: true });
        });
      })();
      await loading;
      loading = undefined;
    },

    setCurrentRun: (run) =>
      set((state) => ({
        currentRun: run,
        selectedZoneId:
          state.currentRun?.id === run?.id ? state.selectedZoneId : null,
      })),

    setPlayer: (runId, playerId) =>
      refresh(get().records, { ...get().playerByRun, [runId]: playerId }),

    receiveRecord: (record) => {
      const current = get().records.find(
        (entry) => entry.run.id === record.run.id,
      );
      if (current && current.revision > record.revision) return;
      refresh(
        current
          ? get().records.map((entry) =>
              entry.run.id === record.run.id ? record : entry,
            )
          : [...get().records, record],
      );
    },

    receiveDeleted: (runId) =>
      refresh(get().records.filter((entry) => entry.run.id !== runId)),

    setDesktopStatus: (status) => {
      const previous = get().desktopStatus?.room;
      set({ desktopStatus: status });
      // Status updates stream continuously: only follow the room's own player when joining it,
      // so viewing another SoulLink player is not reverted.
      if (
        status.room.runId &&
        status.room.playerId &&
        (previous?.runId !== status.room.runId ||
          previous?.playerId !== status.room.playerId)
      ) {
        get().setPlayer(status.room.runId, status.room.playerId);
      }
    },

    createRun: (data) =>
      perform(async () => {
        if (!get().loaded)
          throw new Error(
            "Wait for local storage to finish loading before creating a run.",
          );
        const now = Date.now();
        const run: Run = {
          id: newId(),
          ...data,
          difficulty: "normal",
          status: "in-progress",
          zones: getZonesForRegion(data.region, data.gameVersion).map(
            (zone) => ({
              id: zone.id,
              zoneName: zone.zoneNames?.en ?? zone.regionArea ?? "Unknown",
              zoneNames: zone.zoneNames,
              regionArea: zone.regionArea,
              status: "not-visited",
              captures: [],
              updatedAt: now,
            }),
          ),
          team: [],
          ...(data.isSoulLinkMode ? { playerTeams: {} } : {}),
          createdAt: now,
          updatedAt: now,
        };
        const record = await createStoredRecord(createRecord(run));
        get().receiveRecord(record);
        return record.run;
      }),

    canEditRun: (runId, playerId) => {
      const room = get().desktopStatus?.room;
      return (
        !room ||
        room.runId !== runId ||
        room.mode === "offline" ||
        room.mode === "hosting" ||
        (playerId !== undefined && room.playerId === playerId)
      );
    },

    updateRun: async (input, before, knowledgePlayerId) =>
      Boolean(
        await perform(async () => {
          const record = get().records.find(
            (entry) => entry.run.id === input.id,
          );
          if (!record) throw new Error("The run could not be found.");
          if (before.id !== input.id)
            throw new Error("The edit baseline belongs to another run.");
          const playerId =
            knowledgePlayerId ??
            get().playerByRun[input.id] ??
            getPlayerId(input);
          const updated = await editStoredRun({
            id: newId(),
            runId: input.id,
            playerId,
            before: saveKnowledgeView(before, playerId),
            after: saveKnowledgeView(input, playerId),
          });
          get().receiveRecord(updated);
          return true;
        }),
      ),

    deleteRun: async (id) =>
      Boolean(
        await perform(async () => {
          await deleteStoredRun(id);
          get().receiveDeleted(id);
          return true;
        }),
      ),

    importRecords: (records) =>
      perform(async () => {
        const imported = await importStoredRecords(importAsCopies(records));
        for (const record of imported) get().receiveRecord(record);
        return imported;
      }),

    addCapture: async (runId, zoneId, data, abilityPanel) => {
      const run = get().runs.find((entry) => entry.id === runId);
      const zone = run?.zones.find((entry) => entry.id === zoneId);
      const fail = (message: string) => {
        get().reportError(new Error(message));
        return false;
      };
      if (!run || !zone)
        return fail("The run or encounter zone could not be found.");
      const index = data.playerIndex ?? 0;
      let shinyChance: true | undefined;
      if (run.isSoulLinkMode) {
        const slot = soulLinkCaptureSlot(
          zone,
          index,
          data.isShiny,
          run.isShinyHuntMode,
        );
        if (!slot)
          return fail(
            run.isShinyHuntMode
              ? "This player has no remaining capture slot here; only a shiny can still be kept if its second chance is open."
              : "This player already has a capture in this zone, or a linked loss has closed it.",
          );
        if (slot === "shiny") shinyChance = true;
      } else {
        if (zone.captures.length >= (run.isShinyHuntMode ? 2 : 1))
          return fail("This zone has no remaining capture slots.");
        if (
          zone.captures.length === 1 &&
          !zone.captures[0].isShiny &&
          !data.isShiny
        ) {
          return fail("The extra capture must be shiny.");
        }
      }
      const capture: Capture = {
        ...data,
        id: newId(),
        createdAt: Date.now(),
        ...(shinyChance
          ? { shinyChance, soulLinkGroupId: shinyChanceGroup(zone.id) }
          : {}),
      };
      const playerId = getPlayerId(run, index);
      const knowledge = knowledgeForPlayer(run, playerId);
      const nextKnowledge = {
        ...knowledge,
        ...(data.customTypes?.length
          ? {
              customTypesByPokemonId: {
                ...knowledge.customTypesByPokemonId,
                [data.pokemon.id]: data.customTypes,
              },
            }
          : {}),
        ...(abilityPanel?.length
          ? {
              customAbilitiesByPokemonId: {
                ...knowledge.customAbilitiesByPokemonId,
                [data.pokemon.id]: abilityPanel.slice(0, 3),
              },
            }
          : {}),
      };
      const updated: Run = {
        ...run,
        ...(run.playerKnowledge
          ? {
              playerKnowledge: {
                ...run.playerKnowledge,
                [playerId]: nextKnowledge,
              },
              ...((get().playerByRun[run.id] ?? getPlayerId(run)) === playerId
                ? nextKnowledge
                : {}),
            }
          : nextKnowledge),
        zones: run.zones.map((entry) =>
          entry.id === zoneId
            ? {
                ...entry,
                captures: [...entry.captures, capture],
                updatedAt: Date.now(),
              }
            : entry,
        ),
      };
      if (!capture.isDead) {
        if (run.isSoulLinkMode) {
          const team = run.playerTeams?.[index] ?? [];
          if (team.length < 6)
            updated.playerTeams = {
              ...run.playerTeams,
              [index]: [...team, capture],
            };
        } else if (run.team.length < 6) updated.team = [...run.team, capture];
      }
      return get().updateRun(updated, run);
    },

    removeCapture: async (runId, zoneId, captureId) => {
      const run = get().runs.find((entry) => entry.id === runId);
      if (!run) {
        get().reportError(new Error("The run could not be found."));
        return false;
      }
      return get().updateRun(
        {
          ...run,
          zones: run.zones.map((zone) => {
            if (zone.id !== zoneId) return zone;
            const captures = zone.captures.filter(
              (capture) => capture.id !== captureId,
            );
            return {
              ...zone,
              captures,
              status: deriveZoneStatus(captures, "not-visited"),
              updatedAt: Date.now(),
            };
          }),
          team: run.team.filter((capture) => capture.id !== captureId),
          ...(run.playerTeams
            ? {
                playerTeams: Object.fromEntries(
                  Object.entries(run.playerTeams).map(([index, team]) => [
                    index,
                    team.filter((capture) => capture.id !== captureId),
                  ]),
                ),
              }
            : {}),
        },
        run,
      );
    },

    setSelectedZone: (selectedZoneId) => set({ selectedZoneId }),

    updateTeam: async (run, team, index) => {
      return get().updateRun(
        run.isSoulLinkMode && index !== undefined
          ? { ...run, playerTeams: { ...run.playerTeams, [index]: team } }
          : { ...run, team },
        run,
      );
    },
  };
});
