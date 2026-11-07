import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TrackerDatabase } from "../desktop/database";
import { TrackerService } from "../desktop/service";
import { LocalServer } from "../desktop/local-server";
import { frame, pokemon, record, capture } from "./fixtures";
import { currentOverlayView } from "../src/lib/tracker/overlay-control";

test("the local HTTP bridge authenticates, persists real frames and exposes only a read-only overlay", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nuztracker-http-"));
  writeFileSync(
    join(directory, "index.html"),
    "<!doctype html><title>Tracker</title>",
  );
  const database = new TrackerDatabase(":memory:");
  database.add([record()]);
  const service = new TrackerService(database, pokemon);
  const server = new LocalServer(service, directory);
  try {
    await server.start();
    service.bindBridge({ runId: "run-1", playerId: "solo" });
    const rejected = await fetch(`${server.origin}/bridge`, {
      method: "POST",
      body: JSON.stringify({ token: "invalid", frame: frame() }),
    });

    test("overlay commands use a separate credential, validate selections and persist across server restarts", async () => {
      const directory = mkdtempSync(join(tmpdir(), "nuztracker-overlay-"));
      const database = new TrackerDatabase(join(directory, "test.sqlite"));
      const current = record();
      const member = capture("member");
      current.run.zones[0].captures = [member];
      current.run.team = [member];
      database.add([current]);
      const service = new TrackerService(database, pokemon);
      const server = new LocalServer(service, directory);
      try {
        await server.start();
        const config = server.controlConfig(current.run.id);
        const readUrl = new URL(server.overlayUrl(current.run.id));
        const readToken = new URLSearchParams(readUrl.hash.slice(1)).get("token")!;
        assert.notEqual(config.token, readToken);
        assert.notEqual(config.token, service.status.bridge.token);
        const post = (body: unknown, token = config.token, headers: Record<string, string> = {}) => fetch(config.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...headers },
          body: JSON.stringify(body),
        });
        assert.equal((await post({ action: "hide" }, readToken)).status, 401);
        assert.equal((await post({ action: "hide" }, service.status.bridge.token)).status, 401);
        assert.equal((await fetch(config.url, { headers: { Authorization: `Bearer ${config.token}` } })).status, 405);
        assert.equal((await post({ action: "hide" }, config.token, { Origin: "https://untrusted.example" })).status, 403);
        assert.equal((await post({ action: "hide" }, config.token, { Host: "untrusted.example" })).status, 403);
        assert.equal((await post({ action: "show-pokemon", slot: 2 })).status, 400);
        assert.equal((await post({ action: "show-team", playerId: "other-player" })).status, 400);
        assert.equal((await post({ action: "hide" })).status, 200);
        assert.equal((await post({ action: "show-pokemon", slot: 1, durationSeconds: 0.25 })).status, 200);
        const state = server.controlState(current.run.id);
        assert.ok(state.temporary);
        assert.equal(currentOverlayView(state, state.temporary.expiresAt - 1).mode, "pokemon");
        assert.equal(currentOverlayView(state, state.temporary.expiresAt).mode, "hidden");
        assert.equal((await fetch(`${server.origin}/overlay-data/${current.run.id}`, {
          headers: { Authorization: `Bearer ${config.token}` },
        })).status, 401);
        await server.stop();
        const restoredDatabase = new TrackerDatabase(join(directory, "test.sqlite"));
        const restoredService = new TrackerService(restoredDatabase, pokemon);
        const restoredServer = new LocalServer(restoredService, directory);
        try {
          await restoredServer.start();
          assert.equal(restoredServer.controlConfig(current.run.id).token, config.token);
          assert.deepEqual(restoredServer.controlState(current.run.id), state);
        } finally {
          await restoredServer.stop();
          await restoredService.stop();
          restoredDatabase.close();
        }
      } finally {
        await service.stop();
        await server.stop();
        database.close();
        rmSync(directory, { recursive: true });
      }
    });
    assert.equal(rejected.status, 401);
    assert.equal(database.require("run-1").tracking.solo, undefined);
    const accepted = await fetch(`${server.origin}/bridge`, {
      method: "POST",
      body: JSON.stringify({
        token: service.status.bridge.token,
        frame: frame(),
      }),
    });
    assert.equal(accepted.status, 200);
    assert.equal(
      database.require("run-1").tracking.solo.latest.party[0].hp,
      20,
    );
    const savedRevision = database.require("run-1").revision;
    service.ingest(frame(20));
    assert.equal(database.require("run-1").revision, savedRevision);
    const rewind = frame(21);
    rewind.frame = 150;
    service.ingest(rewind);
    assert.equal(database.require("run-1").tracking.solo.suspended, true);
    const crossOrigin = await fetch(`${server.origin}/bridge`, {
      method: "POST",
      headers: { Origin: "https://untrusted.example" },
      body: JSON.stringify({
        token: service.status.bridge.token,
        frame: frame(2),
      }),
    });
    assert.equal(crossOrigin.status, 403);
    const overlayUrl = new URL(server.overlayUrl("run-1"));
    const overlayToken = new URLSearchParams(overlayUrl.hash.slice(1)).get(
      "token",
    );
    assert.equal(
      (await fetch(`${server.origin}/overlay-data/run-1`)).status,
      401,
    );
    const overlay = await fetch(`${server.origin}/overlay-data/run-1`, {
      headers: { Authorization: `Bearer ${overlayToken}` },
    });
    const payload = await overlay.json();
    assert.equal(overlay.status, 200);
    assert.equal(payload.history, undefined);
    assert.equal(payload.tracking, undefined);
    assert.equal(payload.gameName, "Test run");
    const page = await fetch(server.origin);
    assert.equal(page.status, 200);
    assert.match(
      page.headers.get("content-security-policy") ?? "",
      /frame-ancestors 'none'/,
    );
    assert.match(
      page.headers.get("content-security-policy") ?? "",
      /https:\/\/fonts\.googleapis\.com/,
    );
  } finally {
    await service.stop();
    await server.stop();
    database.close();
    rmSync(directory, { recursive: true });
  }
});
