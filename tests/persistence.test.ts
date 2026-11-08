import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { IDBFactory } from "fake-indexeddb";
import { BrowserRepository } from "../src/lib/tracker/browser-repository";
import {
  exportArchive,
  importAsCopies,
  readArchive,
  LEGACY_STORAGE_KEY,
} from "../src/lib/tracker/archive";
import { TrackerDatabase } from "../desktop/database";
import { capture, record, run } from "./fixtures";

function randomizedRecord() {
  const original = record();
  original.run.isRandomMode = true;
  original.run.randomizerOptions = {
    randomizeTypes: true,
    randomizeAbilities: false,
    randomizeEncounters: true,
    randomizeEvolvedForms: false,
  };
  const member = capture("member");
  original.run.zones[0].captures = [member];
  original.run.zones[0].status = "captured";
  original.run.team = [member];
  original.run.pokedexNotesByPokemonId = { 1: "Keep this private note." };
  return original;
}

test("legacy randomized runs migrate without losing data or modifying localStorage", async () => {
  const factory = new IDBFactory();
  const original = randomizedRecord();
  const legacy = JSON.stringify([original.run]);
  const storage = {
    getItem: (key: string) => (key === LEGACY_STORAGE_KEY ? legacy : null),
  };
  const repository = new BrowserRepository(factory, storage);
  const expected = structuredClone(original.run);
  expected.randomizerOptions!.randomizeStats = false;
  assert.deepEqual((await repository.list())[0].run, expected);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), legacy);
  await repository.close();
  const reopened = new BrowserRepository(factory, storage);
  assert.deepEqual((await reopened.list())[0].run, expected);
  await reopened.close();
});

test("invalid random stat settings abort migration and allow recovery on retry", async () => {
  const original = randomizedRecord();
  const invalid = {
    ...original.run,
    randomizerOptions: {
      ...original.run.randomizerOptions,
      randomizeStats: "false",
    },
  };
  let legacy = JSON.stringify([run(), { ...invalid, id: "run-2" }]);
  const repository = new BrowserRepository(new IDBFactory(), {
    getItem: () => legacy,
  });
  await assert.rejects(repository.list(), /randomizeStats/);
  legacy = JSON.stringify([{ ...original.run, id: "run-2" }]);
  const recovered = await repository.list();
  assert.deepEqual(
    recovered.map((entry) => entry.run.id),
    ["run-2"],
  );
  assert.equal(recovered[0].run.randomizerOptions?.randomizeStats, false);
  await repository.close();
});

test("older IndexedDB records remain readable and explicit random stat settings are preserved", async () => {
  const factory = new IDBFactory();
  const repository = new BrowserRepository(factory, { getItem: () => null });
  await repository.initialize();
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open("nuztracker-local", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const original = randomizedRecord();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("runs", "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
      transaction.objectStore("runs").add(original);
    });
    const expected = structuredClone(original);
    expected.run.randomizerOptions!.randomizeStats = false;
    assert.deepEqual(await repository.list(), [expected]);
    for (const randomizeStats of [true, false]) {
      const next = randomizedRecord();
      next.run.id = `stats-${randomizeStats}`;
      next.run.randomizerOptions!.randomizeStats = randomizeStats;
      assert.deepEqual(await repository.add([next]), [next]);
    }
    assert.deepEqual(
      (await repository.list()).map(
        (entry) => entry.run.randomizerOptions?.randomizeStats,
      ),
      [false, false, true],
    );
  } finally {
    database.close();
    await repository.close();
  }
});

test("older portable archives normalize missing random stat settings after checksum verification", async () => {
  const original = randomizedRecord();
  const payload = { exportedAt: 1, scope: "personal", records: [original] };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const checksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const archive = { format: "nuztracker", version: 1, checksum, payload };
  const expected = structuredClone(original);
  expected.run.randomizerOptions!.randomizeStats = false;
  assert.deepEqual(await readArchive(JSON.stringify(archive)), [expected]);
  original.run.randomizerOptions!.randomizeStats = true;
  await assert.rejects(readArchive(JSON.stringify(archive)), /checksum/);
});

test("older SQLite records stay readable without rewriting the stored backup source", () => {
  const directory = mkdtempSync(join(tmpdir(), "nuztracker-legacy-database-"));
  const path = join(directory, "tracker.sqlite");
  const database = new TrackerDatabase(path);
  const rawDatabase = new DatabaseSync(path);
  const original = randomizedRecord();
  const raw = JSON.stringify(original);
  try {
    rawDatabase
      .prepare("INSERT INTO runs (id, revision, data) VALUES (?, ?, ?)")
      .run(original.run.id, original.revision, raw);
    const expected = structuredClone(original);
    expected.run.randomizerOptions!.randomizeStats = false;
    assert.deepEqual(database.list(), [expected]);
    assert.deepEqual(database.require(original.run.id), expected);
    assert.equal(
      rawDatabase
        .prepare("SELECT data FROM runs WHERE id = ?")
        .get(original.run.id)?.data,
      raw,
    );
  } finally {
    rawDatabase.close();
    database.close();
    rmSync(directory, { recursive: true });
  }
});

test("a portable archive preserves the full record and imports without replacing its identity", async () => {
  const original = record();
  original.run.pokedexNotesByPokemonId = { 1: "Keep this private note." };
  const decoded = await readArchive(await exportArchive([original]));
  assert.deepEqual(decoded, [original]);
  const copies = importAsCopies(decoded);
  assert.notEqual(copies[0].run.id, original.run.id);
  assert.equal(
    copies[0].run.pokedexNotesByPokemonId?.[1],
    "Keep this private note.",
  );
  const shared = await readArchive(await exportArchive([original], "shared"));
  assert.equal(shared[0].run.pokedexNotesByPokemonId, undefined);
});

test("a corrupt or unsupported archive fails before it can be imported", async () => {
  const archive: {
    version: number;
    payload: { records: { run: { gameName: string } }[] };
  } = JSON.parse(await exportArchive([record()]));
  archive.payload.records[0].run.gameName = "Changed";
  await assert.rejects(readArchive(JSON.stringify(archive)), /checksum/);
  archive.version = 99;
  await assert.rejects(readArchive(JSON.stringify(archive)));
});

test("browser migration is atomic, idempotent and retains the original localStorage backup", async () => {
  const factory = new IDBFactory();
  const legacy = JSON.stringify([run()]);
  const storage = {
    getItem: (key: string) => (key === LEGACY_STORAGE_KEY ? legacy : null),
  };
  const repository = new BrowserRepository(factory, storage);
  assert.equal((await repository.list()).length, 1);
  assert.equal((await repository.list()).length, 1);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), legacy);
  await repository.close();
  const reopened = new BrowserRepository(factory, storage);
  assert.equal((await reopened.list()).length, 1);
  await reopened.close();
});

test("invalid legacy data is surfaced rather than replaced by an empty workspace", async () => {
  const repository = new BrowserRepository(new IDBFactory(), {
    getItem: () => "{broken",
  });
  await assert.rejects(repository.list());
  await assert.rejects(repository.list());
  await repository.close();
});

test("browser writes preserve existing runs when an import has a duplicate ID", async () => {
  const repository = new BrowserRepository(new IDBFactory(), {
    getItem: () => null,
  });
  const first = record();
  await repository.add([first]);
  const second = record();
  second.run.id = "run-2";
  await assert.rejects(repository.add([second, first]));
  assert.deepEqual(
    (await repository.list()).map((entry) => entry.run.id),
    ["run-1"],
  );
  await repository.close();
});

test("SQLite persists after restart and records rotating recovery copies", () => {
  const directory = mkdtempSync(join(tmpdir(), "nuztracker-database-"));
  const path = join(directory, "tracker.sqlite");
  let database = new TrackerDatabase(path);
  try {
    const original = record();
    database.add([original]);
    database.save(
      {
        ...original,
        revision: 1,
        run: { ...original.run, gameName: "Updated" },
      },
      true,
    );
    database.close();
    database = new TrackerDatabase(path);
    assert.equal(database.require(original.run.id).run.gameName, "Updated");
    assert.equal(database.backups(original.run.id)[0].run.gameName, "Test run");
    const pending = { id: "command-1", runId: original.run.id, payload: "{}" };
    database.savePending(database.require(original.run.id), pending);
    assert.equal(database.pending(original.run.id).length, 1);
    assert.throws(() =>
      database.savePending({ ...original, revision: 999 }, pending),
    );
    assert.equal(database.require(original.run.id).revision, 1);
  } finally {
    database.close();
    rmSync(directory, { recursive: true });
  }
});
