import { build } from "esbuild";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "" },
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const output = join(root, "out");
// Next's export currently leaves Windows separators inside segment filenames.
for (const entry of await readdir(output, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile() || !entry.name.endsWith(".txt")) continue;
  const source = join(entry.parentPath, entry.name);
  const parts = relative(output, source).split(sep);
  const segmentIndex = parts.findIndex((part) => part.startsWith("__next."));
  if (segmentIndex < 0 || segmentIndex === parts.length - 1) continue;
  await rename(
    source,
    join(
      output,
      ...parts.slice(0, segmentIndex),
      parts.slice(segmentIndex).join("."),
    ),
  );
}

await Promise.all(
  ["main", "preload"].map((entry) =>
    build({
      entryPoints: [join(root, "desktop", `${entry}.ts`)],
      outfile: join(root, "dist-desktop", `${entry}.cjs`),
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node24",
      external: ["electron", "bufferutil", "utf-8-validate"],
    }),
  ),
);

const staging = join(root, "build", "desktop");
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await Promise.all(
  ["out", "dist-desktop", "connectors"].map((directory) =>
    cp(join(root, directory), join(staging, directory), { recursive: true }),
  ),
);
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
await writeFile(
  join(staging, "package.json"),
  JSON.stringify(
    {
      name: manifest.name,
      version: manifest.version,
      private: true,
      description: "Local-first Nuzlocke and SoulLink companion",
      author: "NuzTracker contributors",
      main: "dist-desktop/main.cjs",
    },
    null,
    2,
  ),
);
console.log("NuzTracker desktop build is ready.");
