import { WebSocket } from "ws";
import { z } from "zod";
import type {
  JoinRoomOptions,
  RoomStatus,
  RunRecord,
} from "../src/lib/tracker/types";
import type { PokemonResolver } from "../src/lib/tracker/live";
import { receiveSharedRecord } from "../src/lib/tracker/records";
import { recordSchema, validationMessage } from "../src/lib/tracker/schema";
import { TrackerDatabase } from "./database";
import {
  applyRoomCommand,
  MAX_ROOM_MESSAGE_BYTES,
  normalizeRoomAddress,
  roomCommandSchema,
  serverMessageSchema,
  sharedCommand,
  type RoomCommand,
} from "./room-protocol";

export const savedClientSchema = z.object({
  address: z.string(),
  invitation: z.string(),
  playerId: z.string(),
  credential: z.string(),
  runId: z.string(),
  roomId: z.string(),
});

export class RoomClient {
  private socket?: WebSocket;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private inFlight?: string;
  private credentials?: z.infer<typeof savedClientSchema>;
  private reconnectDelay = 1000;
  private ready?: { resolve: () => void; reject: (error: Error) => void };
  private statusValue: RoomStatus;

  constructor(
    private readonly database: TrackerDatabase,
    private readonly options: JoinRoomOptions,
    private readonly resolvePokemon: PokemonResolver,
    private readonly onRecord: (record: RunRecord) => void,
    private readonly onStatus: (status: RoomStatus) => void,
  ) {
    this.options = {
      ...options,
      address: normalizeRoomAddress(options.address),
    };
    const saved =
      database.readSetting("room-client", savedClientSchema) ??
      database.readSetting(
        `credential-${this.options.address}-${options.playerId}`,
        savedClientSchema,
      );
    if (
      saved?.address === this.options.address &&
      saved.playerId === options.playerId
    )
      this.credentials = saved;
    this.statusValue = {
      mode: "joining",
      address: this.options.address,
      playerId: options.playerId,
      runId: this.credentials?.runId,
      participants: [],
      pendingCount: this.credentials
        ? database.pending(this.credentials.runId).length
        : 0,
    };
  }

  get status(): RoomStatus {
    return this.statusValue;
  }

  private updateStatus(changes: Partial<RoomStatus>): void {
    this.statusValue = { ...this.statusValue, ...changes };
    this.onStatus(this.statusValue);
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ready = undefined;
        this.stop();
        reject(
          new Error(
            "The room did not respond. Check its address, invitation and network connection.",
          ),
        );
      }, 10000);
      this.ready = {
        resolve: () => {
          clearTimeout(timeout);
          this.ready = undefined;
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.ready = undefined;
          this.stop();
          reject(error);
        },
      };
      this.connect();
    });
  }

  private connect(): void {
    if (this.stopped) return;
    const socket = new WebSocket(this.options.address, {
      maxPayload: MAX_ROOM_MESSAGE_BYTES,
      perMessageDeflate: false,
      handshakeTimeout: 8000,
    });
    this.socket = socket;
    socket.on("open", () =>
      socket.send(
        JSON.stringify({
          type: "join",
          protocolVersion: 1,
          playerId: this.options.playerId,
          invitation: this.options.invitation,
          ...(this.credentials
            ? { credential: this.credentials.credential }
            : {}),
        }),
      ),
    );
    socket.on("message", (data) => {
      try {
        const message = serverMessageSchema.parse(JSON.parse(data.toString()));
        switch (message.type) {
          case "welcome":
            if (
              this.credentials?.runId &&
              this.credentials.runId !== message.record.run.id &&
              this.database.pending(this.credentials.runId).length
            ) {
              throw new Error(
                "Unsent changes belong to another room. Preserve a local copy before joining.",
              );
            }
            this.credentials = {
              ...this.options,
              credential: message.credential,
              runId: message.record.run.id,
              roomId: message.roomId,
            };
            this.database.writeSetting("room-client", this.credentials);
            this.database.writeSetting(
              `credential-${this.options.address}-${this.options.playerId}`,
              this.credentials,
            );
            this.updateStatus({
              runId: message.record.run.id,
              participants: message.participants,
            });
            this.reconnectDelay = 1000;
            this.acceptRecord(message.record);
            this.ready?.resolve();
            break;
          case "record":
            this.acceptRecord(message.record, message.acknowledgement);
            break;
          case "presence":
            this.updateStatus({ participants: message.participants });
            break;
          case "error":
            this.inFlight = undefined;
            if (this.ready) this.ready.reject(new Error(message.message));
            else
              this.updateStatus({ mode: "conflict", error: message.message });
            break;
        }
      } catch (error) {
        const message = validationMessage(error);
        if (this.ready) this.ready.reject(new Error(message));
        else {
          this.updateStatus({ mode: "conflict", error: message });
          socket.close(1002, "Invalid room state");
        }
      }
    });
    socket.on("error", (error) => {
      if (this.ready)
        this.ready.reject(
          new Error(`Could not connect to the room: ${error.message}`),
        );
      else
        this.updateStatus({
          error: `Connection interrupted: ${error.message}`,
        });
    });
    socket.on("close", () => {
      if (this.socket !== socket || this.stopped) return;
      this.inFlight = undefined;
      this.updateStatus({
        mode:
          this.statusValue.mode === "conflict" ? "conflict" : "disconnected",
        participants: this.statusValue.participants.map((participant) => ({
          ...participant,
          connected: false,
        })),
      });
      if (this.statusValue.mode === "conflict") return;
      this.retryTimer = setTimeout(() => this.connect(), this.reconnectDelay);
      this.retryTimer.unref();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
    });
  }

  private acceptRecord(
    authoritative: RunRecord,
    acknowledgedId?: string,
  ): void {
    const runId = this.credentials?.runId;
    if (!runId || authoritative.run.id !== runId)
      throw new Error("The server sent a different run.");
    const local = this.database.get(runId);
    const pending = this.database
      .pending(runId)
      .filter((message) => message.id !== acknowledgedId);
    let visible = receiveSharedRecord(authoritative, local);
    try {
      for (const message of pending) {
        visible = applyRoomCommand(
          visible,
          roomCommandSchema.parse(JSON.parse(message.payload)),
          this.options.playerId,
          this.resolvePokemon,
        );
      }
    } catch (error) {
      this.database.acknowledge(
        runId,
        acknowledgedId,
        local ?? visible,
        authoritative,
      );
      this.inFlight = undefined;
      this.updateStatus({
        mode: "conflict",
        pendingCount: pending.length,
        error: validationMessage(error),
      });
      return;
    }
    visible = {
      ...visible,
      revision: Math.max(visible.revision, (local?.revision ?? -1) + 1),
    };
    this.database.acknowledge(runId, acknowledgedId, visible, authoritative);
    if (this.inFlight === acknowledgedId) this.inFlight = undefined;
    this.onRecord(visible);
    this.updateStatus({
      mode: "connected",
      pendingCount: pending.length,
      error: undefined,
    });
    this.flush();
  }

  submit(command: RoomCommand): RunRecord {
    const runId = this.credentials?.runId;
    if (!runId) throw new Error("Join a room before changing its state.");
    const current = this.database.require(runId);
    const visible = applyRoomCommand(
      current,
      command,
      this.options.playerId,
      this.resolvePokemon,
    );
    const payload = sharedCommand(command);
    this.database.savePending(visible, {
      id: command.id,
      runId,
      payload: JSON.stringify(payload),
    });
    this.onRecord(visible);
    this.updateStatus({ pendingCount: this.database.pending(runId).length });
    this.flush();
    return visible;
  }

  private flush(): void {
    const runId = this.credentials?.runId;
    if (
      !runId ||
      this.inFlight ||
      this.statusValue.mode !== "connected" ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    const first = this.database.pending(runId)[0];
    if (!first) return;
    const command = roomCommandSchema.parse(JSON.parse(first.payload));
    this.inFlight = command.id;
    this.socket.send(JSON.stringify({ type: "command", command }));
  }

  authoritative(): RunRecord | undefined {
    return this.database.readSetting("room-authoritative", recordSchema);
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.terminate();
    this.socket = undefined;
  }
}
