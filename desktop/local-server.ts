import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, join } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { gameFrameSchema, validationMessage } from "../src/lib/tracker/schema";
import { overlayData } from "../src/lib/tracker/overlay";
import { TrackerService } from "./service";
import { getPlayerId, getPlayerIndex } from "../src/lib/tracker/knowledge";
import {
  applyOverlayCommand, defaultOverlayControl, overlayCommandSchema,
  overlayControlSchema, type OverlayCommand, type OverlayControlConfig,
} from "../src/lib/tracker/overlay-control";

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function sameToken(actual: string, expected: string): boolean {
  const first = Buffer.from(actual);
  const second = Buffer.from(expected);
  return first.length === second.length && timingSafeEqual(first, second);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > 1024 * 1024)
      throw new HttpError("The connector message exceeds 1 MB.", 413);
    chunks.push(data);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export class LocalServer {
  private readonly server = createServer((request, response) => {
    void this.handle(request, response).catch((error: unknown) => {
      if (request.url?.startsWith("/bridge"))
        this.service.reportBridgeError(error);
      if (!response.headersSent)
        this.json(response, error instanceof HttpError ? error.status : 400, {
          ok: false,
          error: validationMessage(error),
        });
      else response.destroy(error instanceof Error ? error : undefined);
    });
  });
  origin = "";

  constructor(
    private readonly service: TrackerService,
    private readonly publicDirectory: string,
  ) {
    this.server.requestTimeout = 10000;
    this.server.headersTimeout = 10000;
  }

  async start(port = 0): Promise<void> {
    await new Promise<void>((resolveStart, reject) => {
      const failed = (error: Error) => reject(error);
      this.server.once("error", failed);
      this.server.listen(port, "127.0.0.1", () => {
        this.server.off("error", failed);
        resolveStart();
      });
    });
    this.server.on("error", (error) => this.service.reportBridgeError(error));
    const address = this.server.address();
    if (!address || typeof address === "string")
      throw new Error("The local server did not expose a port.");
    this.origin = `http://127.0.0.1:${address.port}`;
    this.service.setBridgeUrl(`${this.origin}/bridge`);
  }

  overlayUrl(runId: string): string {
    this.service.database.require(runId);
    const token =
      this.service.database.readSetting(`overlay-${runId}`, z.string()) ??
      randomBytes(32).toString("base64url");
    this.service.database.writeSetting(`overlay-${runId}`, token);
    return `${this.origin}/overlay/?run=${encodeURIComponent(runId)}#token=${token}`;
  }

  controlConfig(runId: string): OverlayControlConfig {
    this.service.database.require(runId);
    const key = `overlay-control-token-${runId}`;
    const token = this.service.database.readSetting(key, z.string()) ?? randomBytes(32).toString("base64url");
    this.service.database.writeSetting(key, token);
    return { url: `${this.origin}/overlay-control/${encodeURIComponent(runId)}`, token };
  }

  controlState(runId: string) {
    this.service.database.require(runId);
    return this.service.database.readSetting(`overlay-state-${runId}`, overlayControlSchema) ?? defaultOverlayControl();
  }

  commandOverlay(runId: string, input: OverlayCommand) {
    const command = overlayCommandSchema.parse(input);
    const { run } = this.service.database.require(runId);
    if (command.action !== "hide") {
      const index = getPlayerIndex(run, command.playerId ?? getPlayerId(run));
      if (command.action === "show-pokemon") {
        const team = run.isSoulLinkMode ? run.playerTeams?.[index] ?? [] : run.team;
        if (!(command.slot ? team[command.slot - 1] : team.find((capture) => capture.id === command.captureId)))
          throw new HttpError("The selected Pokemon is not in this player's team.", 400);
      }
    }
    const state = applyOverlayCommand(this.controlState(runId), command);
    this.service.database.writeSetting(`overlay-state-${runId}`, state);
    return state;
  }

  private json(response: ServerResponse, status: number, data: unknown): void {
    response.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(JSON.stringify(data));
  }

  private async handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (request.headers.host !== new URL(this.origin).host)
      throw new HttpError("Invalid local server host.", 403);
    const url = new URL(request.url ?? "/", this.origin);
    if (url.pathname.startsWith("/overlay-control/")) {
      if (request.method !== "POST")
        throw new HttpError("Overlay commands require POST.", 405);
      if (request.headers.origin && request.headers.origin !== this.origin)
        throw new HttpError("Overlay commands are only available locally.", 403);
      const runId = decodeURIComponent(url.pathname.slice("/overlay-control/".length));
      const expected = this.service.database.readSetting(`overlay-control-token-${runId}`, z.string());
      const actual = request.headers.authorization?.slice("Bearer ".length) ?? "";
      if (!request.headers.authorization?.startsWith("Bearer ") || !expected || !sameToken(actual, expected))
        throw new HttpError("Invalid overlay control token.", 401);
      const state = this.commandOverlay(runId, overlayCommandSchema.parse(await readJson(request)));
      this.json(response, 200, { ok: true, state });
      return;
    }
    if (url.pathname === "/bridge") {
      if (request.method !== "POST" || request.headers.origin)
        throw new HttpError(
          "Only local connector POST requests are allowed.",
          403,
        );
      const body = z
        .object({ token: z.string().max(200), frame: gameFrameSchema })
        .strict()
        .parse(await readJson(request));
      if (!sameToken(body.token, this.service.status.bridge.token))
        throw new HttpError("Invalid connector token.", 401);
      const record = this.service.ingest(body.frame);
      this.json(response, 200, {
        ok: true,
        revision: record.revision,
        suspended:
          record.tracking[this.service.status.bridge.playerId ?? ""]
            ?.suspended ?? false,
      });
      return;
    }
    if (url.pathname.startsWith("/overlay-data/")) {
      if (
        request.method !== "GET" ||
        (request.headers.origin && request.headers.origin !== this.origin)
      ) {
        throw new HttpError(
          "The overlay endpoint is read-only and local.",
          403,
        );
      }
      const runId = decodeURIComponent(
        url.pathname.slice("/overlay-data/".length),
      );
      const expected = this.service.database.readSetting(
        `overlay-${runId}`,
        z.string(),
      );
      const actual =
        request.headers.authorization?.replace(/^Bearer /, "") ?? "";
      if (!expected || !sameToken(actual, expected))
        throw new HttpError("Invalid overlay token.", 401);
      this.json(
        response,
        200,
        {
          ...overlayData(this.service.database.require(runId), this.service.status.bridge),
          control: this.controlState(runId),
        },
      );
      return;
    }
    if (!["GET", "HEAD"].includes(request.method ?? ""))
      throw new HttpError("Method not allowed.", 405);
    const pathname = decodeURIComponent(url.pathname);
    const root = resolve(this.publicDirectory);
    let file = resolve(root, `.${pathname}`);
    const relativePath = relative(root, file);
    if (relativePath.startsWith("..") || isAbsolute(relativePath))
      throw new HttpError("Invalid asset path.", 403);
    let info;
    try {
      info = statSync(file);
      if (info.isDirectory()) {
        file = join(file, "index.html");
        info = statSync(file);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new HttpError("Asset not found.", 404);
      }
      throw error;
    }
    if (!info.isFile()) throw new HttpError("Asset not found.", 404);
    const contentTypes: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
      ".txt": "text/plain; charset=utf-8",
    };
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'",
    });
    if (request.method === "HEAD") response.end();
    else {
      const stream = createReadStream(file);
      stream.on("error", (error) => response.destroy(error));
      stream.pipe(response);
    }
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    if (this.server.listening) {
      await new Promise<void>((resolveStop, reject) =>
        this.server.close((error) => (error ? reject(error) : resolveStop())),
      );
    }
  }
}
