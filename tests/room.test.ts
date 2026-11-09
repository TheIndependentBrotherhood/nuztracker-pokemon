import { test } from "node:test";
import assert from "node:assert/strict";
import { TrackerDatabase } from "../desktop/database";
import { hostAddresses, RoomHost } from "../desktop/room-host";
import { RoomClient } from "../desktop/room-client";
import { normalizeRoomAddress } from "../desktop/room-protocol";
import { createRecord, newId } from "../src/lib/tracker/records";
import { capture, pokemon, run } from "./fixtures";

test("host addresses prefer physical private IPv4 interfaces", () => {
  const entry = (address: string, family: "IPv4" | "IPv6" = "IPv4") => ({
    address,
    family,
    internal: address === "127.0.0.1",
    netmask: "255.255.255.0",
    mac: "00:00:00:00:00:00",
    cidr: null,
    ...(family === "IPv6" ? { scopeid: 0 } : {}),
  });
  assert.deepEqual(
    hostAddresses({
      "vEthernet (WSL)": [entry("172.20.0.1")],
      "Loopback Pseudo-Interface 1": [entry("127.0.0.1")],
      Tailscale: [entry("100.80.1.2")],
      Ethernet: [entry("fe80::1", "IPv6"), entry("192.168.1.42")],
      "Wi-Fi": [entry("169.254.3.4")],
    } as Parameters<typeof hostAddresses>[0]),
    ["192.168.1.42", "100.80.1.2", "172.20.0.1"],
  );
});

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

test("encrypted rooms pin the host certificate from the invitation", async () => {
  const hostDb = new TrackerDatabase(":memory:");
  const adventure = run(true);
  hostDb.add([createRecord(adventure)]);
  const host = new RoomHost(
    hostDb,
    {
      runId: adventure.id,
      playerId: "p1",
      port: 0,
      allowLan: false,
      secure: true,
      publicHost: "127.0.0.1",
    },
    pokemon,
    () => undefined,
    () => undefined,
  );
  let forged: RoomClient | undefined;
  let guest: RoomClient | undefined;
  try {
    await host.start();
    const address = host.status.address!;
    const invitation = host.status.invitation!;
    assert.match(address, /^wss:\/\/127\.0\.0\.1:\d+\/room$/);
    assert.equal(host.status.secure, true);
    const [token, fingerprint] = invitation.split(".");
    assert.equal(fingerprint.length, 43);
    forged = new RoomClient(
      new TrackerDatabase(":memory:"),
      { address, invitation: `${token}.${"A".repeat(43)}`, playerId: "p2" },
      pokemon,
      () => undefined,
      () => undefined,
    );
    await assert.rejects(forged.start(), /certificate does not match/);
    guest = new RoomClient(
      new TrackerDatabase(":memory:"),
      { address, invitation, playerId: "p2" },
      pokemon,
      () => undefined,
      () => undefined,
    );
    await guest.start();
    assert.equal(guest.status.mode, "connected");
  } finally {
    forged?.stop();
    guest?.stop();
    await host.stop();
  }
});

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
