import type { RunEdit, RunRecord } from "./types";
import { applyRunEdit } from "./records";
import { recordSchema } from "./schema";
import { LEGACY_STORAGE_KEY, readLegacyRuns } from "./archive";

const DATABASE_NAME = "nuztracker-local";

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("The local database request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("The local database transaction failed."),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("The local database transaction was cancelled."),
      );
  });
}

export class BrowserRepository {
  private database?: Promise<IDBDatabase>;
  private initialization?: Promise<void>;

  constructor(
    private readonly factory: IDBFactory,
    private readonly legacyStorage: Pick<Storage, "getItem">,
    private readonly databaseName = DATABASE_NAME,
  ) {}

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        let blocked = false;
        const request = this.factory.open(this.databaseName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("runs", { keyPath: "run.id" });
          db.createObjectStore("backups", { keyPath: "run.id" });
          db.createObjectStore("settings");
        };
        request.onsuccess = () => {
          if (blocked) {
            request.result.close();
            return;
          }
          request.result.onversionchange = () => {
            request.result.close();
            this.database = undefined;
            this.initialization = undefined;
          };
          resolve(request.result);
        };
        request.onerror = () =>
          reject(request.error ?? new Error("Could not open local storage."));
        request.onblocked = () => {
          blocked = true;
          reject(
            new Error(
              "Another NuzTracker tab is blocking the database upgrade. Close it and retry.",
            ),
          );
        };
      }).catch((error) => {
        this.database = undefined;
        throw error;
      });
    }
    return this.database;
  }

  async initialize(): Promise<void> {
    this.initialization ??= this.migrate();
    try {
      await this.initialization;
    } catch (error) {
      this.initialization = undefined;
      throw error;
    }
  }

  private async migrate(): Promise<void> {
    const db = await this.open();
    const read = db.transaction("settings", "readonly");
    const done = transactionDone(read);
    const migrated = await requestValue(
      read.objectStore("settings").get("legacy-migrated"),
    );
    await done;
    if (migrated) return;
    const raw = this.legacyStorage.getItem(LEGACY_STORAGE_KEY);
    const records = raw ? readLegacyRuns(raw) : [];
    const transaction = db.transaction(["runs", "settings"], "readwrite");
    const committed = transactionDone(transaction);
    const store = transaction.objectStore("runs");
    for (const record of records) {
      const lookup = store.getKey(record.run.id);
      lookup.onsuccess = () => {
        if (lookup.result === undefined) store.add(record);
      };
    }
    transaction.objectStore("settings").put(true, "legacy-migrated");
    await committed;
  }

  async list(): Promise<RunRecord[]> {
    await this.initialize();
    const db = await this.open();
    const transaction = db.transaction("runs", "readonly");
    const done = transactionDone(transaction);
    const records: unknown[] = await requestValue(
      transaction.objectStore("runs").getAll(),
    );
    await done;
    return records.map((record) => recordSchema.parse(record));
  }

  async add(records: RunRecord[]): Promise<RunRecord[]> {
    await this.initialize();
    const validated = records.map((record) => recordSchema.parse(record));
    const db = await this.open();
    const transaction = db.transaction("runs", "readwrite");
    const done = transactionDone(transaction);
    for (const record of validated) transaction.objectStore("runs").add(record);
    await done;
    return validated;
  }

  async edit(edit: RunEdit): Promise<RunRecord> {
    await this.initialize();
    const db = await this.open();
    const transaction = db.transaction(["runs", "backups"], "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore("runs");
    const current: unknown = await requestValue(store.get(edit.runId));
    let result: RunRecord;
    try {
      const record = recordSchema.parse(current);
      result = applyRunEdit(record, edit);
      transaction.objectStore("backups").put(record);
      store.put(result);
    } catch (error) {
      transaction.abort();
      await done.catch(() => undefined);
      throw error;
    }
    await done;
    return result;
  }

  async delete(runId: string): Promise<void> {
    await this.initialize();
    const db = await this.open();
    const transaction = db.transaction(["runs", "backups"], "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore("runs");
    const current: unknown = await requestValue(store.get(runId));
    if (current)
      transaction.objectStore("backups").put(recordSchema.parse(current));
    store.delete(runId);
    await done;
  }

  async close(): Promise<void> {
    (await this.open()).close();
  }
}
