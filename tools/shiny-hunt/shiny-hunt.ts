// One-shot shiny hunting helper for Pokémon Platinum on MelonDS.
// Turns on the spot in tall grass, runs from every wild battle and stops at the
// first shiny. Battle data is read (read-only) from the NuzTracker desktop
// database, which must be connected to MelonDS.
//
// Usage: yarn tsx tools/shiny-hunt/shiny-hunt.ts [--turn-ms 40] [--min-hp 60] [--fast-forward]
// --fast-forward holds the MelonDS fast-forward key; its speed is the
// "FastForwardFPS" MelonDS setting (keep it low, e.g. 120-180).
import { spawn, execFileSync } from "node:child_process";
import type { FileHandle } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import { NdsRom } from "../../desktop/nds-rom";
import { readShinyThreshold } from "../../desktop/pk4";

// Virtual-key codes matching the MelonDS keyboard mapping (melonDS.toml).
const KEY = {
  fastForward: 0x09, // Tab
  left: 0x51, // Q
  right: 0x44, // D
  up: 0x5a, // Z
  down: 0x53, // S
  a: 0x66, // Numpad 6
  b: 0x62, // Numpad 2
} as const;
const TURN_ORDER = [KEY.left, KEY.up, KEY.right, KEY.down];

const DEFAULT_SHINY_THRESHOLD = 8;
const POLL_MS = 50;
const TAP_MS = 60;

interface Frame {
  game?: { trainerId?: string };
  party?: { hp: number; maxHp: number; nickname?: string; isEgg?: boolean }[];
  battle?: {
    kind: "wild" | "trainer";
    opponents: { identity: string; pokemonId: number; level: number }[];
  };
}

const { values: options } = parseArgs({
  options: {
    "turn-ms": { type: "string", default: "40" },
    "min-hp": { type: "string", default: "60" },
    "fast-forward": { type: "boolean", default: false },
  },
});
const turnMs = Number(options["turn-ms"]);
const minHpRatio = Number(options["min-hp"]) / 100;
const fastForward = options["fast-forward"];

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const log = (message: string) =>
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

function findMelonDsPid(): number {
  const output = execFileSync(
    "tasklist",
    ["/FI", "IMAGENAME eq melonDS.exe", "/FO", "CSV", "/NH"],
    { encoding: "utf8" },
  );
  const match = output.match(/^"melonDS\.exe","(\d+)"/im);
  if (!match) throw new Error("MelonDS is not running.");
  return Number(match[1]);
}

class KeySender {
  private readonly process = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(__dirname, "key-sender.ps1"),
    ],
    { stdio: ["pipe", "pipe", "inherit"] },
  );
  private readonly replies: ((line: string) => void)[] = [];

  constructor() {
    createInterface({ input: this.process.stdout }).on("line", (line) =>
      this.replies.shift()?.(line.trim()),
    );
  }

  private send(command: string) {
    this.process.stdin.write(`${command}\n`);
  }

  private ask(command: string): Promise<string> {
    return new Promise((resolve) => {
      this.replies.push(resolve);
      this.send(command);
    });
  }

  init(pid: number) {
    return this.ask(`init ${pid}`);
  }

  async hasFocus() {
    return (await this.ask("fg")) === "1";
  }

  down(vk: number) {
    this.send(`down ${vk}`);
  }

  up(vk: number) {
    this.send(`up ${vk}`);
  }

  releaseAll() {
    this.send("release");
  }

  alert(text: string) {
    return this.ask(`alert ${text.replace(/\r?\n/g, " ")}`);
  }

  close() {
    this.releaseAll();
    this.process.stdin.end();
  }
}

class TrackerReader {
  private readonly db: DatabaseSync;
  private readonly runId: string;
  private readonly playerId: string;
  private revision = -1;
  private frame?: Frame;

  constructor() {
    const path = join(
      process.env.APPDATA ?? "",
      "nuztracker",
      "tracker.sqlite",
    );
    this.db = new DatabaseSync(path, { readOnly: true });
    const binding = this.setting<{ runId: string; playerId: string }>(
      "bridge-binding",
    );
    if (!binding) throw new Error("No run is bound to the emulator bridge.");
    this.runId = binding.runId;
    this.playerId = binding.playerId;
  }

  setting<T>(key: string): T | undefined {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : undefined;
  }

  latest(): Frame | undefined {
    const row = this.db
      .prepare(
        `SELECT revision, json_extract(data, '$.tracking.' || ? || '.latest') AS latest
         FROM runs WHERE id = ? AND revision != ?`,
      )
      .get(this.playerId, this.runId, this.revision) as
      { revision: number; latest: string | null } | undefined;
    if (row) {
      this.revision = row.revision;
      this.frame = row.latest ? (JSON.parse(row.latest) as Frame) : undefined;
    }
    return this.frame;
  }
}

async function readThreshold(reader: TrackerReader): Promise<number> {
  const rom = reader.setting<{ path: string }>("melonds-rom");
  if (!rom?.path) return DEFAULT_SHINY_THRESHOLD;
  try {
    const nds = await NdsRom.open(rom.path);
    try {
      return readShinyThreshold(await nds.arm9());
    } finally {
      // NdsRom exposes no close(); release its handle to avoid a GC warning.
      await (nds as unknown as { file: FileHandle }).file.close();
    }
  } catch {
    return DEFAULT_SHINY_THRESHOLD;
  }
}

function isShiny(pid: number, otId: number, threshold: number) {
  return (
    ((otId & 0xffff) ^ (otId >>> 16) ^ (pid & 0xffff) ^ (pid >>> 16)) <
    threshold
  );
}

function lowLeadHp(frame: Frame) {
  const lead = frame.party?.find((pokemon) => !pokemon.isEgg);
  return lead && lead.maxHp > 0 && lead.hp / lead.maxHp < minHpRatio
    ? lead
    : undefined;
}

async function main() {
  const reader = new TrackerReader();
  const threshold = await readThreshold(reader);
  const keys = new KeySender();
  let stopping = false;

  const stop = async (message: string, alert = false) => {
    if (stopping) return;
    stopping = true;
    keys.releaseAll();
    log(message);
    if (alert) await keys.alert(message);
    keys.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void stop("Stopped by user."));

  const init = await keys.init(findMelonDsPid());
  if (init === "error elevated") {
    keys.close();
    throw new Error(
      "MelonDS runs as administrator: start this script from an administrator terminal, or restart MelonDS without administrator rights.",
    );
  }

  log(
    `Shiny threshold ${threshold}/65536 (1/${Math.round(65536 / threshold)}). Focus the MelonDS window to start, Ctrl+C to stop.`,
  );

  const seen = new Set<string>();
  let encounters = 0;
  // Last two directions pressed (including battle menu taps): the player faces
  // one of them, so turning towards a third one never takes a step.
  const recentDirections: number[] = [];
  let paused = true;

  const tap = async (vk: number, ms = TAP_MS) => {
    if (TURN_ORDER.includes(vk as (typeof TURN_ORDER)[number]))
      recentDirections.splice(
        0,
        recentDirections.length,
        vk,
        ...recentDirections.slice(0, 1),
      );
    keys.down(vk);
    await sleep(ms);
    keys.up(vk);
    await sleep(ms);
  };

  while (!stopping) {
    if (!(await keys.hasFocus())) {
      if (!paused) {
        keys.releaseAll();
        log("MelonDS lost focus, paused.");
        paused = true;
      }
      await sleep(250);
      continue;
    }
    if (paused) {
      log("Hunting...");
      paused = false;
      if (fastForward) keys.down(KEY.fastForward);
    }

    const frame = reader.latest();
    if (!frame) {
      await sleep(250);
      continue;
    }
    const lowLead = lowLeadHp(frame);
    if (lowLead) {
      await stop(
        `${lowLead.nickname ?? "Lead Pokémon"} is below ${Math.round(minHpRatio * 100)}% HP (${lowLead.hp}/${lowLead.maxHp}), heal it before hunting again.`,
        true,
      );
      return;
    }

    const battle = frame.battle;
    if (!battle) {
      const next = TURN_ORDER.find((vk) => !recentDirections.includes(vk));
      await tap(next ?? KEY.left, turnMs);
      continue;
    }
    if (battle.kind !== "wild") {
      await stop("Trainer battle detected, stopping.", true);
      return;
    }
    if (!battle.opponents.length) {
      await sleep(POLL_MS);
      continue;
    }

    const otId = parseInt(frame.game?.trainerId ?? "", 16);
    for (const opponent of battle.opponents) {
      if (seen.has(opponent.identity)) continue;
      seen.add(opponent.identity);
      encounters += 1;
      const pid = parseInt(opponent.identity.split("-")[0], 16);
      if (Number.isFinite(otId) && isShiny(pid, otId, threshold)) {
        await stop(
          `SHINY found after ${encounters} encounters: Pokémon #${opponent.pokemonId} level ${opponent.level}!`,
          true,
        );
        return;
      }
      log(
        `Encounter ${encounters}: #${opponent.pokemonId} lv ${opponent.level}, not shiny.`,
      );
    }

    // Run away (battle_subscreen.c in pret/pokeplatinum): the menu is a 3x2 grid,
    // "Fight" on top, "Bag" / "Run" / "Pokémon" below, moves are clamped and
    // the first key press only shows the cursor. B backs out of any submenu,
    // Down reaches the bottom row, Left twice clamps on "Bag", Right selects
    // "Run", then B skips the escape text.
    const run = [KEY.b, KEY.b, KEY.down, KEY.down, KEY.left, KEY.left];
    for (const vk of [...run, KEY.right, KEY.a, KEY.b, KEY.b]) await tap(vk);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
