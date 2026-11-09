import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  session,
  shell,
} from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  bindBridgeSchema,
  connectMelonDsSchema,
  hostRoomSchema,
  joinRoomSchema,
  linkPokemonSchema,
  mapZoneSchema,
  pokemonSchema,
  recordSchema,
  runEditSchema,
  validationMessage,
} from "../src/lib/tracker/schema";
import { TrackerDatabase } from "./database";
import { TrackerService } from "./service";
import { LocalServer } from "./local-server";
import { overlayCommandSchema } from "../src/lib/tracker/overlay-control";

if (process.env.NUZTRACKER_DATA_DIR)
  app.setPath("userData", process.env.NUZTRACKER_DATA_DIR);

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

let database: TrackerDatabase | undefined;
let service: TrackerService | undefined;
let localServer: LocalServer | undefined;
let mainWindow: BrowserWindow | undefined;
let shuttingDown = false;
const compactWindows = new Map<string, BrowserWindow>();
// Windows and Linux draw their caption buttons over the page, beside NuzTracker's own title bar.
const customTitleBar = process.platform !== "darwin";
const titleBarWindows = new WeakSet<BrowserWindow>();
const COMPACT_ON_TOP_SETTING = "compact-always-on-top";

function windowState(window: BrowserWindow | null) {
  return {
    alwaysOnTop: Boolean(window?.isAlwaysOnTop()),
    titleBar: Boolean(window && titleBarWindows.has(window)),
  };
}

function openWindow(path: string, compact = false): BrowserWindow {
  if (!localServer) throw new Error("The local server is not ready.");
  const origin = localServer.origin;
  const window = new BrowserWindow({
    width: compact ? 420 : 1400,
    height: compact ? 570 : 960,
    minWidth: compact ? 340 : 900,
    minHeight: compact ? 400 : 500,
    title: "NuzTracker",
    backgroundColor: "#fffef0",
    autoHideMenuBar: true,
    ...(compact && customTitleBar
      ? {
          titleBarStyle: "hidden" as const,
          titleBarOverlay: {
            color: "#0b1218",
            symbolColor: "#edf4fa",
            height: 32,
          },
        }
      : {}),
    show: process.env.NUZTRACKER_SMOKE_TEST !== "1",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (compact && customTitleBar) titleBarWindows.add(window);
  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url);
    if (target.protocol === "https:" || target.protocol === "http:") {
      void shell
        .openExternal(url)
        .catch((error: unknown) =>
          dialog.showErrorBox(
            "Could not open the link",
            validationMessage(error),
          ),
        );
    }
    return { action: "deny" };
  });
  void window
    .loadURL(`${origin}${path}`)
    .catch((error: unknown) =>
      dialog.showErrorBox(
        "Could not open NuzTracker",
        validationMessage(error),
      ),
    );
  return window;
}

async function initialize(): Promise<void> {
  const root = app.getAppPath();
  const reference = z
    .object({ pokemon: z.array(pokemonSchema) })
    .parse(
      JSON.parse(
        await readFile(join(root, "out", "data", "pokemon-list.json"), "utf8"),
      ),
    );
  const pokemon = new Map(reference.pokemon.map((entry) => [entry.id, entry]));
  database = new TrackerDatabase(
    join(app.getPath("userData"), "tracker.sqlite"),
  );
  const platinumMaps = z
    .array(z.string())
    .parse(
      JSON.parse(
        await readFile(join(root, "out", "data", "platinum-maps.json"), "utf8"),
      ),
    );
  const tracker = new TrackerService(
    database,
    (id) => pokemon.get(id),
    platinumMaps,
  );
  service = tracker;
  const server = new LocalServer(tracker, join(root, "out"));
  localServer = server;
  const savedPort = database.readSetting(
    "local-port",
    z.number().int().min(1).max(65535),
  );
  await server.start(savedPort);
  database.writeSetting("local-port", Number(new URL(server.origin).port));
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );

  function handle<T>(
    method: string,
    schema: z.ZodType<T>,
    action: (input: T, window: BrowserWindow | null) => unknown,
  ) {
    ipcMain.handle(`nuztracker:${method}`, (event, input: unknown) => {
      if (
        !event.senderFrame ||
        new URL(event.senderFrame.url).origin !== server.origin
      ) {
        throw new Error(
          "Desktop commands are only available to the local NuzTracker interface.",
        );
      }
      return action(
        schema.parse(input),
        BrowserWindow.fromWebContents(event.sender),
      );
    });
  }

  const runId = z
    .string()
    .min(1)
    .max(200)
    .regex(/^[\w:.-]+$/);
  handle("listRuns", z.undefined(), () => tracker.listRuns());
  handle("createRun", recordSchema, (record) => tracker.createRun(record));
  handle("editRun", runEditSchema, (edit) => tracker.editRun(edit));
  handle("deleteRun", runId, (id) => tracker.deleteRun(id));
  handle("importRuns", z.array(recordSchema), (records) =>
    tracker.importRuns(records),
  );
  handle("getStatus", z.undefined(), () => tracker.status);
  handle("hostRoom", hostRoomSchema, (options) => tracker.hostRoom(options));
  handle("joinRoom", joinRoomSchema, (options) => tracker.joinRoom(options));
  handle("reconnectRoom", z.undefined(), () => tracker.reconnectRoom());
  handle("leaveRoom", z.undefined(), () => tracker.leaveRoom());
  handle("bindBridge", bindBridgeSchema, (input) => tracker.bindBridge(input));
  handle("selectMelonDsRom", z.undefined(), async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select the exact ROM loaded in MelonDS",
      properties: ["openFile"],
      filters: [{ name: "Nintendo DS ROM", extensions: ["nds"] }],
    });
    if (canceled || !filePaths[0]) return false;
    await tracker.selectMelonDsRom(filePaths[0]);
    return true;
  });
  handle("connectMelonDs", connectMelonDsSchema, (input) =>
    tracker.connectMelonDs(input),
  );
  handle("disconnectMelonDs", z.undefined(), () => tracker.disconnectMelonDs());
  handle("linkPokemon", linkPokemonSchema, (input) =>
    tracker.linkPokemon(input),
  );
  handle("mapZone", mapZoneSchema, (input) => tracker.mapZone(input));
  handle("resumeTracking", bindBridgeSchema, (input) =>
    tracker.resumeTracking(input),
  );
  handle("getOverlayUrl", runId, (id) => server.overlayUrl(id));
  handle("copyText", z.string().max(10000), (text) =>
    clipboard.writeText(text),
  );
  handle("getOverlayControlConfig", runId, (id) => server.controlConfig(id));
  handle("getOverlayControl", runId, (id) => server.controlState(id));
  handle(
    "commandOverlay",
    z.object({ runId, command: overlayCommandSchema }).strict(),
    (input) => server.commandOverlay(input.runId, input.command),
  );
  handle("openCompact", runId, (id) => {
    tracker.database.require(id);
    const existing = compactWindows.get(id);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return;
    }
    const window = openWindow(`/compact/?id=${encodeURIComponent(id)}`, true);
    compactWindows.set(id, window);
    window.on("closed", () => compactWindows.delete(id));
    if (database?.readSetting(COMPACT_ON_TOP_SETTING, z.boolean()))
      window.setAlwaysOnTop(true, "floating");
  });
  handle("getWindowState", z.undefined(), (_input, window) =>
    windowState(window),
  );
  handle("setAlwaysOnTop", z.boolean(), (value, window) => {
    if (!window) throw new Error("This window is no longer available.");
    window.setAlwaysOnTop(value, "floating");
    if ([...compactWindows.values()].includes(window))
      database?.writeSetting(COMPACT_ON_TOP_SETTING, value);
    return windowState(window);
  });
  handle("saveConnector", z.undefined(), async () => {
    if (!tracker.status.bridge.runId)
      throw new Error("Connect a run before saving the emulator script.");
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save the BizHawk FireRed connector",
      defaultPath: "NuzTracker-FireRed.lua",
      filters: [{ name: "Lua script", extensions: ["lua"] }],
    });
    if (canceled || !filePath) return false;
    const template = await readFile(
      join(root, "connectors", "bizhawk-firered.lua"),
      "utf8",
    );
    const content = template
      .replace('"__BRIDGE_URL__"', JSON.stringify(tracker.status.bridge.url))
      .replace(
        '"__BRIDGE_TOKEN__"',
        JSON.stringify(tracker.status.bridge.token),
      );
    await writeFile(filePath, content, { encoding: "utf8", mode: 0o600 });
    return true;
  });

  tracker.subscribe((event) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed())
        window.webContents.send("nuztracker:event", event);
    }
  });
  mainWindow = openWindow("/");
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
  if (process.env.NUZTRACKER_SMOKE_TEST === "1") {
    mainWindow.webContents.once("did-finish-load", () => {
      void (async () => {
        const result: unknown = await mainWindow?.webContents.executeJavaScript(
          "Promise.all([window.nuztracker.listRuns(), window.nuztracker.getStatus()]).then(([runs, status]) => ({ runs: runs.length, localStorage: status.storagePath.endsWith('tracker.sqlite'), isolated: typeof require === 'undefined' }))",
        );
        const checked = z
          .object({
            runs: z.number(),
            localStorage: z.literal(true),
            isolated: z.literal(true),
          })
          .parse(result);
        console.log("NuzTracker desktop smoke test:", JSON.stringify(checked));
        await writeFile(
          join(app.getPath("userData"), "smoke-test.json"),
          JSON.stringify(checked),
          "utf8",
        );
        app.quit();
      })().catch((error: unknown) => {
        console.error("Desktop smoke test failed:", validationMessage(error));
        app.exit(1);
      });
    });
  } else {
    void tracker
      .restoreConnection()
      .catch((error: unknown) =>
        dialog.showErrorBox(
          "Could not restore the room",
          validationMessage(error),
        ),
      );
  }
}

app.on("second-instance", () => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.focus();
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  void (async () => {
    await service?.stop();
    await localServer?.stop();
    database?.close();
    app.quit();
  })().catch((error: unknown) => {
    console.error("Could not close local services:", validationMessage(error));
    app.exit(1);
  });
});

if (hasLock) {
  void app
    .whenReady()
    .then(initialize)
    .catch((error: unknown) => {
      console.error("Could not start NuzTracker:", validationMessage(error));
      if (process.env.NUZTRACKER_SMOKE_TEST !== "1")
        dialog.showErrorBox(
          "Could not start NuzTracker",
          validationMessage(error),
        );
      app.exit(1);
    });
}
