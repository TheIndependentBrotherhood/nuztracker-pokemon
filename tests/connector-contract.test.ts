import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { gameFrameSchema } from "../src/lib/tracker/schema";

test("the real Lua reader emits exactly the TypeScript bridge protocol", () => {
  const require = createRequire(join(process.cwd(), "package.json"));
  const execution = spawnSync(
    process.execPath,
    [
      require.resolve("fengari-node-cli/src/lua-cli.js"),
      "tests/firered-reader.test.lua",
      "--frame",
    ],
    { encoding: "utf8" },
  );
  assert.ifError(execution.error);
  assert.equal(execution.status, 0, execution.stderr);
  assert.match(execution.stdout, /ROM guards passed/);
  const line = execution.stdout
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("FRAME:"));
  assert.ok(line, "The Lua fixture did not emit a frame.");
  const frame = gameFrameSchema.parse(JSON.parse(line.slice("FRAME:".length)));
  assert.equal(frame.party[0].hp, 17);
  assert.equal(frame.party[0].moves[0].name, "TACKLE");
  assert.equal(frame.observations[0].moveId, 33);
  assert.equal(frame.battle?.opponents[0].pokemonId, 1);
});
