import type { Run } from "../types";
import type { HistoryEntry, RunEdit, RunRecord } from "./types";
import { finalizeRun } from "./run-rules";
import {
  getPlayerIndex,
  withoutPrivateNotes,
  preservePrivateNotes,
} from "./knowledge";
import { recordSchema, runSchema } from "./schema";

export function newId(): string {
  return crypto.randomUUID();
}

export function createRecord(run: Run, now = Date.now()): RunRecord {
  return recordSchema.parse({
    formatVersion: 1,
    revision: 0,
    run: finalizeRun(runSchema.parse(run), now),
    history: [],
    tracking: {},
    observations: [],
  });
}

export function addHistory(
  record: RunRecord,
  playerId: string,
  kind: HistoryEntry["kind"],
  message: string,
  now = Date.now(),
  eventId = newId(),
): RunRecord {
  if (record.history.some((entry) => entry.id === eventId)) return record;
  return {
    ...record,
    history: [
      ...record.history,
      { id: eventId, at: now, playerId, kind, message },
    ],
  };
}

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    );
  }
  if (isObject(left) && isObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => sameValue(left[key], right[key]));
  }
  return false;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyedArray(
  value: unknown,
): value is (Record<string, unknown> & { id: string })[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isObject(entry) && typeof entry.id === "string")
  );
}

/** Three-way merging preserves independent edits and refuses conflicting changes. */
function mergeValue(
  before: unknown,
  after: unknown,
  current: unknown,
  path: string,
): unknown {
  if (sameValue(before, after)) return current;
  if (sameValue(before, current) || sameValue(after, current)) return after;
  if (isObject(before) && isObject(after) && isObject(current)) {
    const result: Record<string, unknown> = {};
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
      ...Object.keys(current),
    ])) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw new Error("Invalid property in a run update.");
      result[key] =
        key === "updatedAt"
          ? current[key]
          : mergeValue(before[key], after[key], current[key], `${path}.${key}`);
    }
    return result;
  }
  if (keyedArray(before) && keyedArray(after) && keyedArray(current)) {
    const beforeMap = new Map(before.map((entry) => [entry.id, entry]));
    const afterMap = new Map(after.map((entry) => [entry.id, entry]));
    const currentMap = new Map(current.map((entry) => [entry.id, entry]));
    const ids = new Set([
      ...currentMap.keys(),
      ...afterMap.keys(),
      ...beforeMap.keys(),
    ]);
    return [...ids]
      .map((id) =>
        mergeValue(
          beforeMap.get(id),
          afterMap.get(id),
          currentMap.get(id),
          `${path}[${id}]`,
        ),
      )
      .filter((entry) => entry !== undefined);
  }
  throw new Error(
    `Conflicting changes at ${path}. Review the latest run before trying again.`,
  );
}

function validatePlayerEdit(before: Run, after: Run, playerId: string): void {
  const index = getPlayerIndex(before, playerId);
  const locked = (run: Run) => ({
    ...withoutPrivateNotes(run),
    updatedAt: 0,
    zones: run.zones.map((zone) => ({
      ...zone,
      updatedAt: 0,
      status: "not-visited",
      captures: zone.captures.filter(
        (capture) => (capture.playerIndex ?? 0) !== index,
      ),
    })),
    playerTeams: { ...run.playerTeams, [index]: [] },
    playerKnowledge: { ...run.playerKnowledge, [playerId]: {} },
  });
  if (!sameValue(locked(before), locked(after))) {
    throw new Error(
      "Players can only edit their own captures, team and knowledge. Shared settings belong to the host.",
    );
  }
  const previousIds = new Map(
    before.zones.flatMap((zone) =>
      zone.captures.map((capture) => [capture.id, capture] as const),
    ),
  );
  for (const capture of after.zones.flatMap((zone) => zone.captures)) {
    const previous = previousIds.get(capture.id);
    if (previous && previous.playerIndex !== capture.playerIndex) {
      throw new Error("Capture ownership cannot be changed by a participant.");
    }
  }
}

export function applyRunEdit(
  record: RunRecord,
  edit: RunEdit,
  options: { enforceOwnership?: boolean; now?: number } = {},
): RunRecord {
  if (
    edit.runId !== record.run.id ||
    edit.after.id !== record.run.id ||
    edit.before.id !== record.run.id
  ) {
    throw new Error("The update belongs to another run.");
  }
  if (record.history.some((entry) => entry.id === edit.id)) return record;
  const now = options.now ?? Date.now();
  const merged = runSchema.parse(
    mergeValue(edit.before, edit.after, record.run, "run"),
  );
  if (options.enforceOwnership)
    validatePlayerEdit(record.run, merged, edit.playerId);
  const run = finalizeRun({ ...merged, updatedAt: now }, now);
  let next = addHistory(
    { ...record, run, revision: record.revision + 1 },
    edit.playerId,
    "manual",
    "Run updated.",
    now,
    edit.id,
  );
  const oldCaptures = new Map(
    record.run.zones.flatMap((zone) =>
      zone.captures.map((capture) => [capture.id, capture] as const),
    ),
  );
  for (const capture of run.zones.flatMap((zone) => zone.captures)) {
    const old = oldCaptures.get(capture.id);
    if (capture.isDead && !old?.isDead) {
      next = addHistory(
        next,
        edit.playerId,
        "death",
        `${capture.nickname ?? capture.pokemon.technicalName} ${capture.linkedDeath ? "became unavailable through SoulLink" : "was marked as lost"}.`,
        now,
      );
    }
  }
  return recordSchema.parse(next);
}

export function shareRecord(record: RunRecord): RunRecord {
  return { ...record, run: withoutPrivateNotes(record.run) };
}

export function receiveSharedRecord(
  incoming: RunRecord,
  local?: RunRecord,
): RunRecord {
  return { ...incoming, run: preservePrivateNotes(incoming.run, local?.run) };
}
