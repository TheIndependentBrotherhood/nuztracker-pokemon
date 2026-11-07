import { randomBytes } from "node:crypto";
import { basename } from "node:path";
import { z } from "zod";
import type {
  DesktopEvent,
  DesktopStatus,
  GameFrame,
  HostRoomOptions,
  JoinRoomOptions,
  LinkPokemonInput,
  MapZoneInput,
  RunEdit,
  RunRecord,
  RoomStatus,
} from "../src/lib/tracker/types";
import {
  bindBridgeSchema,
  connectMelonDsSchema,
  hostRoomSchema,
  joinRoomSchema,
  linkPokemonSchema,
  mapZoneSchema,
  recordSchema,
  runEditSchema,
  validationMessage,
} from "../src/lib/tracker/schema";
import {
  connectRun,
  materiallyChanged,
  type PokemonResolver,
} from "../src/lib/tracker/live";
import { newId, receiveSharedRecord } from "../src/lib/tracker/records";
import { importAsCopies } from "../src/lib/tracker/archive";
import { TrackerDatabase } from "./database";
import { RoomHost } from "./room-host";
import { RoomClient, savedClientSchema } from "./room-client";
import { applyRoomCommand, type RoomCommand } from "./room-protocol";
import { NdsRom } from "./nds-rom";
import { MelonDsConnector } from "./platinum-reader";
import { closeSharedGdbClients } from "./gdb-client";

const melonRomSchema = z.object({
  path: z.string(),
  romName: z.string(),
  gameCode: z.string(),
  revision: z.number().int(),
});

const offline = (): RoomStatus => ({
  mode: "offline",
  participants: [],
  pendingCount: 0,
});

export class TrackerService {
  private host?: RoomHost;
  private client?: RoomClient;
  private readonly listeners = new Set<(event: DesktopEvent) => void>();
  private statusValue: DesktopStatus;
  private latestBridgeFrame?: GameFrame;
  private melonDs?: MelonDsConnector;
  private stopping = false;

  constructor(
    readonly database: TrackerDatabase,
    private readonly resolvePokemon: PokemonResolver,
    private readonly platinumMaps: string[] = [],
  ) {
    const token =
      database.readSetting("bridge-token", z.string().min(32)) ??
      randomBytes(32).toString("base64url");
    database.writeSetting("bridge-token", token);
    const binding = database.readSetting("bridge-binding", bindBridgeSchema);
    const melonRom = database.readSetting("melonds-rom", melonRomSchema);
    this.statusValue = {
      room: offline(),
      bridge: {
        url: "",
        token,
        ...(binding && database.get(binding.runId) ? binding : {}),
      },
      storagePath: database.path,
      ...(melonRom ? { melonDs: {
        romName: melonRom.romName, gameCode: melonRom.gameCode,
        revision: melonRom.revision, state: "disconnected", attached: false,
      } as const } : {}),
    };
  }

  get status(): DesktopStatus {
    return structuredClone(this.statusValue);
  }

  subscribe(listener: (event: DesktopEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: DesktopEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private changed = (record: RunRecord): void => {
    this.emit({ type: "record", record });
  };

  private roomChanged = (room: RoomStatus): void => {
    this.statusValue.room = room;
    this.emit({ type: "status", status: this.status });
  };

  setBridgeUrl(url: string): void {
    this.statusValue.bridge.url = url;
    this.emit({ type: "status", status: this.status });
  }

  reportBridgeError(error: unknown): void {
    this.statusValue.bridge.error = validationMessage(error);
    this.emit({ type: "status", status: this.status });
  }

  private execute(
    runId: string,
    playerId: string,
    command: RoomCommand,
  ): RunRecord {
    if (this.client?.status.runId === runId) {
      if (playerId !== this.client.status.playerId)
        throw new Error("Only your assigned SoulLink player can be edited.");
      return this.client.submit(command);
    }
    const record = applyRoomCommand(
      this.database.require(runId),
      command,
      playerId,
      this.resolvePokemon,
      false,
    );
    const saved = this.database.save(record, command.kind !== "frame");
    this.changed(saved);
    if (this.host?.status.runId === runId) this.host.publish(saved);
    return saved;
  }

  listRuns(): RunRecord[] {
    return this.database.list();
  }

  createRun(raw: RunRecord): RunRecord {
    const [record] = this.database.add([recordSchema.parse(raw)]);
    this.changed(record);
    return record;
  }

  editRun(raw: RunEdit): RunRecord {
    const edit = runEditSchema.parse(raw);
    return this.execute(edit.runId, edit.playerId, {
      kind: "edit",
      id: edit.id,
      edit,
    });
  }

  importRuns(raw: RunRecord[]): RunRecord[] {
    const records = this.database.add(
      z.array(recordSchema).min(1).max(1000).parse(raw),
    );
    for (const record of records) this.changed(record);
    return records;
  }

  deleteRun(runId: string): void {
    if (this.melonDs && this.statusValue.bridge.runId === runId)
      throw new Error("Disconnect MelonDS before deleting this run.");
    if (this.statusValue.room.runId === runId)
      throw new Error("Leave the room before deleting this run.");
    this.database.delete(runId);
    if (this.statusValue.bridge.runId === runId) {
      this.database.removeSetting("bridge-binding");
      this.statusValue.bridge = {
        url: this.statusValue.bridge.url,
        token: this.statusValue.bridge.token,
      };
      this.emit({ type: "status", status: this.status });
    }
    this.emit({ type: "deleted", runId });
  }

  async hostRoom(raw: HostRoomOptions): Promise<DesktopStatus> {
    const options = hostRoomSchema.parse(raw);
    if (this.host || this.client)
      throw new Error("Leave the current room before hosting another one.");
    const host = new RoomHost(
      this.database,
      options,
      this.resolvePokemon,
      this.changed,
      this.roomChanged,
    );
    try {
      await host.start();
      this.host = host;
    } catch (error) {
      await host.stop();
      throw error;
    }
    return this.status;
  }

  async joinRoom(raw: JoinRoomOptions): Promise<DesktopStatus> {
    const options = joinRoomSchema.parse(raw);
    if (this.host || this.client)
      throw new Error("Leave the current room before joining another one.");
    const client = new RoomClient(
      this.database,
      options,
      this.resolvePokemon,
      this.changed,
      this.roomChanged,
    );
    this.client = client;
    try {
      await client.start();
    } catch (error) {
      client.stop();
      this.client = undefined;
      this.roomChanged(offline());
      throw error;
    }
    return this.status;
  }

  async restoreConnection(): Promise<void> {
    const saved = this.database.readSetting("room-client", savedClientSchema);
    if (!saved) return;
    const client = new RoomClient(
      this.database,
      saved,
      this.resolvePokemon,
      this.changed,
      this.roomChanged,
    );
    this.client = client;
    try {
      await client.start();
    } catch (error) {
      this.roomChanged({
        mode: "disconnected",
        playerId: saved.playerId,
        runId: saved.runId,
        address: saved.address,
        participants: [],
        pendingCount: this.database.pending(saved.runId).length,
        error: `The previous room is unavailable. Local tracking remains active. ${validationMessage(error)}`,
      });
    }
  }

  async leaveRoom(): Promise<DesktopStatus> {
    if (this.host) {
      await this.host.stop();
      this.host = undefined;
    }
    if (this.client) {
      this.client.stop();
      const runId = this.client.status.runId;
      if (runId && this.database.pending(runId).length) {
        const current = this.database.require(runId);
        const [copy] = importAsCopies([current]);
        copy.run.gameName = `${current.run.gameName} (offline copy)`.slice(
          0,
          500,
        );
        this.database.add([copy]);
        this.changed(copy);
        if (
          this.statusValue.bridge.runId === runId &&
          this.statusValue.bridge.playerId
        ) {
          const binding = {
            runId: copy.run.id,
            playerId: this.statusValue.bridge.playerId,
          };
          this.database.writeSetting("bridge-binding", binding);
          this.statusValue.bridge = { ...this.statusValue.bridge, ...binding };
        }
        const authoritative = this.client.authoritative();
        if (authoritative) {
          const restored = {
            ...receiveSharedRecord(authoritative, current),
            revision: current.revision + 1,
          };
          this.database.acknowledge(runId, undefined, restored, authoritative);
          this.changed(restored);
        }
        this.database.clearPending(runId);
        this.emit({
          type: "error",
          message:
            "Unsent changes were preserved in a new offline copy. The original run keeps the last shared checkpoint.",
        });
      }
      this.client = undefined;
      this.database.removeSetting("room-client");
      this.database.removeSetting("room-authoritative");
    }
    this.roomChanged(offline());
    return this.status;
  }

  async reconnectRoom(): Promise<DesktopStatus> {
    const saved = this.database.readSetting("room-client", savedClientSchema);
    if (!saved || this.host)
      throw new Error("There is no previous player connection to resume.");
    this.client?.stop();
    this.client = undefined;
    await this.restoreConnection();
    return this.status;
  }

  bindBridge(raw: { runId: string; playerId: string }): DesktopStatus {
    if (this.melonDs)
      throw new Error("Disconnect the MelonDS reader before binding another connector.");
    const binding = bindBridgeSchema.parse(raw);
    const room = this.statusValue.room;
    if (room.runId === binding.runId && room.playerId !== binding.playerId) {
      throw new Error("Connect the emulator to your own SoulLink player.");
    }
    const record = connectRun(
      this.database.require(binding.runId),
      binding.playerId,
    );
    this.database.save(record, true);
    this.database.writeSetting("bridge-binding", binding);
    this.statusValue.bridge = {
      url: this.statusValue.bridge.url,
      token: this.statusValue.bridge.token,
      ...binding,
    };
    this.latestBridgeFrame = undefined;
    this.changed(record);
    this.emit({ type: "status", status: this.status });
    return this.status;
  }

  async selectMelonDsRom(path: string): Promise<void> {
    if (this.stopping) throw new Error("The tracker is shutting down.");
    if (this.melonDs) throw new Error("Disconnect MelonDS before selecting another ROM.");
    const rom = await NdsRom.open(path);
    try {
      if (this.stopping) throw new Error("The tracker is shutting down.");
      if (this.melonDs) throw new Error("Disconnect MelonDS before selecting another ROM.");
      const metadata = { romName: basename(path), gameCode: rom.gameCode, revision: rom.revision };
      this.database.writeSetting("melonds-rom", { path, ...metadata });
      this.statusValue.melonDs = { ...metadata, state: "disconnected", attached: false };
      this.emit({ type: "status", status: this.status });
    } finally { await rom.close(); }
  }

  async connectMelonDs(raw: z.infer<typeof connectMelonDsSchema>): Promise<DesktopStatus> {
    if (this.stopping) throw new Error("The tracker is shutting down.");
    const input = connectMelonDsSchema.parse(raw);
    if (this.melonDs) throw new Error("Disconnect the current MelonDS reader first.");
    if (this.database.require(input.runId).run.gameVersion !== "platinum")
      throw new Error("Select Platinum as this run's game version before connecting.");
    const rom = this.database.readSetting("melonds-rom", melonRomSchema);
    if (!rom) throw new Error("Select the ROM currently loaded in MelonDS first.");
    this.bindBridge(input);
    const connector = new MelonDsConnector();
    this.melonDs = connector;
    this.statusValue.melonDs = {
      romName: rom.romName, gameCode: rom.gameCode, revision: rom.revision,
      port: input.port, state: "waiting", attached: true,
    };
    this.emit({ type: "status", status: this.status });
    try {
      await connector.start(rom.path, input.port, this.platinumMaps, (frame, layout) => {
        if (this.melonDs !== connector) return;
        if (this.statusValue.bridge.runId !== input.runId || this.statusValue.bridge.playerId !== input.playerId)
          throw new Error("The tracker binding changed. Disconnect and reconnect MelonDS.");
        this.ingest(frame, "melonds");
        this.statusValue.melonDs = { ...this.statusValue.melonDs!, state: "tracking", layout };
        this.emit({ type: "status", status: this.status });
      }, (error, disconnected) => {
        if (this.melonDs !== connector) return;
        this.statusValue.melonDs = { ...this.statusValue.melonDs!, state: disconnected ? "disconnected" : "waiting" };
        this.reportBridgeError(error);
      });
      return this.status;
    } catch (error) {
      if (this.melonDs === connector) {
        await this.disconnectMelonDs();
        this.reportBridgeError(error);
      }
      throw error;
    }
  }

  async disconnectMelonDs(): Promise<DesktopStatus> {
    const connector = this.melonDs;
    await connector?.stop();
    if (this.melonDs !== connector) return this.status;
    this.melonDs = undefined;
    if (this.statusValue.melonDs) {
      this.statusValue.melonDs.state = "disconnected";
      this.statusValue.melonDs.attached = false;
    }
    this.statusValue.bridge.lastSeenAt = undefined;
    this.statusValue.bridge.error = undefined;
    this.emit({ type: "status", status: this.status });
    return this.status;
  }

  ingest(frame: GameFrame, source: "http" | "melonds" = "http"): RunRecord {
    if (this.melonDs && source !== "melonds")
      throw new Error("Stop the MelonDS reader before using an external connector.");
    const { runId, playerId } = this.statusValue.bridge;
    if (!runId || !playerId)
      throw new Error(
        "Select a run and player in NuzTracker before starting the connector.",
      );
    const current = this.database.require(runId);
    const tracking = current.tracking[playerId];
    const previous = this.latestBridgeFrame ?? tracking?.latest;
    if (
      tracking?.retiredSessions.includes(frame.sessionId) ||
      (previous?.sessionId === frame.sessionId &&
        frame.sequence <= previous.sequence)
    )
      return current;
    const observed =
      previous && frame.frame < previous.frame
        ? { ...frame, stateLoaded: true }
        : frame;
    let record = current;
    if (materiallyChanged(tracking?.latest, observed)) {
      record = this.execute(runId, playerId, {
        id: newId(),
        kind: "frame",
        frame: observed,
      });
    }
    this.latestBridgeFrame = structuredClone(observed);
    this.statusValue.bridge.lastSeenAt = Date.now();
    this.statusValue.bridge.error = undefined;
    this.emit({ type: "status", status: this.status });
    return record;
  }

  linkPokemon(raw: LinkPokemonInput): RunRecord {
    const input = linkPokemonSchema.parse(raw);
    return this.execute(input.runId, input.playerId, {
      id: newId(),
      kind: "link",
      input,
    });
  }

  mapZone(raw: MapZoneInput): RunRecord {
    const input = mapZoneSchema.parse(raw);
    return this.execute(input.runId, input.playerId, { id: newId(), kind: "map-zone", input });
  }

  resumeTracking(raw: { runId: string; playerId: string }): RunRecord {
    const input = bindBridgeSchema.parse(raw);
    return this.execute(input.runId, input.playerId, {
      id: newId(),
      kind: "resume",
    });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    await this.disconnectMelonDs();
    closeSharedGdbClients();
    this.client?.stop();
    if (this.host) await this.host.stop();
    this.listeners.clear();
  }
}
