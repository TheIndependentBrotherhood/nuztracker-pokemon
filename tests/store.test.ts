import { test } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { useRunStore } from "../src/store/runStore";
import { LEGACY_STORAGE_KEY } from "../src/lib/tracker/archive";
import { run } from "./fixtures";

test("UI edits keep their original baseline and report conflicts without losing newer changes", async (context) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      indexedDB: new IDBFactory(),
      localStorage: {
        getItem: (key: string) =>
          key === LEGACY_STORAGE_KEY ? JSON.stringify([run()]) : null,
      },
    },
  });
  try {
    await useRunStore.getState().loadRuns();
    const baseline = useRunStore.getState().runs[0];
    assert.ok(baseline);
    assert.equal(
      await useRunStore
        .getState()
        .updateRun({ ...baseline, gameName: "New title" }, baseline),
      true,
    );
    assert.equal(
      await useRunStore
        .getState()
        .updateRun({ ...baseline, status: "completed" }, baseline),
      true,
    );
    assert.equal(useRunStore.getState().runs[0].gameName, "New title");
    assert.equal(useRunStore.getState().runs[0].status, "completed");
    const errorLog = context.mock.method(console, "error", () => undefined);
    assert.equal(
      await useRunStore
        .getState()
        .updateRun({ ...baseline, gameName: "Conflicting title" }, baseline),
      false,
    );
    assert.match(useRunStore.getState().error ?? "", /Conflicting changes/);
    assert.equal(errorLog.mock.callCount(), 1);
    assert.equal(useRunStore.getState().runs[0].gameName, "New title");
    assert.equal(useRunStore.getState().pending, 0);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
