import { contextBridge, ipcRenderer } from "electron";
import { z } from "zod";
import {
  desktopEventSchema,
  desktopStatusSchema,
  recordSchema,
} from "../src/lib/tracker/schema";
import type { TrackerDesktopApi } from "../src/lib/tracker/types";
import { overlayControlConfigSchema, overlayControlSchema } from "../src/lib/tracker/overlay-control";

async function request<T>(
  method: string,
  schema: z.ZodType<T>,
  input?: unknown,
): Promise<T> {
  const result: unknown = await ipcRenderer.invoke(
    `nuztracker:${method}`,
    input,
  );
  return schema.parse(result);
}

const api: TrackerDesktopApi = {
  listRuns: () => request("listRuns", z.array(recordSchema)),
  createRun: (input) => request("createRun", recordSchema, input),
  editRun: (input) => request("editRun", recordSchema, input),
  deleteRun: (input) => request("deleteRun", z.void(), input),
  importRuns: (input) => request("importRuns", z.array(recordSchema), input),
  getStatus: () => request("getStatus", desktopStatusSchema),
  hostRoom: (input) => request("hostRoom", desktopStatusSchema, input),
  joinRoom: (input) => request("joinRoom", desktopStatusSchema, input),
  reconnectRoom: () => request("reconnectRoom", desktopStatusSchema),
  leaveRoom: () => request("leaveRoom", desktopStatusSchema),
  bindBridge: (input) => request("bindBridge", desktopStatusSchema, input),
  saveConnector: () => request("saveConnector", z.boolean()),
  selectMelonDsRom: () => request("selectMelonDsRom", z.boolean()),
  connectMelonDs: (input) => request("connectMelonDs", desktopStatusSchema, input),
  disconnectMelonDs: () => request("disconnectMelonDs", desktopStatusSchema),
  linkPokemon: (input) => request("linkPokemon", recordSchema, input),
  mapZone: (input) => request("mapZone", recordSchema, input),
  resumeTracking: (input) => request("resumeTracking", recordSchema, input),
  openCompact: (input) => request("openCompact", z.void(), input),
  getOverlayUrl: (input) => request("getOverlayUrl", z.string(), input),
  getOverlayControlConfig: (input) => request("getOverlayControlConfig", overlayControlConfigSchema, input),
  getOverlayControl: (input) => request("getOverlayControl", overlayControlSchema, input),
  commandOverlay: (input) => request("commandOverlay", overlayControlSchema, input),
  subscribe: (listener) => {
    const receive = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const parsed = desktopEventSchema.safeParse(payload);
      listener(
        parsed.success
          ? parsed.data
          : {
              type: "error",
              message:
                "The desktop service sent invalid data. Reload the application.",
            },
      );
    };
    ipcRenderer.on("nuztracker:event", receive);
    return () => ipcRenderer.removeListener("nuztracker:event", receive);
  },
};

contextBridge.exposeInMainWorld("nuztracker", api);
