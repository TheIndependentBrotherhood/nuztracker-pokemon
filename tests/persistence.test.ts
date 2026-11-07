import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IDBFactory } from "fake-indexeddb";
import { BrowserRepository } from "../src/lib/tracker/browser-repository";
import {
  exportArchive,
  importAsCopies,
  readArchive,
  LEGACY_STORAGE_KEY,
} from "../src/lib/tracker/archive";
import { TrackerDatabase } from "../desktop/database";
import { record, run } from "./fixtures";

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
