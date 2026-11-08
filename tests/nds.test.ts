import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Socket } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodePk4, SnapshotError } from "../desktop/pk4";
import { readGen4Message } from "../desktop/nds-text";
import {
  closeSharedGdbClients,
  ReadOnlyGdbClient,
  sharedGdbClient,
} from "../desktop/gdb-client";
import { NdsRom } from "../desktop/nds-rom";
import { PlatinumReader } from "../desktop/platinum-reader";
import { loadPlatinumData } from "../desktop/platinum-data";
import { pk4Fixture, messageBank, ndsRomFixture } from "./nds-fixtures";

test("PK4 decoding covers all shuffle indices, encryption flags, unsigned identities and egg privacy", () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    for (const flags of [0, 2, 3]) {
      const decoded = decodePk4(pk4Fixture(shuffle, { flags }));
      assert.ok(decoded);
      const { pokemon } = decoded;
      assert.equal(pokemon.pokemonId, 25);
      assert.equal(pokemon.nickname, "B\u00e9a");
      assert.match(pokemon.identity, /^8[0-9a-f]{7}-f123abcd$/);
      assert.equal(pokemon.gender, "female");
      assert.deepEqual(
        [pokemon.level, pokemon.hp, pokemon.maxHp],
        [12, 18, 30],
      );
      assert.deepEqual(pokemon.stats, {
        attack: 21,
        defense: 22,
        speed: 23,
        "special-attack": 24,
        "special-defense": 25,
      });
      assert.deepEqual(pokemon.moves, [{ id: 33, pp: 35 }]);
      assert.equal(decodePk4(pk4Fixture(shuffle, { flags, egg: true })), null);
    }
  }
  const invalid = pk4Fixture();
  invalid[8] ^= 1;
  assert.throws(() => decodePk4(invalid), /checksum/);
  assert.throws(() => decodePk4(Buffer.alloc(200)), /236/);
  assert.throws(() => decodePk4(pk4Fixture(0, { hp: 31 })), /HP/);
  assert.throws(() => decodePk4(pk4Fixture(0, { species: 500 })), /species/);
  assert.equal(decodePk4(pk4Fixture(0, { hp: 0 }))?.pokemon.status, "fainted");
});

test("NDS text and ROM archives preserve local modified types without revealing random base stats", async () => {
  assert.equal(
    readGen4Message(messageBank(["Normal", "F\u00e9e"]), 1),
    "F\u00e9e",
  );
  assert.throws(() => readGen4Message(messageBank(["Normal"]), 2), /entry/);
  const directory = await mkdtemp(join(tmpdir(), "nuztracker-nds-"));
  const path = join(directory, "synthetic.nds");
  await writeFile(path, ndsRomFixture());
  try {
    const rom = await NdsRom.open(path);
    try {
      assert.equal(rom.gameCode, "CPUE");
      assert.equal(rom.romHash.length, 64);
      assert.equal(
        (await rom.archive("poketool/personal/pl_personal.narc")).length,
        509,
      );
      const enrich = await loadPlatinumData(rom);
      const pokemon = enrich(decodePk4(pk4Fixture())!);
      assert.deepEqual(pokemon.types, ["fairy"]);
      assert.equal(pokemon.moves[0].type, "fire");
      assert.equal(pokemon.moves[0].power, 40);
      assert.equal("baseStats" in pokemon, false);
      await assert.rejects(rom.archive("missing.narc"), /missing/);
    } finally {
      await rom.close();
    }
    const invalid = ndsRomFixture();
    invalid.write("XXXX", 12);
    await writeFile(path, invalid);
    await assert.rejects(NdsRom.open(path), /Platinum/);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("Platinum reads guarded standard and Project PM parties, real frame counters and consistent snapshots", async () => {
  for (const pointerOffset of [0x20, 0x24]) {
    const ram = Buffer.alloc(0x400000);
    const root = 0x02010000;
    ram.writeUInt32LE(0x02001000, 0xba8);
    ram.writeUInt32LE(root, 0x1000 + pointerOffset);
    ram.writeUInt32LE(6, 0x100ac);
    ram.writeUInt32LE(1, 0x100b0);
    ram.writeUInt32LE(123, 0x1008c);
    ram.writeUInt32LE(3, 0x11294);
    pk4Fixture().copy(ram, 0x100b4);
    ram.writeUInt32LE(100, 0x3ffc3c);
    ram.write("CPUE", 0x3ffe0c);
    ram[0x3ffe1e] = 1;
    let tearReads = 0;
    let countAfterSlots: number | undefined;
    const addresses: number[] = [];
    const recordReads: number[] = [];
    const memory = {
      async readMemory(address: number, length: number) {
        addresses.push(address);
        const offset = (address - 0x02000000) % 0x400000;
        const result = Buffer.from(ram.subarray(offset, offset + length));
        const record =
          address === root + 0xac && length > 8
            ? 8
            : address === root + 0xb4
              ? 0
              : undefined;
        if (record !== undefined) {
          recordReads.push(length);
          // A record caught while the game re-encrypts it no longer matches its checksum.
          if (tearReads > 0) {
            tearReads--;
            result[record + 100] ^= 1;
          }
        }
        if (
          address === root + 0xac &&
          length === 8 &&
          countAfterSlots !== undefined
        )
          result.writeUInt32LE(countAfterSlots, 4);
        return result;
      },
    };
    const reader = new PlatinumReader(
      memory,
      { gameCode: "CPUE", revision: 1, romHash: "synthetic" },
      (decoded) => decoded.pokemon,
      ["", "", "", "Jubilife City"],
    );
    const first = await reader.read();
    assert.equal(
      first.layout,
      pointerOffset === 0x20 ? "standard" : "project-pm",
    );
    assert.equal(first.frame.frame, 100);
    assert.equal(first.frame.location?.name, "Jubilife City");
    assert.equal(first.frame.party.length, 1);
    assert.ok(
      recordReads.every((length) => length <= 8 + 236),
      "Each record must come from a single GDB packet.",
    );
    ram.writeUInt32LE(20, 0x3ffc3c);
    assert.equal((await reader.read()).frame.stateLoaded, true);
    tearReads = 3;
    assert.equal(
      (await reader.read()).frame.party[0].hp,
      18,
      "A record caught mid-rewrite is read again.",
    );
    tearReads = Infinity;
    await assert.rejects(
      reader.read(),
      (error) =>
        error instanceof SnapshotError &&
        /changed during the read/.test(error.message),
    );
    tearReads = 0;
    countAfterSlots = 2;
    await assert.rejects(
      reader.read(),
      (error) =>
        error instanceof SnapshotError &&
        /consistent snapshot/.test(error.message),
    );
    countAfterSlots = undefined;
    ram.writeUInt32LE(7, 0x100b0);
    await assert.rejects(reader.read(), /unique supported/);
    ram.writeUInt32LE(1, 0x100b0);
    ram.write("CPUF", 0x3ffe0c);
    await assert.rejects(reader.read(), /ROM header/);
    assert.ok(
      addresses.every(
        (address) => address < root + 0x1298 || address >= 0x027ffc00,
      ),
      "The reader must not touch an enemy party.",
    );
  }
});

function platinumBattleRam(type = 0) {
  const ram = Buffer.alloc(0x400000);
  const at = (address: number) => address - 0x02000000;
  const root = 0x02010000,
    global = 0x02001000,
    holder = 0x02002000,
    field = 0x02003000;
  const manager = 0x02003100,
    child = 0x02003200,
    system = 0x02004000,
    context = 0x02020000;
  const playerParty = 0x02030000,
    enemyParty = 0x02031000;
  ram.writeUInt32LE(global, 0xba8);
  ram.writeUInt32LE(holder, at(global + 0x10));
  ram.writeUInt32LE(root, at(global + 0x24));
  ram.writeUInt32LE(123, at(root + 0x8c));
  ram.writeUInt32LE(6, at(root + 0xac));
  ram.writeUInt32LE(1, at(root + 0xb0));
  pk4Fixture().copy(ram, at(root + 0xb4));
  ram.writeUInt32LE(3, at(root + 0x1294));
  ram.writeUInt32LE(100, 0x3ffc3c);
  ram.write("CPUE", 0x3ffe0c);
  ram[0x3ffe1e] = 1;
  ram.writeUInt32LE(field, at(holder + 0x1c));
  ram.writeUInt32LE(manager, at(field));
  ram.writeUInt32LE(root, at(field + 0x0c));
  ram.writeUInt32LE(child, at(manager + 4));
  ram.writeUInt32LE(16, at(child + 0x0c));
  ram.writeUInt32LE(2, at(child + 0x10));
  ram.writeUInt32LE(system, at(child + 0x1c));
  ram.writeUInt32LE(type, at(system + 0x2c));
  ram.writeUInt32LE(context, at(system + 0x30));
  ram.writeUInt32LE(2, at(system + 0x44));
  ram.writeUInt32LE(playerParty, at(system + 0x68));
  ram.writeUInt32LE(enemyParty, at(system + 0x6c));
  const battler = (
    index: number,
    species: number,
    level: number,
    pid: number,
  ) => {
    const base = at(context + 0x2d80 + index * 0xc0);
    ram.writeUInt16LE(species, base);
    ram[base + 0x34] = level;
    ram.writeUInt32LE(pid, base + 0x68);
    ram.writeUInt32LE(0xf123abcd, base + 0x74);
  };
  battler(0, 25, 12, 0x8000000f);
  battler(1, 48, 3, 0x12345678);
  ram.writeUInt32LE(6, at(playerParty));
  ram.writeUInt32LE(1, at(playerParty + 4));
  pk4Fixture(0, { hp: 7 }).copy(ram, at(playerParty + 8));
  ram.writeUInt32LE(6, at(enemyParty));
  ram.writeUInt32LE(1, at(enemyParty + 4));
  pk4Fixture(1, { species: 48 }).copy(ram, at(enemyParty + 8));
  const addresses: number[] = [];
  let tamper: ((address: number, result: Buffer) => void) | undefined;
  const memory = {
    async readMemory(address: number, length: number) {
      addresses.push(address);
      const offset = (address - 0x02000000) % 0x400000;
      const result = Buffer.from(ram.subarray(offset, offset + length));
      tamper?.(address, result);
      return result;
    },
  };
  const reader = new PlatinumReader(
    memory,
    { gameCode: "CPUE", revision: 1, romHash: "synthetic" },
    (decoded) => decoded.pokemon,
    ["", "", "", "Jubilife City"],
  );
  return {
    ram,
    at,
    root,
    child,
    system,
    playerParty,
    enemyParty,
    addresses,
    reader,
    battler,
    setTamper: (next?: (address: number, result: Buffer) => void) => {
      tamper = next;
    },
  };
}

test("Platinum battles use the player's battle party copy and only the opponents shown on screen", async () => {
  const battle = platinumBattleRam();
  const { frame } = await battle.reader.read();
  assert.equal(
    frame.party[0].hp,
    7,
    "In-battle HP must win over the not-yet-updated save.",
  );
  assert.deepEqual(frame.battle, {
    id: "platinum-wild-12345678",
    kind: "wild",
    activePlayerIdentity: "8000000f-f123abcd",
    opponents: [{ identity: "12345678-1", pokemonId: 48, level: 3 }],
  });
  assert.deepEqual(frame.warnings, []);
  assert.ok(
    battle.addresses.every(
      (address) =>
        address < battle.enemyParty || address >= battle.enemyParty + 0x1000,
    ),
    "The enemy party must stay hidden.",
  );

  battle.battler(0, 132, 12, 0x55555555);
  assert.equal(
    (await battle.reader.read()).frame.battle?.activePlayerIdentity,
    "8000000f-f123abcd",
    "Transform keeps the previous active Pokemon.",
  );

  battle.setTamper((address, result) => {
    if (address === battle.playerParty) result[120] ^= 1;
  });
  assert.equal(
    (await battle.reader.read()).frame.party[0].hp,
    7,
    "A battle record caught mid-rewrite is read again.",
  );
  battle.setTamper((address, result) => {
    if (address === battle.playerParty) result[120] ^= 1;
    if (address === battle.playerParty + 8) result[112] ^= 1;
  });
  await assert.rejects(
    battle.reader.read(),
    (error) =>
      error instanceof SnapshotError &&
      /changed during the read/.test(error.message),
  );
  battle.setTamper();

  battle.ram.writeUInt32LE(3, battle.at(battle.child + 0x10));
  const closing = (await battle.reader.read()).frame;
  assert.equal(closing.battle, undefined);
  assert.equal(
    closing.party[0].hp,
    7,
    "Battle values stay until the game copies them back to the save.",
  );
  pk4Fixture(0, { hp: 9 }).copy(battle.ram, battle.at(battle.root + 0xb4));
  assert.equal((await battle.reader.read()).frame.party[0].hp, 9);
  pk4Fixture().copy(battle.ram, battle.at(battle.root + 0xb4));
  assert.equal((await battle.reader.read()).frame.party[0].hp, 18);

  const fresh = platinumBattleRam();
  fresh.battler(0, 132, 12, 0x55555555);
  const unknown = (await fresh.reader.read()).frame;
  assert.equal(
    unknown.battle?.activePlayerIdentity,
    undefined,
    "An unknown battler is never reported as the player's Pokemon.",
  );
  fresh.ram.writeUInt32LE(3, fresh.at(fresh.child + 0x10));
  assert.equal((await fresh.reader.read()).frame.party[0].hp, 7);
  fresh.ram.writeUInt32LE(50, 0x3ffc3c);
  assert.equal(
    (await fresh.reader.read()).frame.party[0].hp,
    18,
    "Loading a state drops battle values.",
  );

  const expired = platinumBattleRam();
  await expired.reader.read();
  expired.ram.writeUInt32LE(3, expired.at(expired.child + 0x10));
  expired.ram.writeUInt32LE(701, 0x3ffc3c);
  assert.equal((await expired.reader.read()).frame.party[0].hp, 18);
});

test("Platinum battle types: trainer ids, link sides, tutorials and invalid structures", async () => {
  const trainer = platinumBattleRam(1);
  const first = (await trainer.reader.read()).frame;
  assert.equal(first.battle?.kind, "trainer");
  assert.equal(first.battle?.id, `${first.sessionId}-battle-1`);
  assert.deepEqual(
    first.warnings,
    [],
    "Single trainer battles share the validated wild battle layout.",
  );
  assert.equal(
    (await trainer.reader.read()).frame.battle?.id,
    first.battle?.id,
  );
  trainer.ram.writeUInt32LE(50, 0x3ffc3c);
  assert.equal(
    (await trainer.reader.read()).frame.battle?.id,
    `${first.sessionId}-battle-2`,
    "A loaded state starts a new trainer battle.",
  );

  const double = platinumBattleRam(0x3);
  double.ram.writeUInt32LE(4, double.at(double.system + 0x44));
  double.battler(3, 29, 13, 0x00e2b688);
  const doubled = (await double.reader.read()).frame;
  assert.deepEqual(doubled.warnings, []);
  assert.equal(doubled.battle?.kind, "trainer");
  assert.equal(doubled.battle?.activePlayerIdentity, "8000000f-f123abcd");
  assert.deepEqual(
    doubled.battle?.opponents.map((opponent) => opponent.pokemonId),
    [48, 29],
  );
  assert.equal(doubled.party[0].hp, 7);

  const link = platinumBattleRam(0x5);
  link.battler(1, 25, 12, 0x8000000f);
  link.battler(0, 48, 3, 0x12345678);
  link.ram.writeUInt32LE(link.enemyParty, link.at(link.system + 0x68));
  link.ram.writeUInt32LE(link.playerParty, link.at(link.system + 0x6c));
  const linked = (await link.reader.read()).frame;
  assert.equal(linked.battle?.activePlayerIdentity, "8000000f-f123abcd");
  assert.match(linked.warnings?.[0] ?? "", /0x5 has not been validated/);
  assert.deepEqual(linked.battle?.opponents, [
    { identity: "12345678-0", pokemonId: 48, level: 3 },
  ]);
  assert.equal(linked.party[0].hp, 7);
  assert.ok(
    link.addresses.every(
      (address) =>
        address < link.enemyParty || address >= link.enemyParty + 0x1000,
    ),
  );

  const hiddenSide = platinumBattleRam(0x5);
  hiddenSide.battler(0, 132, 12, 0x55555555);
  const hidden = (await hiddenSide.reader.read()).frame;
  assert.deepEqual(hidden.battle?.opponents, []);
  assert.equal(hidden.party[0].hp, 18);
  assert.match(hidden.warnings?.[0] ?? "", /link battle/);

  const tutorial = platinumBattleRam(0x400);
  assert.equal((await tutorial.reader.read()).frame.battle, undefined);

  const unrelated = platinumBattleRam();
  unrelated.ram.writeUInt32LE(0x02099999 & ~3, unrelated.at(0x02003000 + 0x0c));
  const outside = (await unrelated.reader.read()).frame;
  assert.equal(outside.battle, undefined);
  assert.equal(outside.party[0].hp, 18);
  assert.ok(
    !unrelated.addresses.includes(unrelated.child + 0x0c),
    "A foreign FieldSystem is never followed.",
  );
});

function packet(payload: string): string {
  const sum =
    [...payload].reduce((total, char) => total + char.charCodeAt(0), 0) % 256;
  return `$${payload}#${sum.toString(16).padStart(2, "0")}`;
}

// Models MelonDS 1.1's stub: one debugger at a time and nothing processed while paused. A closed
// connection is never noticed, so the slot stays busy until System > Reset, while unparsed bytes
// such as EOT and QStartNoAckMode survive into the next connection.
async function gdbFixture(
  options: { corrupt?: boolean; noAck?: boolean; paused?: boolean } = {},
) {
  const commands: string[] = [];
  const sockets = new Set<Socket>();
  const received = new Map<Socket, string>();
  const waiting: Socket[] = [];
  let active: Socket | undefined;
  let handshake = false;
  let stash = "";
  let connections = 0,
    endOfTransmissions = 0,
    clientAcks = 0;
  let noAck = options.noAck ?? false;
  let paused = options.paused ?? false;
  const write = (socket: Socket, data: string) => {
    if (!socket.destroyed) socket.write(data);
  };
  const accept = () => {
    while (!paused && !active && waiting.length) {
      const socket = waiting.shift()!;
      // Like WaitAckBlocking, a connection reset before it was accepted is dropped.
      if (socket.destroyed) continue;
      active = socket;
      handshake = true;
      connections++;
    }
    if (active) drain(active);
  };
  const drain = (socket: Socket) => {
    if (paused || active !== socket) return;
    let incoming = received.get(socket) ?? "";
    received.set(socket, "");
    if (handshake) {
      if (!incoming) return;
      // The stub reads the first byte as the handshake acknowledgement.
      handshake = false;
      incoming = incoming.slice(1);
      if (!noAck) write(socket, "+");
    }
    if (!incoming) return;
    stash += incoming;
    while (stash.length) {
      if (stash[0] === "\x04") {
        endOfTransmissions++;
        socket.destroy();
        active = undefined;
        accept();
        return;
      }
      if (stash[0] === "+") {
        clientAcks++;
        stash = stash.slice(1);
        continue;
      }
      const end = stash.indexOf("#");
      if (end < 0 || stash.length < end + 3) return;
      const command = stash.slice(1, end);
      assert.equal(stash.slice(0, end + 3), packet(command));
      stash = stash.slice(end + 3);
      commands.push(command);
      if (!noAck) write(socket, "+");
      let response: string;
      if (command === "qSupported:")
        response = "PacketSize=1000;QStartNoAckMode+";
      else if (command === "QStartNoAckMode") {
        response = "OK";
        noAck = true;
      } else if (command === "c") continue;
      else if (/^m[0-9a-f]+,[0-9a-f]+$/.test(command)) {
        const [address, size] = command
          .slice(1)
          .split(",")
          .map((value) => Number.parseInt(value, 16));
        response = memoryBytes(address, size).toString("hex");
      } else {
        assert.fail(`Unexpected GDB command: ${command}`);
      }
      let reply = packet(response);
      if (options.corrupt && command.startsWith("m"))
        reply = reply.slice(0, -2) + "00";
      write(socket, reply.slice(0, 3));
      setTimeout(() => write(socket, reply.slice(3)), 5);
    }
  };
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    sockets.add(socket);
    socket.setNoDelay(true);
    received.set(socket, "");
    socket.on("error", () => undefined);
    socket.on("data", (chunk) => {
      received.set(
        socket,
        (received.get(socket) ?? "") + chunk.toString("ascii"),
      );
      drain(socket);
    });
    socket.on("close", () => {
      sockets.delete(socket);
      const index = waiting.indexOf(socket);
      if (index >= 0) waiting.splice(index, 1);
    });
    waiting.push(socket);
    accept();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    commands,
    port: address.port,
    get connections() {
      return connections;
    },
    get endOfTransmissions() {
      return endOfTransmissions;
    },
    get clientAcks() {
      return clientAcks;
    },
    get busy() {
      return active !== undefined;
    },
    get stash() {
      return stash;
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      accept();
    },
    // System > Reset closes the stub's sockets but keeps its receive buffer and no-ack mode.
    reset() {
      active?.destroy();
      active = undefined;
      for (const socket of waiting.splice(0)) socket.destroy();
    },
    async stop() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

const memoryBytes = (address: number, length: number) =>
  Buffer.from(Array.from({ length }, (_, index) => (address + index) & 255));

async function waitFor(condition: () => boolean | Promise<boolean>) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("The condition was not met in time.");
}

test("real TCP GDB parsing handles fragmented packets, no-ack negotiation and read-only bounds", async () => {
  const server = await gdbFixture();
  const client = new ReadOnlyGdbClient();
  try {
    await client.connect(server.port);
    assert.deepEqual(
      await client.readMemory(0x02000000, 3000),
      memoryBytes(0x02000000, 3000),
    );
    await assert.rejects(client.readMemory(0x08000000, 4), /bounded/);
    await assert.rejects(client.readMemory(0x02000000, 16385), /bounded/);
    assert.ok(server.commands.includes("QStartNoAckMode"));
    assert.equal(
      server.commands.filter((command) => command.startsWith("m")).length,
      2,
    );
    assert.ok(
      server.commands.every(
        (command) =>
          ["qSupported:", "c", "QStartNoAckMode"].includes(command) ||
          /^m[0-9a-f]+,[0-9a-f]+$/.test(command),
      ),
    );
  } finally {
    client.close();
    await server.stop();
  }
});

test("GDB corruption fails explicitly and closes the connection", async () => {
  const server = await gdbFixture({ corrupt: true });
  const client = new ReadOnlyGdbClient();
  try {
    await client.connect(server.port);
    await assert.rejects(client.readMemory(0x02000000, 4), /checksum/);
    assert.equal(client.isConnected, false);
  } finally {
    client.close();
    await server.stop();
  }
});

test("a paused MelonDS keeps the GDB connection and its late reply is never taken for the next read", async () => {
  const server = await gdbFixture();
  const client = new ReadOnlyGdbClient({ readTimeoutMs: 200 });
  try {
    await client.connect(server.port);
    server.pause();
    await assert.rejects(
      client.readMemory(0x02000000, 2),
      /did not answer in time/,
    );
    assert.equal(client.isConnected, true);
    await assert.rejects(client.readMemory(0x02000010, 2), /Still waiting/);
    server.resume();
    let next: Buffer | undefined;
    await waitFor(async () => {
      next = await client.readMemory(0x02000020, 2).catch(() => undefined);
      return next !== undefined;
    });
    assert.deepEqual(next, memoryBytes(0x02000020, 2));
    assert.deepEqual(
      server.commands.filter((command) => command.startsWith("m")),
      ["m2000000,2", "m2000020,2"],
    );
  } finally {
    client.close();
    await server.stop();
  }
});

test("closing never poisons MelonDS: System > Reset frees the busy slot and the next connection reuses no-ack mode", async () => {
  const server = await gdbFixture();
  const first = new ReadOnlyGdbClient();
  const second = new ReadOnlyGdbClient();
  try {
    await first.connect(server.port);
    await first.readMemory(0x02000000, 4);
    first.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(server.endOfTransmissions, 0);
    assert.equal(
      server.stash,
      "",
      "No byte is left behind for the next debugger.",
    );
    assert.equal(
      server.busy,
      true,
      "Like MelonDS 1.1, the closed connection keeps the slot.",
    );

    await assert.rejects(
      second.connect(server.port, { timeoutMs: 1800 }),
      /System > Reset/,
    );
    assert.equal(
      second.isConnected,
      true,
      "The pending connection is kept while MelonDS is busy.",
    );
    server.reset();
    await waitFor(() => !second.isConnected);
    await second.connect(server.port);
    assert.deepEqual(
      await second.readMemory(0x02000000, 2),
      memoryBytes(0x02000000, 2),
    );
    assert.equal(
      server.commands.filter((command) => command === "QStartNoAckMode").length,
      1,
    );
    assert.equal(server.connections, 2);
  } finally {
    first.close();
    second.close();
    await server.stop();
  }
});

test("a connection started while MelonDS is paused is shared and joined instead of opened twice", async () => {
  const server = await gdbFixture({ paused: true });
  const client = sharedGdbClient(server.port);
  try {
    assert.equal(sharedGdbClient(server.port), client);
    await assert.rejects(
      client.connect(server.port, { timeoutMs: 200 }),
      /not answering/,
    );
    assert.equal(client.isConnected, true);
    await assert.rejects(client.connect(server.port + 1), /already connected/);
    const cancel = new AbortController();
    const cancelled = client.connect(server.port, { signal: cancel.signal });
    cancel.abort();
    await assert.rejects(cancelled, /cancelled/);
    server.resume();
    await client.connect(server.port);
    assert.deepEqual(
      await client.readMemory(0x02000000, 2),
      memoryBytes(0x02000000, 2),
    );
    assert.equal(server.connections, 1);
  } finally {
    closeSharedGdbClients();
    await server.stop();
  }
});

test("GDB handshake supports a stub left in no-ack mode and a slow stub that still expects acknowledgements", async () => {
  const persisted = await gdbFixture({ noAck: true });
  const reused = new ReadOnlyGdbClient();
  try {
    await reused.connect(persisted.port);
    assert.deepEqual(
      await reused.readMemory(0x02000000, 2),
      memoryBytes(0x02000000, 2),
    );
    assert.deepEqual(persisted.commands, ["qSupported:", "c", "m2000000,2"]);
    assert.equal(persisted.clientAcks, 0);
  } finally {
    reused.close();
    await persisted.stop();
  }

  const slow = await gdbFixture({ paused: true });
  const patient = new ReadOnlyGdbClient();
  const resume = setTimeout(() => slow.resume(), 1700);
  try {
    await patient.connect(slow.port);
    assert.deepEqual(
      await patient.readMemory(0x02000000, 2),
      memoryBytes(0x02000000, 2),
    );
    assert.ok(
      slow.clientAcks >= 1,
      "Replies are acknowledged while the stub expects it.",
    );
    assert.ok(slow.commands.includes("QStartNoAckMode"));
  } finally {
    clearTimeout(resume);
    patient.close();
    await slow.stop();
  }
});
