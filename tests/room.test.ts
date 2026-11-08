import { test } from "node:test";
import assert from "node:assert/strict";
import { TrackerDatabase } from "../desktop/database";
import { RoomHost } from "../desktop/room-host";
import { RoomClient } from "../desktop/room-client";
import { normalizeRoomAddress } from "../desktop/room-protocol";
import { createRecord, newId } from "../src/lib/tracker/records";
import { capture, pokemon, run } from "./fixtures";

async function waitFor(
  predicate: () => boolean,
  message: string,
): Promise<void> {
  const deadline = Date.now() + 7000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test("two real trackers synchronize, reserve player ownership and recover a durable offline queue", async () => {
  const hostDb = new TrackerDatabase(":memory:");
  const guestDb = new TrackerDatabase(":memory:");
  const intruderDb = new TrackerDatabase(":memory:");
  const adventure = run(true);
  adventure.zones[0].captures = [capture("a", 0), capture("b", 1)];
  adventure.pokedexNotesByPokemonId = { 1: "Host private note" };
  hostDb.add([createRecord(adventure)]);
  let host = new RoomHost(
    hostDb,
    {
      runId: adventure.id,
      playerId: "p1",
      port: 0,
      allowLan: false,
    },
    pokemon,
    () => undefined,
    () => undefined,
  );
  let guest: RoomClient | undefined;
  let intruder: RoomClient | undefined;
  try {
    await host.start();
    const options = {
      address: host.status.address!,
      invitation: host.status.invitation!,
      playerId: "p2",
    };
    guest = new RoomClient(
      guestDb,
      options,
      pokemon,
      () => undefined,
      () => undefined,
    );
    await guest.start();
    assert.equal(guest.status.mode, "connected");
    assert.equal(
      guestDb.require(adventure.id).run.playerKnowledge?.p1
        .pokedexNotesByPokemonId,
      undefined,
    );
    const before = guestDb.require(adventure.id).run;
    const after = structuredClone(before);
    after.zones[0].captures[1].nickname = "Synced";
    const id = newId();
    guest.submit({
      kind: "edit",
      id,
      edit: { id, runId: adventure.id, playerId: "p2", before, after },
    });
    await waitFor(
      () => guestDb.pending(adventure.id).length === 0,
      "The online edit was not acknowledged.",
    );
    assert.equal(
      hostDb.require(adventure.id).run.zones[0].captures[1].nickname,
      "Synced",
    );
    assert.equal(
      hostDb.require(adventure.id).run.playerKnowledge?.p1
        .pokedexNotesByPokemonId?.[1],
      "Host private note",
    );
    intruder = new RoomClient(
      intruderDb,
      options,
      pokemon,
      () => undefined,
      () => undefined,
    );
    await assert.rejects(intruder.start(), /reserved|already connected/i);

    const port = Number(new URL(options.address).port);
    await host.stop();
    await waitFor(
      () => guest?.status.mode === "disconnected",
      "The guest did not detect the lost host.",
    );
    const offlineBefore = guestDb.require(adventure.id).run;
    const offlineAfter = structuredClone(offlineBefore);
    offlineAfter.zones[0].captures[1].isDead = true;
    const offlineId = newId();
    guest.submit({
      kind: "edit",
      id: offlineId,
      edit: {
        id: offlineId,
        runId: adventure.id,
        playerId: "p2",
        before: offlineBefore,
        after: offlineAfter,
      },
    });
    assert.equal(guestDb.pending(adventure.id).length, 1);
    assert.equal(
      guestDb.require(adventure.id).run.zones[0].captures[0].linkedDeath,
      true,
    );
    guest.stop();
    host = new RoomHost(
      hostDb,
      { runId: adventure.id, playerId: "p1", port, allowLan: false },
      pokemon,
      () => undefined,
      () => undefined,
    );
    await host.start();
    guest = new RoomClient(
      guestDb,
      options,
      pokemon,
      () => undefined,
      () => undefined,
    );
    await guest.start();
    await waitFor(
      () => guestDb.pending(adventure.id).length === 0,
      "The persisted offline edit did not synchronize after restart.",
    );
    assert.equal(
      hostDb.require(adventure.id).run.zones[0].captures[0].linkedDeath,
      true,
    );
    assert.equal(
      hostDb
        .require(adventure.id)
        .history.filter((entry) => entry.id === offlineId).length,
      1,
    );
  } finally {
    guest?.stop();
    intruder?.stop();
    await host.stop();
    hostDb.close();
    guestDb.close();
    intruderDb.close();
  }
});

test("room addresses require encryption outside a trusted LAN or VPN", () => {
  assert.equal(
    normalizeRoomAddress("ws://192.168.1.20:47070"),
    "ws://192.168.1.20:47070/room",
  );
  assert.equal(
    normalizeRoomAddress("wss://tracker.example"),
    "wss://tracker.example/room",
  );
  assert.throws(
    () => normalizeRoomAddress("ws://tracker.example"),
    /Unencrypted/,
  );
  assert.throws(() => normalizeRoomAddress("https://tracker.example"));
  assert.throws(() => normalizeRoomAddress("ws://user:password@127.0.0.1"));
});
