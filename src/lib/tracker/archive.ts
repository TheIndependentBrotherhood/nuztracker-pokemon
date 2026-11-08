import { z } from "zod";
import { recordSchema, runSchema } from "./schema";
import { createRecord, newId, shareRecord } from "./records";
import type { RunRecord } from "./types";

export const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
export const LEGACY_STORAGE_KEY = "nuztracker-runs";
const archiveSchema = z.object({
  format: z.literal("nuztracker"),
  version: z.literal(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.object({
    exportedAt: z.number().int().nonnegative(),
    scope: z.enum(["personal", "shared"]),
    records: z.array(recordSchema).min(1).max(1000),
  }),
});

async function checksum(payload: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function exportArchive(
  records: RunRecord[],
  scope: "personal" | "shared" = "personal",
): Promise<string> {
  const payload = {
    exportedAt: Date.now(),
    scope,
    records: records.map((record) =>
      recordSchema.parse(scope === "shared" ? shareRecord(record) : record),
    ),
  };
  if (!records.length) throw new Error("There are no runs to export.");
  const result = JSON.stringify({
    format: "nuztracker",
    version: 1,
    checksum: await checksum(payload),
    payload,
  });
  if (new TextEncoder().encode(result).byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("This archive exceeds 50 MB. Export one run at a time.");
  }
  return result;
}

export async function readArchive(content: string): Promise<RunRecord[]> {
  if (new TextEncoder().encode(content).byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("The archive exceeds the 50 MB import limit.");
  }
  const raw: unknown = JSON.parse(content);
  const envelope = z
    .object({
      format: z.literal("nuztracker"),
      version: z.literal(1),
      checksum: z.string(),
      payload: z.unknown(),
    })
    .parse(raw);
  if ((await checksum(envelope.payload)) !== envelope.checksum) {
    throw new Error(
      "The archive checksum does not match. Nothing was imported.",
    );
  }
  return archiveSchema.parse(raw).payload.records;
}

export function importAsCopies(records: RunRecord[]): RunRecord[] {
  return records.map((record) =>
    recordSchema.parse({
      ...record,
      run: {
        ...record.run,
        id: newId(),
        gameName: `${record.run.gameName} (imported)`.slice(0, 500),
      },
    }),
  );
}

export function readLegacyRuns(content: string): RunRecord[] {
  const value: unknown = JSON.parse(content);
  const legacy = z.array(runSchema).parse(value);
  return legacy.map((run) => createRecord(run));
}
