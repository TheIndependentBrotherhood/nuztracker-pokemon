import { createConnection, type Socket } from "node:net";

const frame = (payload: string) => {
  const checksum = [...payload].reduce((sum, char) => sum + char.charCodeAt(0), 0) & 255;
  return `$${payload}#${checksum.toString(16).padStart(2, "0")}`;
};

const unanswered = () =>
  new Error(
    "MelonDS accepted the connection but its debugger is not answering. Make sure the game is running and not paused. MelonDS only accepts one debugger connection until System > Reset or a restart: if NuzTracker was restarted or another debugger was attached, save your game, then reset or restart MelonDS.",
  );
const timedOut = () =>
  new Error(
    "MelonDS did not answer in time. Make sure the game is running and not paused; the connection is kept and reading resumes automatically.",
  );
const stillWaiting = () =>
  new Error("Still waiting for MelonDS to answer. Make sure the game is running and not paused.");

function deadline<T>(
  promise: Promise<T>,
  ms: number,
  timeout: () => Error,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (action: () => void) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      action();
    };
    const abort = () => settle(() => reject(new Error("The MelonDS connection was cancelled.")));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => settle(() => reject(timeout())), ms);
    promise.then(
      (value) => settle(() => resolve(value)),
      (error: unknown) => settle(() => reject(error)),
    );
  });
}

interface Pending {
  reply: boolean;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
  stale?: boolean;
}

const shared = new Map<number, ReadOnlyGdbClient>();

// MelonDS 1.1 never notices a closed debugger connection: its single slot stays busy until
// System > Reset or a restart. NuzTracker therefore keeps one connection per port for its lifetime.
export function sharedGdbClient(port: number): ReadOnlyGdbClient {
  let client = shared.get(port);
  if (!client) {
    client = new ReadOnlyGdbClient();
    shared.set(port, client);
  }
  return client;
}

export function closeSharedGdbClients(): void {
  for (const client of shared.values()) client.close();
  shared.clear();
}

export class ReadOnlyGdbClient {
  private socket?: Socket;
  private port?: number;
  private ready?: Promise<void>;
  private isReady = false;
  private buffer = "";
  private noAck = false;
  private probingAck = false;
  private readChunkSize = 512;
  private pending?: Pending;
  private readonly readTimeoutMs: number;

  constructor(options: { readTimeoutMs?: number } = {}) {
    this.readTimeoutMs = options.readTimeoutMs ?? 3000;
  }

  get isConnected(): boolean {
    return Boolean(this.socket && !this.socket.destroyed);
  }

  // Joins the connection that is already open or being negotiated instead of abandoning it.
  connect(port: number, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<void> {
    if (this.socket && this.port !== port)
      return Promise.reject(
        new Error(`NuzTracker is already connected to MelonDS on port ${this.port}.`),
      );
    let ready = this.ready;
    if (!this.socket || !ready) {
      this.port = port;
      ready = this.open(port);
      ready.catch(() => undefined);
      this.ready = ready;
    }
    return deadline(ready, options.timeoutMs ?? 5000, unanswered, options.signal);
  }

  private async open(port: number): Promise<void> {
    const socket = createConnection({ host: "127.0.0.1", port });
    this.socket = socket;
    socket.setNoDelay(true);
    socket.setEncoding("ascii");
    socket.on("data", (data: string) => {
      if (this.socket === socket) this.receive(data);
    });
    socket.on("error", (error) => {
      if (this.socket === socket) this.fail(error);
    });
    socket.on("close", () => {
      if (this.socket === socket)
        this.fail(
          new Error(
            "MelonDS closed the GDB connection. Connect again once the game is running; if it keeps closing, restart MelonDS.",
          ),
        );
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("MelonDS GDB did not accept the connection.")),
          3000,
        );
        socket.once("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        socket.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
      await this.handshake();
      // MelonDS's subcommand parser requires the separator even with no features.
      const capabilities = await this.command("qSupported:", true);
      const packetSize = /(?:^|;)PacketSize=([0-9a-f]+)/i.exec(capabilities)?.[1];
      if (packetSize) {
        const bytes = Math.floor(Number.parseInt(packetSize, 16) / 2);
        if (bytes >= 64) this.readChunkSize = Math.min(4096, bytes);
      }
      // MelonDS waits in its debugger loop on first attachment until continued.
      // Without acknowledgements, "c" has no reply; the next read confirms the stub.
      if (this.noAck) socket.write(frame("c"));
      else await this.command("c", false);
      if (!this.noAck && capabilities.split(";").includes("QStartNoAckMode+")) {
        if ((await this.command("QStartNoAckMode", true)) !== "OK")
          throw new Error("MelonDS did not enable its advertised no-acknowledgement mode.");
        this.noAck = true;
      }
      if (this.socket !== socket) throw new Error("The MelonDS GDB connection is not open.");
      this.isReady = true;
    } catch (error) {
      if (this.socket === socket)
        this.fail(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // MelonDS 1.1 keeps QStartNoAckMode after a debugger disconnects, so the next connection
  // gets no handshake acknowledgement and must continue without acknowledgements.
  private handshake(): Promise<boolean> {
    const socket = this.socket;
    if (!socket || socket.destroyed)
      return Promise.reject(new Error("The MelonDS GDB connection is not open."));
    return new Promise((resolve, reject) => {
      const pending: Pending = { reply: false, resolve: () => resolve(true), reject };
      pending.timer = setTimeout(() => {
        if (this.pending !== pending) return;
        this.pending = undefined;
        this.noAck = true;
        this.probingAck = true;
        resolve(false);
      }, 1500);
      this.pending = pending;
      socket.write("+");
    });
  }

  private command(payload: string, reply: boolean, timeoutMs?: number): Promise<string> {
    if (this.pending)
      return Promise.reject(
        this.pending.stale ? stillWaiting() : new Error("GDB reads must be serialized."),
      );
    const socket = this.socket;
    if (!socket || socket.destroyed)
      return Promise.reject(new Error("The MelonDS GDB connection is not open."));
    return new Promise((resolve, reject) => {
      const pending: Pending = { reply, resolve, reject };
      if (timeoutMs !== undefined) {
        pending.timer = setTimeout(() => {
          // The request stays pending so that its late reply is not taken as the next one's.
          pending.stale = true;
          pending.resolve = () => undefined;
          pending.reject = () => undefined;
          reject(timedOut());
        }, timeoutMs);
      }
      this.pending = pending;
      socket.write(frame(payload));
    });
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > 32768) {
      this.fail(new Error("The GDB response is too large."));
      return;
    }
    while (this.buffer.length) {
      const first = this.buffer[0];
      if (first === "+" || first === "-") {
        this.buffer = this.buffer.slice(1);
        if (first === "-") {
          this.fail(new Error("MelonDS rejected a GDB packet checksum."));
          return;
        }
        // A late acknowledgement means the stub was only slow and still expects acknowledgements.
        if (this.probingAck) this.noAck = false;
        if (this.pending && !this.pending.reply) this.complete("");
        continue;
      }
      if (first !== "$") {
        this.fail(new Error("MelonDS returned an invalid GDB packet."));
        return;
      }
      const end = this.buffer.indexOf("#");
      if (end < 0 || this.buffer.length < end + 3) return;
      const payload = this.buffer.slice(1, end);
      const expected = this.buffer.slice(end + 1, end + 3);
      this.buffer = this.buffer.slice(end + 3);
      const checksum = [...payload].reduce((sum, char) => sum + char.charCodeAt(0), 0) & 255;
      if (checksum.toString(16).padStart(2, "0") !== expected.toLowerCase()) {
        this.fail(new Error("The GDB response checksum is invalid."));
        return;
      }
      if (!this.noAck) this.socket?.write("+");
      this.probingAck = false;
      if (!this.pending?.reply) {
        this.fail(new Error("Unexpected GDB response. Disconnect any other debugger."));
        return;
      }
      this.complete(payload);
    }
  }

  private complete(value: string): void {
    const pending = this.pending;
    this.pending = undefined;
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(value);
    }
  }

  private fail(error: Error): void {
    const pending = this.pending;
    this.pending = undefined;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.release();
  }

  private release(): void {
    const socket = this.socket;
    this.socket = undefined;
    this.ready = undefined;
    this.isReady = false;
    this.buffer = "";
    this.noAck = false;
    this.probingAck = false;
    this.readChunkSize = 512;
    // MelonDS 1.1 keeps unparsed bytes for the next debugger, so an EOT would make it drop every
    // later connection. A reset at least frees its slot when the stub has not accepted us yet.
    if (socket && !socket.destroyed) socket.resetAndDestroy();
  }

  async readMemory(address: number, length: number): Promise<Buffer> {
    if (
      !Number.isSafeInteger(address) ||
      !Number.isSafeInteger(length) ||
      length < 1 ||
      length > 16384 ||
      !(
        (address >= 0x02000000 && address + length <= 0x03000000) ||
        (address === 0x04000130 && length === 2)
      )
    ) {
      throw new Error(
        "Only bounded NDS main-memory reads and the two-byte keypad register are allowed.",
      );
    }
    if (!this.isReady)
      throw new Error("The MelonDS GDB connection is not ready.");
    const result: Buffer[] = [];
    for (let offset = 0; offset < length; offset += this.readChunkSize) {
      const size = Math.min(this.readChunkSize, length - offset);
      const payload = await this.command(
        `m${(address + offset).toString(16)},${size.toString(16)}`,
        true,
        this.readTimeoutMs,
      );
      if (!new RegExp(`^[a-fA-F0-9]{${size * 2}}$`).test(payload))
        throw new Error("MelonDS could not read the requested NDS memory.");
      result.push(Buffer.from(payload, "hex"));
    }
    return Buffer.concat(result);
  }

  close(): void {
    this.fail(new Error("The MelonDS connector was disconnected."));
  }
}
