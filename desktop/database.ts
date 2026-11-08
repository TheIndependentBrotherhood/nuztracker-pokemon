import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { recordSchema } from "../src/lib/tracker/schema";
import type { RunRecord } from "../src/lib/tracker/types";

export interface PendingMessage {
  id: string;
  runId: string;
  payload: string;
}

export class TrackerDatabase {
  private readonly database: DatabaseSync;

  constructor(readonly path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    const version = this.database.prepare("PRAGMA user_version").get();
    if (Number(version?.user_version) > 1) {
      this.database.close();
      throw new Error(
        "This database was created by a newer NuzTracker version. It was not modified.",
      );
    }
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY, run_id TEXT NOT NULL, created_at INTEGER NOT NULL, data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT UNIQUE NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }

  transaction<T>(operation: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.database.exec("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "The transaction and its rollback failed.",
        );
      }
      throw error;
    }
  }

  list(): RunRecord[] {
    return this.database
      .prepare("SELECT data FROM runs ORDER BY rowid")
      .all()
      .map((row) => recordSchema.parse(JSON.parse(String(row.data))));
  }

  get(runId: string): RunRecord | undefined {
    const row = this.database
      .prepare("SELECT data FROM runs WHERE id = ?")
      .get(runId);
    return row ? recordSchema.parse(JSON.parse(String(row.data))) : undefined;
  }

  require(runId: string): RunRecord {
    const record = this.get(runId);
    if (!record) throw new Error("The requested run does not exist.");
    return record;
  }

  add(records: RunRecord[]): RunRecord[] {
    const validated = records.map((record) => recordSchema.parse(record));
    this.transaction(() => {
      const insert = this.database.prepare(
        "INSERT INTO runs (id, revision, data) VALUES (?, ?, ?)",
      );
      for (const record of validated)
        insert.run(record.run.id, record.revision, JSON.stringify(record));
    });
    return validated;
  }

  save(record: RunRecord, backup = false): RunRecord {
    const validated = recordSchema.parse(record);
    this.transaction(() => this.write(validated, backup));
    return validated;
  }

  private write(record: RunRecord, backup: boolean): void {
    if (backup) this.backup(record.run.id);
    this.database
      .prepare(
        `
      INSERT INTO runs (id, revision, data) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, data = excluded.data
    `,
      )
      .run(record.run.id, record.revision, JSON.stringify(record));
  }

  private backup(runId: string): void {
    const previous = this.database
      .prepare("SELECT data FROM runs WHERE id = ?")
      .get(runId);
    if (!previous) return;
    this.database
      .prepare(
        "INSERT INTO backups (run_id, created_at, data) VALUES (?, ?, ?)",
      )
      .run(runId, Date.now(), String(previous.data));
    this.database
      .prepare(
        `
      DELETE FROM backups WHERE run_id = ? AND id NOT IN (
        SELECT id FROM backups WHERE run_id = ? ORDER BY id DESC LIMIT 10
      )
    `,
      )
      .run(runId, runId);
  }

  backups(runId: string): RunRecord[] {
    return this.database
      .prepare("SELECT data FROM backups WHERE run_id = ? ORDER BY id DESC")
      .all(runId)
      .map((row) => recordSchema.parse(JSON.parse(String(row.data))));
  }

  delete(runId: string): void {
    this.transaction(() => {
      this.backup(runId);
      this.database.prepare("DELETE FROM runs WHERE id = ?").run(runId);
    });
  }

  readSetting<T>(key: string, schema: z.ZodType<T>): T | undefined {
    const row = this.database
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key);
    return row ? schema.parse(JSON.parse(String(row.value))) : undefined;
  }

  writeSetting(key: string, value: unknown): void {
    this.database
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(key, JSON.stringify(value));
  }

  removeSetting(key: string): void {
    this.database.prepare("DELETE FROM settings WHERE key = ?").run(key);
  }

  pending(runId: string): PendingMessage[] {
    return this.database
      .prepare(
        "SELECT id, run_id, payload FROM outbox WHERE run_id = ? ORDER BY sequence",
      )
      .all(runId)
      .map((row) => ({
        id: String(row.id),
        runId: String(row.run_id),
        payload: String(row.payload),
      }));
  }

  savePending(record: RunRecord, message: PendingMessage): void {
    const validated = recordSchema.parse(record);
    if (this.pending(record.run.id).length >= 5000) {
      throw new Error(
        "The offline queue is full. Reconnect or export a local copy before continuing.",
      );
    }
    this.transaction(() => {
      this.write(validated, false);
      this.database
        .prepare("INSERT INTO outbox (id, run_id, payload) VALUES (?, ?, ?)")
        .run(message.id, message.runId, message.payload);
    });
  }

  acknowledge(
    runId: string,
    id: string | undefined,
    record: RunRecord,
    authoritative: RunRecord,
  ): void {
    const validated = recordSchema.parse(record);
    this.transaction(() => {
      if (id)
        this.database
          .prepare("DELETE FROM outbox WHERE run_id = ? AND id = ?")
          .run(runId, id);
      this.write(validated, false);
      this.writeSetting("room-authoritative", authoritative);
    });
  }

  clearPending(runId: string): void {
    this.database.prepare("DELETE FROM outbox WHERE run_id = ?").run(runId);
  }

  close(): void {
    this.database.close();
  }
}
