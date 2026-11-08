import { BrowserRepository } from "./tracker/browser-repository";
import type { RunEdit, RunRecord } from "./tracker/types";

let browserRepository: BrowserRepository | undefined;

function browserStorage(): BrowserRepository {
  if (typeof window === "undefined")
    throw new Error("Local storage is only available in the application.");
  browserRepository ??= new BrowserRepository(
    window.indexedDB,
    window.localStorage,
  );
  return browserRepository;
}

export function getRecords(): Promise<RunRecord[]> {
  return window.nuztracker?.listRuns() ?? browserStorage().list();
}

export async function createStoredRecord(
  record: RunRecord,
): Promise<RunRecord> {
  if (window.nuztracker) return window.nuztracker.createRun(record);
  return (await browserStorage().add([record]))[0];
}

export function editStoredRun(edit: RunEdit): Promise<RunRecord> {
  return window.nuztracker?.editRun(edit) ?? browserStorage().edit(edit);
}

export function deleteStoredRun(id: string): Promise<void> {
  return window.nuztracker?.deleteRun(id) ?? browserStorage().delete(id);
}

export function importStoredRecords(
  records: RunRecord[],
): Promise<RunRecord[]> {
  return (
    window.nuztracker?.importRuns(records) ?? browserStorage().add(records)
  );
}
