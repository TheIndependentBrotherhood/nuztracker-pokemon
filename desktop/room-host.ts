import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http";
import {
  createServer as createHttpsServer,
  type Server as HttpsServer,
} from "node:https";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import type {
  HostRoomOptions,
  RoomParticipant,
  RoomStatus,
  RunRecord,
} from "../src/lib/tracker/types";
import { connectRun, type PokemonResolver } from "../src/lib/tracker/live";
import { getPlayerIndex } from "../src/lib/tracker/knowledge";
import { shareRecord } from "../src/lib/tracker/records";
import { validationMessage } from "../src/lib/tracker/schema";
import { TrackerDatabase } from "./database";
import {
  applyRoomCommand,
  clientMessageSchema,
  MAX_ROOM_MESSAGE_BYTES,
  joinInvitation,
  splitInvitation,
  type ServerMessage,
} from "./room-protocol";
import { roomTls, type RoomTls } from "./room-tls";

const credentialsSchema = z.object({
  roomId: z.string(),
  players: z.record(z.string(), z.string()),
});
const token = () => randomBytes(32).toString("base64url");
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function matches(value: string, expected: string): boolean {
  const encoded = Buffer.from(hash(value), "hex");
  const other = Buffer.from(expected, "hex");
  return encoded.length === other.length && timingSafeEqual(encoded, other);
}

const VIRTUAL_ADAPTER =
  /vethernet|hyper-v|virtualbox|vbox|vmware|wsl|docker|loopback|bluetooth/i;

function addressRank(address: string): number {
  const [a, b] = address.split(".").map(Number);
  if (a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31))
    return 0;
  // Carrier-grade NAT range used by Tailscale and similar VPNs.
  if (a === 100 && b >= 64 && b <= 127) return 1;
  return 2;
}

/** IPv4 addresses partners can reach, physical private LAN interfaces first. */
export function hostAddresses(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): string[] {
  const candidates = Object.entries(interfaces).flatMap(([name, entries]) =>
    (entries ?? [])
      .filter(
        (entry) =>
          (entry.family === "IPv4" || String(entry.family) === "4") &&
          !entry.internal &&
          !entry.address.startsWith("169.254."),
      )
      .map((entry) => ({
        address: entry.address,
        rank: (VIRTUAL_ADAPTER.test(name) ? 3 : 0) + addressRank(entry.address),
      })),
  );
  return [
    ...new Set(
      candidates
        .sort((left, right) => left.rank - right.rank)
        .map((entry) => entry.address),
    ),
  ];
}

export class RoomHost {
  private server?: HttpServer | HttpsServer;
  private fingerprint?: string;
  private readonly sockets: WebSocketServer;
  private readonly clients = new Map<
    WebSocket,
    { playerId?: string; alive: boolean }
  >();
  private readonly invitation = token();
  private readonly credentials: z.infer<typeof credentialsSchema>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private address = "";
  private addresses: string[] = [];
  private stopping = false;

  constructor(
    private readonly database: TrackerDatabase,
    private readonly options: HostRoomOptions,
    private readonly resolvePokemon: PokemonResolver,
    private readonly onRecord: (record: RunRecord) => void,
    private readonly onStatus: (status: RoomStatus) => void,
  ) {
    const record = database.require(options.runId);
    if (!record.run.isSoulLinkMode)
      throw new Error("Choose a SoulLink run before hosting a room.");
    getPlayerIndex(record.run, options.playerId);
    this.credentials = (!options.resetCredentials
      ? database.readSetting(`host-${options.runId}`, credentialsSchema)
      : undefined) ?? { roomId: token(), players: {} };
    database.writeSetting(`host-${options.runId}`, this.credentials);
    this.sockets = new WebSocketServer({
      noServer: true,
      maxPayload: MAX_ROOM_MESSAGE_BYTES,
      perMessageDeflate: false,
    });
    this.sockets.on("connection", (socket) => this.accept(socket));
  }

  private createServer(tls?: RoomTls): HttpServer | HttpsServer {
    const reject = (_request: IncomingMessage, response: ServerResponse) => {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end(
        "This server accepts authenticated tracker connections only.",
      );
    };
    const server = tls
      ? createHttpsServer({ key: tls.key, cert: tls.cert }, reject)
      : createHttpServer(reject);
    server.on("upgrade", (request, socket, head) => {
      if (
        request.url !== "/room" ||
        request.headers.origin ||
        this.clients.size >= 8
      ) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      this.sockets.handleUpgrade(request, socket, head, (client) =>
        this.sockets.emit("connection", client),
      );
    });
    return server;
  }

  get status(): RoomStatus {
    return {
      mode: "hosting",
      runId: this.options.runId,
      playerId: this.options.playerId,
      address: this.address,
      ...(this.addresses.length > 1 ? { addresses: this.addresses } : {}),
      invitation: joinInvitation(this.invitation, this.fingerprint),
      ...(this.options.secure ? { secure: true } : {}),
      participants: this.participants(),
      pendingCount: 0,
    };
  }

  async start(): Promise<void> {
    const tls = this.options.secure ? await roomTls(this.database) : undefined;
    this.fingerprint = tls?.fingerprint;
    const server = this.createServer(tls);
    this.server = server;
    const exposed = this.options.allowLan || Boolean(this.options.secure);
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error) => reject(error);
      server.once("error", failed);
      server.listen(
        this.options.port,
        exposed ? "0.0.0.0" : "127.0.0.1",
        () => {
          server.off("error", failed);
          resolve();
        },
      );
    });
    server.on("error", (error) =>
      this.onStatus({ ...this.status, error: error.message }),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Could not determine the room's listening port.");
    const lan = exposed ? hostAddresses() : [];
    const hosts = [
      ...(this.options.publicHost ? [this.options.publicHost] : []),
      ...lan.filter((host) => host !== this.options.publicHost),
    ];
    const scheme = tls ? "wss" : "ws";
    this.addresses = (hosts.length ? hosts : ["127.0.0.1"]).map(
      (host) => `${scheme}://${host}:${address.port}/room`,
    );
    this.address = this.addresses[0];
    const record = this.database.save(
      connectRun(
        this.database.require(this.options.runId),
        this.options.playerId,
      ),
      true,
    );
    this.onRecord(record);
    this.heartbeat = setInterval(() => {
      for (const [socket, client] of this.clients) {
        if (!client.alive) {
          socket.terminate();
          continue;
        }
        client.alive = false;
        socket.ping();
      }
    }, 15000);
    this.heartbeat.unref();
    this.onStatus(this.status);
  }

  private participants(): RoomParticipant[] {
    return (
      this.database.require(this.options.runId).run.soulLinkPlayers ?? []
    ).map((player) => ({
      playerId: player.id,
      name: player.name,
      connected:
        player.id === this.options.playerId ||
        [...this.clients.values()].some(
          (client) => client.playerId === player.id,
        ),
    }));
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > MAX_ROOM_MESSAGE_BYTES) {
      socket.close(1013, "The connection cannot keep up with room updates.");
      return;
    }
    socket.send(JSON.stringify(message));
  }

  private presence(): void {
    const participants = this.participants();
    for (const [socket, client] of this.clients) {
      if (client.playerId)
        this.send(socket, { type: "presence", participants });
    }
    this.onStatus(this.status);
  }

  private accept(socket: WebSocket): void {
    const client: { playerId?: string; alive: boolean } = { alive: true };
    this.clients.set(socket, client);
    const deadline = setTimeout(() => {
      if (!client.playerId) socket.close(1008, "Authentication required");
    }, 5000);
    deadline.unref();
    socket.on("pong", () => {
      client.alive = true;
    });
    socket.on("error", () => socket.terminate());
    socket.on("close", () => {
      clearTimeout(deadline);
      this.clients.delete(socket);
      if (!this.stopping && client.playerId) this.presence();
    });
    socket.on("message", (data) => {
      let commandId: string | undefined;
      try {
        if (!client.playerId && data.toString().length > 2000)
          throw new Error("Invalid authentication message.");
        const message = clientMessageSchema.parse(JSON.parse(data.toString()));
        if (message.type === "join") {
          if (client.playerId)
            throw new Error("This connection is already authenticated.");
          getPlayerIndex(
            this.database.require(this.options.runId).run,
            message.playerId,
          );
          if (message.playerId === this.options.playerId)
            throw new Error("The host's player slot is reserved.");
          const expected = this.credentials.players[message.playerId];
          const reconnecting = Boolean(
            expected &&
            message.credential &&
            matches(message.credential, expected),
          );
          if (
            !reconnecting &&
            (expected ||
              !matches(
                splitInvitation(message.invitation).token,
                hash(this.invitation),
              ))
          ) {
            throw new Error(
              "Invalid invitation or reserved player slot. The host can reset player credentials if recovery is needed.",
            );
          }
          if (
            [...this.clients.values()].some(
              (entry) => entry.playerId === message.playerId,
            )
          ) {
            throw new Error("This player is already connected.");
          }
          const credential =
            reconnecting && message.credential ? message.credential : token();
          this.credentials.players[message.playerId] = hash(credential);
          this.database.writeSetting(
            `host-${this.options.runId}`,
            this.credentials,
          );
          client.playerId = message.playerId;
          clearTimeout(deadline);
          this.send(socket, {
            type: "welcome",
            credential,
            roomId: this.credentials.roomId,
            record: shareRecord(this.database.require(this.options.runId)),
            participants: this.participants(),
          });
          this.presence();
          return;
        }
        commandId = message.command.id;
        if (!client.playerId)
          throw new Error("Authenticate before changing the run.");
        const record = applyRoomCommand(
          this.database.require(this.options.runId),
          message.command,
          client.playerId,
          this.resolvePokemon,
        );
        const saved = this.database.save(
          record,
          message.command.kind !== "frame",
        );
        this.onRecord(saved);
        this.publish(saved, socket, commandId);
      } catch (error) {
        this.send(socket, {
          type: "error",
          message: validationMessage(error),
          commandId,
        });
        if (!client.playerId) socket.close(1008, "Authentication failed");
      }
    });
  }

  publish(
    record: RunRecord,
    acknowledgedSocket?: WebSocket,
    acknowledgement?: string,
  ): void {
    for (const [socket, client] of this.clients) {
      if (client.playerId)
        this.send(socket, {
          type: "record",
          record: shareRecord(record),
          ...(socket === acknowledgedSocket && acknowledgement
            ? { acknowledgement }
            : {}),
        });
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const socket of this.clients.keys()) socket.terminate();
    await new Promise<void>((resolve) => this.sockets.close(() => resolve()));
    if (this.server?.listening) {
      const server = this.server;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }
}
