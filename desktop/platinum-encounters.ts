import type { NdsRom } from "./nds-rom";
import type {
  EncounterCondition,
  EncounterMethod,
  ZoneEncounter,
} from "../src/lib/tracker/types";

const MAP_HEADER_SIZE = 24;
const MAP_HEADER_SCRIPTS = 4;
const MAP_HEADER_WILD = 14;
const MAP_HEADER_EVENTS = 16;
const MAP_HEADER_WEATHER = 20;
const MIN_MAP_HEADERS = 500;
const NO_ENCOUNTERS = 0xffff;
const ENCOUNTER_TABLE_SIZE = 0x1a8;
const MAX_SPECIES = 493;

// Slot probabilities from pret/pokeplatinum src/overlay006/wild_encounters.c.
const GRASS_RATES = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
const SURF_RATES = [60, 30, 5, 4, 1];
const GOOD_ROD_RATES = [40, 40, 15, 4, 1];

// Offsets of struct WildEncounters (include/struct_defs/wild_encounters.h).
const GRASS = 0x00;
const SWARM = 0x64;
const DAY = 0x6c;
const NIGHT = 0x74;
const RADAR = 0x7c;
const DUAL_SLOTS: [EncounterCondition, number][] = [
  ["ruby", 0xa4],
  ["sapphire", 0xac],
  ["emerald", 0xb4],
  ["firered", 0xbc],
  ["leafgreen", 0xc4],
];
const WATER: [EncounterMethod, number, number[]][] = [
  ["surf", 0xcc, SURF_RATES],
  ["old-rod", 0x124, SURF_RATES],
  ["good-rod", 0x150, GOOD_ROD_RATES],
  ["super-rod", 0x17c, GOOD_ROD_RATES],
];

export interface PlatinumEncounterTable {
  id: number;
  encounters: ZoneEncounter[];
}

const validSpecies = (species: number) =>
  species >= 1 && species <= MAX_SPECIES;

/** Merges the slots of a species that share a method and a condition. */
function addSlot(
  result: Map<string, ZoneEncounter>,
  slot: ZoneEncounter,
): void {
  if (!validSpecies(slot.pokemonId) || slot.minLevel < 1 || slot.maxLevel > 100)
    return;
  const key = `${slot.method}/${slot.condition ?? ""}/${slot.pokemonId}`;
  const existing = result.get(key);
  result.set(
    key,
    existing
      ? {
          ...existing,
          rate: existing.rate + slot.rate,
          minLevel: Math.min(existing.minLevel, slot.minLevel),
          maxLevel: Math.max(existing.maxLevel, slot.maxLevel),
        }
      : slot,
  );
}

/** Wild encounters of one pl_enc_data.narc member, with each slot's chance in percent. */
export function parseEncounterTable(data: Buffer): ZoneEncounter[] {
  if (data.length < ENCOUNTER_TABLE_SIZE)
    throw new Error("This ROM's wild encounter table is unsupported.");
  const result = new Map<string, ZoneEncounter>();
  if (data.readUInt32LE(GRASS)) {
    const species = (slot: number) => data.readUInt32LE(GRASS + 8 + slot * 8);
    const level = (slot: number) => data.readInt8(GRASS + 4 + slot * 8);
    const grass = (
      slot: number,
      pokemonId: number,
      condition?: EncounterCondition,
    ) =>
      addSlot(result, {
        method: "grass",
        ...(condition ? { condition } : {}),
        pokemonId,
        rate: GRASS_RATES[slot],
        minLevel: level(slot),
        maxLevel: level(slot),
      });
    const replacement = (offset: number, index: number) =>
      data.readUInt32LE(offset + index * 4);
    // Slots 2 and 3 hold the morning species; day and night tables replace them.
    for (let slot = 0; slot < GRASS_RATES.length; slot++) {
      if (slot !== 2 && slot !== 3) {
        grass(slot, species(slot));
        continue;
      }
      const times: [EncounterCondition, number][] = [
        ["morning", species(slot)],
        ["day", replacement(DAY, slot - 2)],
        ["night", replacement(NIGHT, slot - 2)],
      ];
      if (times.every(([, pokemonId]) => pokemonId === species(slot)))
        grass(slot, species(slot));
      else
        for (const [condition, pokemonId] of times)
          grass(slot, pokemonId, condition);
    }
    const replace = (
      condition: EncounterCondition,
      offset: number,
      slots: number[],
    ) =>
      slots.forEach((slot, index) => {
        const pokemonId = replacement(offset, index);
        if (pokemonId !== species(slot)) grass(slot, pokemonId, condition);
      });
    replace("swarm", SWARM, [0, 1]);
    replace("radar", RADAR, [4, 5, 10, 11]);
    for (const [condition, offset] of DUAL_SLOTS)
      replace(condition, offset, [8, 9]);
  }
  for (const [method, offset, rates] of WATER) {
    if (!data.readUInt32LE(offset)) continue;
    rates.forEach((rate, slot) => {
      const entry = offset + 4 + slot * 8;
      addSlot(result, {
        method,
        pokemonId: data.readUInt32LE(entry + 4),
        rate,
        minLevel: data.readInt8(entry + 1),
        maxLevel: data.readInt8(entry),
      });
    });
  }
  return [...result.values()];
}

/** Finds the map header table in the ARM9, as the randomizer's map tools do. */
export function findMapHeaders(
  arm9: Buffer,
  limits: { scripts: number; events: number; encounters: number },
): { offset: number; count: number } | undefined {
  for (
    let start = 0;
    start + MAP_HEADER_SIZE * MIN_MAP_HEADERS <= arm9.length;
    start += 4
  ) {
    let count = 0;
    for (
      let entry = start;
      entry + MAP_HEADER_SIZE <= arm9.length;
      entry += MAP_HEADER_SIZE
    ) {
      const wild = arm9.readUInt16LE(entry + MAP_HEADER_WILD);
      if (
        arm9.readUInt16LE(entry + MAP_HEADER_EVENTS) >= limits.events ||
        arm9.readUInt16LE(entry + MAP_HEADER_SCRIPTS) >= limits.scripts ||
        arm9[entry + MAP_HEADER_WEATHER] > 40 ||
        (wild !== NO_ENCOUNTERS && wild >= limits.encounters)
      )
        break;
      count++;
    }
    if (count >= MIN_MAP_HEADERS) return { offset: start, count };
  }
  return undefined;
}

/** Wild encounter table of each map header, read from the ROM (randomizer-aware). */
export async function loadPlatinumEncounters(
  rom: Pick<NdsRom, "arm9" | "archive">,
): Promise<(map: number) => PlatinumEncounterTable | undefined> {
  const [arm9, scripts, events, tables] = await Promise.all([
    rom.arm9(),
    rom.archive("fielddata/script/scr_seq.narc"),
    rom.archive("fielddata/eventdata/zone_event.narc"),
    rom.archive("fielddata/encountdata/pl_enc_data.narc"),
  ]);
  const headers = findMapHeaders(arm9, {
    scripts: scripts.length,
    events: events.length,
    encounters: tables.length,
  });
  if (!headers) throw new Error("This ROM's map header table was not found.");
  const parsed = new Map<number, ZoneEncounter[]>();
  return (map) => {
    if (!Number.isInteger(map) || map < 0 || map >= headers.count) return;
    const id = arm9.readUInt16LE(
      headers.offset + map * MAP_HEADER_SIZE + MAP_HEADER_WILD,
    );
    if (id === NO_ENCOUNTERS) return;
    let encounters = parsed.get(id);
    if (!encounters) {
      encounters = parseEncounterTable(tables[id]);
      parsed.set(id, encounters);
    }
    return { id, encounters };
  };
}
