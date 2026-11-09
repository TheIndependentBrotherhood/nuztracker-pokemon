import { randomUUID } from "node:crypto";
import type { GameFrame, LivePokemon } from "../src/lib/tracker/types";
import { gameFrameSchema } from "../src/lib/tracker/schema";
import { sharedGdbClient, type ReadOnlyGdbClient } from "./gdb-client";
import { NdsRom } from "./nds-rom";
import { decodePk4, SnapshotError, type DecodedPk4 } from "./pk4";
import { loadPlatinumData, type PlatinumBattleData } from "./platinum-data";
import {
  CONTEXT_BATTLERS_OFFSET,
  CONTEXT_DAMAGE_BLOCK_SIZE,
  CONTEXT_DAMAGE_OFFSET,
  CONTEXT_FIELD_CONDITIONS_OFFSET,
  CONTEXT_MOVE_CUR_OFFSET,
  CONTEXT_TURN_FLAGS_OFFSET,
  CONTEXT_TURN_FLAGS_SIZE,
  classifyEffectiveness,
  damageBlockFields,
  hasMoveResult,
  readEffectivenessMon,
  type EffectivenessOutcome,
  type EffectivenessSample,
} from "./platinum-effectiveness";

const isRam = (address: number, size = 4) =>
  address >= 0x02000000 && address + size <= 0x02400000 && address % 4 === 0;
const hex = (value: number) => value.toString(16).padStart(8, "0");
export type PlatinumLayout = "standard" | "project-pm";

const PK4_SIZE = 236;
const BATTLE_OVERLAY_ID = 16;
const APPLICATION_RUNNING = 2;
const BATTLE_MON_OFFSET = 0x2d80;
const BATTLE_MON_SIZE = 0xc0;
// AIContext.battlerAbilities: the game stores an ability there whenever a battle message names it,
// and clears it when the battler switches out. It therefore only holds abilities revealed on screen.
const CONTEXT_REVEALED_ABILITIES_OFFSET = 0x390;
const MAX_ABILITY_ID = 123;
// BattleMon fields (pret/pokeplatinum include/battle/battle_mon.h).
const BATTLE_MON_MOVES = 0x0c;
const BATTLE_MON_PP = 0x2c;
const BATTLE_MON_VOLATILE = 0x70;
const VOLATILE_CONDITION_TRANSFORM = 1 << 21;
const BATTLE_TRAINER = 1 << 0;
const BATTLE_DOUBLES = 1 << 1;
const BATTLE_LINK = 1 << 2;
const BATTLE_2VS2 = 1 << 3;
const BATTLE_PAL_PARK = 1 << 9;
const BATTLE_CATCH_TUTORIAL = 1 << 10;
// Observed live on MelonDS: wild single (0), trainer double (0x3). Trainer singles (0x1) differ from
// the wild layout only by the trainer flag.
const VALIDATED_BATTLE_TYPES = new Set([
  0,
  BATTLE_TRAINER,
  BATTLE_TRAINER | BATTLE_DOUBLES,
]);
// The game copies the battle party back to the save a few frames after the battle closes.
const BATTLE_COPY_BACK_FRAMES = 600;
// The overworld re-encrypts party records across frame boundaries, so a record can need a few tries.
const RECORD_ATTEMPTS = 4;
const UNSTABLE_REPORT_MS = 5000;
const TRANSIENT_ERROR_REPORT_MS = 2500;
const POKE_BALL_POCKET_OFFSET = 0xd00;
const POKE_BALL_POCKET_SLOTS = 15;
const MAX_ITEM_ID = 0x3ff;
const partyChanged = () =>
  new SnapshotError(
    "The party changed while reading. Waiting for a consistent snapshot.",
  );
const fingerprint = (party: DecodedPk4[]) =>
  JSON.stringify(
    party.map(({ personality, heldItemId, pokemon }) => [
      personality,
      heldItemId,
      pokemon,
    ]),
  );

type FrameBattle = NonNullable<GameFrame["battle"]>;
interface BattleRead {
  battle: FrameBattle;
  team: Map<string, DecodedPk4>;
  side?: number;
  warning?: string;
  verify: { child: number; system: number };
  effectiveness?: {
    pokemonId: number;
    attackType: string;
    outcome: EffectivenessOutcome;
    moveId: number;
  };
  usedMoves: { identity: string; pokemonId: number; moveId: number }[];
  revealedAbilities: {
    identity: string;
    pokemonId: number;
    abilityId: number;
  }[];
}

interface OpponentMoves {
  species: number;
  moves: number[];
  pp: number[];
}

export class PlatinumReader {
  private readonly sessionId = randomUUID();
  private sequence = 0;
  private previousFrame?: number;
  private battleCount = 0;
  private battleState?: {
    system: number;
    id: string;
    side?: number;
    activeIdentity?: string;
  };
  private afterBattle?: {
    savedParty: string;
    team: Map<string, DecodedPk4>;
    expiresAt: number;
  };
  private pendingEffectiveness?: string;
  // Opponent moves and PP from the previous poll, keyed by battle system and battler identity.
  private opponentMoves = new Map<string, OpponentMoves>();
  private opponentMovesSystem?: number;
  constructor(
    private readonly memory: Pick<ReadOnlyGdbClient, "readMemory">,
    private readonly rom: Pick<NdsRom, "gameCode" | "revision" | "romHash">,
    private readonly enrich: (pokemon: DecodedPk4) => LivePokemon,
    private readonly maps: string[],
    private readonly battleData?: PlatinumBattleData,
  ) {}

  static async create(
    memory: ReadOnlyGdbClient,
    rom: NdsRom,
    maps: string[],
  ): Promise<PlatinumReader> {
    const data = await loadPlatinumData(rom);
    return new PlatinumReader(memory, rom, data.enrich, maps, data.battle);
  }

  private async u32(address: number): Promise<number> {
    return (await this.memory.readMemory(address, 4)).readUInt32LE(0);
  }

  // Total count in the bag's Poké Ball pocket (save offset 0xCEC, mapped 0x14 after the party root).
  // Returns undefined when the pocket does not look like valid ball entries.
  private async readPokeBalls(root: number): Promise<number | undefined> {
    const pocket = await this.memory.readMemory(
      root + POKE_BALL_POCKET_OFFSET,
      POKE_BALL_POCKET_SLOTS * 4,
    );
    let total = 0;
    for (let slot = 0; slot < POKE_BALL_POCKET_SLOTS; slot++) {
      const item = pocket.readUInt16LE(slot * 4);
      const count = pocket.readUInt16LE(slot * 4 + 2);
      if (!item) continue;
      if (item > MAX_ITEM_ID || count > 999) return undefined;
      total += count;
    }
    return total;
  }

  // Every record is fetched with one GDB request, which MelonDS answers from a single emulated
  // frame. A record caught while the game decrypts or re-encrypts it fails its checksum.
  private async readRecord(
    address: number,
    raw?: Buffer,
  ): Promise<DecodedPk4 | null> {
    for (let attempt = 1; ; attempt++) {
      raw ??= await this.memory.readMemory(address, PK4_SIZE);
      try {
        return decodePk4(raw);
      } catch (error) {
        if (!(error instanceof SnapshotError) || attempt >= RECORD_ATTEMPTS)
          throw error;
        raw = undefined;
      }
    }
  }

  async read(): Promise<{ frame: GameFrame; layout: PlatinumLayout }> {
    // MelonDS answers one GDB packet per emulated frame, so nearby fields are read together.
    const system = await this.memory.readMemory(0x027ffc3c, 0x1e4);
    const header = system.subarray(0x1c4);
    if (
      header.toString("ascii", 12, 16) !== this.rom.gameCode ||
      header[30] !== this.rom.revision
    )
      throw new Error(
        "The loaded game does not match the selected Platinum ROM header.",
      );
    const counter = system.readUInt32LE(0);
    const global = await this.u32(0x02000ba8);
    if (!isRam(global, 0x28))
      throw new Error("Waiting for Platinum to finish loading a saved game.");
    const globalFields = await this.memory.readMemory(global + 0x10, 0x18);
    const pointers = globalFields.subarray(0x10);
    const candidates: {
      root: number;
      layout: PlatinumLayout;
      count: number;
      trainerId: number;
    }[] = [];
    for (const [offset, layout] of [
      [0, "standard"],
      [4, "project-pm"],
    ] as const) {
      const root = pointers.readUInt32LE(offset);
      if (!isRam(root, 0x1298)) continue;
      const fields = await this.memory.readMemory(root + 0x8c, 0x28);
      const count = fields.readUInt32LE(0x24);
      if (fields.readUInt32LE(0x20) === 6 && count >= 1 && count <= 6)
        candidates.push({
          root,
          layout,
          count,
          trainerId: fields.readUInt32LE(0),
        });
    }
    if (candidates.length !== 1)
      throw new Error(
        "No unique supported party layout was found. Enter the game with at least one Pokemon; other ROM hacks are not supported.",
      );
    const { root, layout, count, trainerId } = candidates[0];
    const head = await this.memory.readMemory(root + 0xac, 8 + PK4_SIZE);
    if (head.readUInt32LE(4) !== count) throw partyChanged();
    const saved: DecodedPk4[] = [];
    const identities = new Set<string>();
    for (let slot = 0; slot < count; slot++) {
      const pokemon = await this.readRecord(
        root + 0xb4 + slot * PK4_SIZE,
        slot ? undefined : head.subarray(8),
      );
      if (!pokemon) continue;
      if (identities.has(pokemon.pokemon.identity)) throw partyChanged();
      identities.add(pokemon.pokemon.identity);
      saved.push(pokemon);
    }
    if (
      (await this.memory.readMemory(root + 0xac, 8)).readUInt32LE(4) !==
        count ||
      !(await this.memory.readMemory(global + 0x20, 8)).equals(pointers)
    )
      throw partyChanged();
    const savedParty = fingerprint(saved);
    const map = await this.u32(root + 0x1294);
    const pokeBalls = await this.readPokeBalls(root);
    const stateLoaded =
      this.previousFrame !== undefined && counter < this.previousFrame;
    let battle = await this.readBattle(
      globalFields.readUInt32LE(0),
      root,
      saved,
      stateLoaded,
    );
    if (
      battle &&
      (await this.battleSystem(battle.verify.child)) !== battle.verify.system
    )
      battle = undefined;
    const warnings: string[] = [];
    let team: Map<string, DecodedPk4> | undefined;
    if (battle) {
      team = battle.team;
      this.afterBattle = {
        savedParty,
        team,
        expiresAt: counter + BATTLE_COPY_BACK_FRAMES,
      };
      if (battle.warning) warnings.push(battle.warning);
    } else {
      this.battleState = undefined;
      this.pendingEffectiveness = undefined;
      this.opponentMoves.clear();
      this.opponentMovesSystem = undefined;
      const after = this.afterBattle;
      if (
        after &&
        (stateLoaded ||
          counter > after.expiresAt ||
          savedParty !== after.savedParty)
      )
        this.afterBattle = undefined;
      team = this.afterBattle?.team;
    }
    const decoded = saved.map(
      (pokemon) => team?.get(pokemon.pokemon.identity) ?? pokemon,
    );
    if (decoded.some((pokemon) => pokemon.nicknameUnsupported))
      warnings.push(
        "Some nicknames contain unsupported characters. Their existing names were preserved.",
      );
    const frame = gameFrameSchema.parse({
      protocolVersion: 1,
      connector: `melonds-platinum-${layout}`,
      sessionId: this.sessionId,
      sequence: ++this.sequence,
      frame: counter,
      game: {
        gameCode: this.rom.gameCode,
        revision: this.rom.revision,
        romHash: this.rom.romHash,
        language: this.rom.gameCode === "CPUF" ? "fr" : "en",
        trainerId: hex(trainerId),
      },
      party: decoded.map(this.enrich),
      location: {
        id: `platinum-${map}`,
        name: this.maps[map] ?? `Platinum map #${map}`,
      },
      ...(battle ? { battle: battle.battle } : {}),
      ...(pokeBalls === undefined ? {} : { pokeBalls }),
      observations: [
        ...(battle?.effectiveness
          ? [
              {
                id: `eff-${battle.effectiveness.pokemonId}-${battle.effectiveness.attackType}-${battle.effectiveness.outcome}`,
                encounterId: battle.battle.id,
                pokemonId: battle.effectiveness.pokemonId,
                kind: "effectiveness" as const,
                value: battle.effectiveness.outcome,
                attackType: battle.effectiveness.attackType,
                moveId: battle.effectiveness.moveId,
              },
            ]
          : []),
        ...(battle?.usedMoves ?? []).map((used) => ({
          // One observation per battle and opponent keeps the latest sighting without flooding the history.
          id: `move-${battle!.battle.id}-${used.identity}-${used.moveId}`,
          encounterId: battle!.battle.id,
          pokemonId: used.pokemonId,
          kind: "move" as const,
          value:
            this.battleData?.moveName(used.moveId) ?? `Move #${used.moveId}`,
          moveId: used.moveId,
        })),
        ...(battle?.revealedAbilities ?? []).map((revealed) => ({
          id: `ability-${battle!.battle.id}-${revealed.identity}-${revealed.abilityId}`,
          encounterId: battle!.battle.id,
          pokemonId: revealed.pokemonId,
          kind: "ability" as const,
          value:
            this.battleData?.abilityName(revealed.abilityId) ??
            `Ability #${revealed.abilityId}`,
          abilityId: revealed.abilityId,
        })),
      ],
      stateLoaded,
      warnings,
    });
    this.previousFrame = counter;
    if (battle) {
      this.battleState = {
        system: battle.verify.system,
        id: battle.battle.id,
        side: battle.side,
        activeIdentity: battle.battle.activePlayerIdentity,
      };
    }
    return { frame, layout };
  }

  private async battleSystem(child: number): Promise<number | undefined> {
    const application = await this.memory.readMemory(child + 0x0c, 0x14);
    const system = application.readUInt32LE(0x10);
    return application.readUInt32LE(0) === BATTLE_OVERLAY_ID &&
      application.readUInt32LE(4) === APPLICATION_RUNNING &&
      isRam(system, 0x78)
      ? system
      : undefined;
  }

  // Follows FieldSystem -> running child application -> BattleSystem. Only the player's
  // battle party copy and the battlers currently shown on screen are read.
  private async readBattle(
    holder: number,
    root: number,
    saved: DecodedPk4[],
    stateLoaded: boolean,
  ): Promise<BattleRead | undefined> {
    if (!isRam(holder, 0x20)) return undefined;
    const field = await this.u32(holder + 0x1c);
    if (!isRam(field, 0x10)) return undefined;
    const fieldHeader = await this.memory.readMemory(field, 0x10);
    const manager = fieldHeader.readUInt32LE(0);
    if (fieldHeader.readUInt32LE(0x0c) !== root || !isRam(manager, 8))
      return undefined;
    const child = await this.u32(manager + 4);
    if (!isRam(child, 0x20)) return undefined;
    const system = await this.battleSystem(child);
    if (system === undefined) return undefined;
    const fields = await this.memory.readMemory(system + 0x2c, 0x4c);
    const type = fields.readUInt32LE(0);
    const context = fields.readUInt32LE(0x04);
    const battlerCount = fields.readUInt32LE(0x18);
    if (
      type & (BATTLE_PAL_PARK | BATTLE_CATCH_TUTORIAL) ||
      (battlerCount !== 2 && battlerCount !== 4) ||
      !isRam(context, BATTLE_MON_OFFSET + 4 * BATTLE_MON_SIZE)
    )
      return undefined;
    const mons = await this.memory.readMemory(
      context + BATTLE_MON_OFFSET,
      battlerCount * BATTLE_MON_SIZE,
    );
    const savedIdentities = new Set(
      saved.map(({ pokemon }) => pokemon.identity),
    );
    const battlers = Array.from({ length: battlerCount }, (_, index) => {
      const mon = mons.subarray(
        index * BATTLE_MON_SIZE,
        (index + 1) * BATTLE_MON_SIZE,
      );
      const species = mon.readUInt16LE(0x00);
      const level = mon[0x34];
      const pid = mon.readUInt32LE(0x68);
      return {
        index,
        species,
        level,
        pid,
        visible: species >= 1 && species <= 493 && level >= 1 && level <= 100,
        // A fainted battler keeps its data until replaced; doubles may leave its slot empty.
        fainted: mon.readInt32LE(0x4c) <= 0,
        identity: `${hex(pid)}-${hex(mon.readUInt32LE(0x74))}`,
      };
    });
    const previous =
      !stateLoaded && this.battleState?.system === system
        ? this.battleState
        : undefined;
    const ours = battlers.filter(
      (battler) => battler.visible && savedIdentities.has(battler.identity),
    );
    // Battlers 0/2 and 1/3 share a side; in link battles the local player may be on either.
    const side =
      type & BATTLE_LINK
        ? ours.length
          ? ours[0].index & 1
          : previous?.side
        : 0;
    const onSide = ours.filter((battler) => (battler.index & 1) === side);
    const active =
      side === undefined
        ? undefined
        : (onSide.find((battler) => !battler.fainted) ?? onSide[0]);
    // Transform can replace the battler's personality value for the rest of the switch-in.
    const activeIdentity =
      active?.identity ??
      (previous?.activeIdentity && savedIdentities.has(previous.activeIdentity)
        ? previous.activeIdentity
        : undefined);
    const activeIdentities = ours
      .filter((battler) => !battler.fainted)
      .map((battler) => battler.identity);
    const team = new Map<string, DecodedPk4>();
    if (side !== undefined) {
      const battler = active?.index ?? side;
      const partyIndex =
        type & BATTLE_2VS2
          ? battler
          : type & BATTLE_DOUBLES
            ? battler & 1
            : battler;
      const partyAddress = fields.readUInt32LE(0x3c + partyIndex * 4);
      if (isRam(partyAddress, 8 + 6 * PK4_SIZE)) {
        const head = await this.memory.readMemory(partyAddress, 8 + PK4_SIZE);
        const partyCount = head.readUInt32LE(4);
        if (head.readUInt32LE(0) === 6 && partyCount >= 1 && partyCount <= 6) {
          const savedPersonalities = new Set(
            saved.map((pokemon) => pokemon.personality),
          );
          for (let slot = 0; slot < partyCount; slot++) {
            const address = partyAddress + 8 + slot * PK4_SIZE;
            const raw = slot
              ? await this.memory.readMemory(address, PK4_SIZE)
              : head.subarray(8);
            // The personality value is never touched by encryption, so unknown records are skipped undecoded.
            if (!savedPersonalities.has(raw.readUInt32LE(0))) continue;
            const pokemon = await this.readRecord(address, raw);
            if (!pokemon || !savedIdentities.has(pokemon.pokemon.identity))
              continue;
            if (team.has(pokemon.pokemon.identity))
              throw new SnapshotError(
                "The battle party changed while reading. Waiting for a consistent snapshot.",
              );
            team.set(pokemon.pokemon.identity, pokemon);
          }
        }
      }
    }
    const opponents =
      side === undefined
        ? []
        : battlers
            .filter(
              (battler) =>
                battler.visible &&
                !battler.fainted &&
                (battler.index & 1) !== side,
            )
            .map((battler) => {
              const learnLevels = this.battleData?.learnLevels(battler.species);
              const evolutions = this.battleData?.evolutions(battler.species);
              return {
                identity: `${hex(battler.pid)}-${battler.index}`,
                pokemonId: battler.species,
                level: battler.level,
                position: battler.index,
                ...(learnLevels ? { learnLevels } : {}),
                ...(evolutions ? { evolutions } : {}),
              };
            });
    const kind = type & BATTLE_TRAINER ? "trainer" : "wild";
    // Wild encounters keep the same id when a save state replays the same Pokemon.
    const id =
      kind === "wild" && opponents.length
        ? `platinum-wild-${opponents
            .map((opponent) => opponent.identity.slice(0, 8))
            .sort()
            .join("-")}`
        : (previous?.id ?? `${this.sessionId}-battle-${++this.battleCount}`);
    const warning =
      side === undefined
        ? "The local side of this link battle is not identified yet. Opponents are hidden until your Pokemon is on the field."
        : VALIDATED_BATTLE_TYPES.has(type)
          ? undefined
          : `Battle type 0x${type.toString(16)} has not been validated yet. Check in-battle HP and opponents against the game.`;
    const effectiveness =
      battlerCount === 2 && !stateLoaded
        ? await this.readEffectiveness(context, mons)
        : undefined;
    const revealed = opponents.length
      ? await this.memory.readMemory(
          context + CONTEXT_REVEALED_ABILITIES_OFFSET,
          4,
        )
      : undefined;
    const revealedAbilities = opponents.flatMap((opponent) => {
      const abilityId = revealed?.[opponent.position] ?? 0;
      return abilityId >= 1 && abilityId <= MAX_ABILITY_ID
        ? [
            {
              identity: opponent.identity,
              pokemonId: opponent.pokemonId,
              abilityId,
            },
          ]
        : [];
    });
    const usedMoves = this.usedOpponentMoves(
      system,
      stateLoaded,
      mons,
      opponents,
    );
    return {
      battle: {
        id,
        kind,
        ...(activeIdentity ? { activePlayerIdentity: activeIdentity } : {}),
        ...(activeIdentities.length
          ? { activePlayerIdentities: activeIdentities }
          : {}),
        opponents,
      },
      team,
      side,
      verify: { child, system },
      ...(warning ? { warning } : {}),
      ...(effectiveness ? { effectiveness } : {}),
      usedMoves,
      revealedAbilities,
    };
  }

  // A drop in an opponent's PP means the game executed that move; its hidden moveset is never reported.
  private usedOpponentMoves(
    system: number,
    stateLoaded: boolean,
    mons: Buffer,
    opponents: FrameBattle["opponents"],
  ): BattleRead["usedMoves"] {
    if (stateLoaded || this.opponentMovesSystem !== system)
      this.opponentMoves.clear();
    this.opponentMovesSystem = system;
    const used: BattleRead["usedMoves"] = [];
    const current = new Map<string, OpponentMoves>();
    for (const opponent of opponents) {
      const index = opponent.position ?? 1;
      const mon = mons.subarray(
        index * BATTLE_MON_SIZE,
        (index + 1) * BATTLE_MON_SIZE,
      );
      // Transform copies the target's moves, which are not this species' moves.
      if (mon.readUInt32LE(BATTLE_MON_VOLATILE) & VOLATILE_CONDITION_TRANSFORM)
        continue;
      const entry: OpponentMoves = {
        species: opponent.pokemonId,
        moves: [0, 1, 2, 3].map((slot) =>
          mon.readUInt16LE(BATTLE_MON_MOVES + slot * 2),
        ),
        pp: [0, 1, 2, 3].map((slot) => mon[BATTLE_MON_PP + slot]),
      };
      current.set(opponent.identity, entry);
      const previous = this.opponentMoves.get(opponent.identity);
      if (
        !previous ||
        previous.species !== entry.species ||
        previous.moves.some((move, slot) => move !== entry.moves[slot])
      )
        continue;
      entry.moves.forEach((moveId, slot) => {
        if (moveId >= 1 && moveId <= 467 && entry.pp[slot] < previous.pp[slot])
          used.push({
            identity: opponent.identity,
            pokemonId: opponent.pokemonId,
            moveId,
          });
      });
    }
    this.opponentMoves = current;
    return used;
  }

  // Reports the type matchup of the move being executed once two polls agree on it, so a context
  // caught between two moves is never reported.
  private async readEffectiveness(
    context: number,
    mons: Buffer,
  ): Promise<BattleRead["effectiveness"]> {
    if (!this.battleData) return undefined;
    const damageBlock = await this.memory.readMemory(
      context + CONTEXT_DAMAGE_OFFSET,
      CONTEXT_DAMAGE_BLOCK_SIZE,
    );
    if (!hasMoveResult(damageBlock)) {
      this.pendingEffectiveness = undefined;
      return undefined;
    }
    const battlers = await this.memory.readMemory(
      context + CONTEXT_BATTLERS_OFFSET,
      0x0c,
    );
    const attacker = battlers.readUInt32LE(0);
    const defender = battlers.readUInt32LE(8);
    if (attacker > 1 || defender > 1) return undefined;
    const monAt = (index: number) =>
      readEffectivenessMon(
        mons.subarray(index * BATTLE_MON_SIZE, (index + 1) * BATTLE_MON_SIZE),
      );
    const sample: EffectivenessSample = {
      attacker,
      defender,
      moveCur: (
        await this.memory.readMemory(context + CONTEXT_MOVE_CUR_OFFSET, 4)
      ).readUInt32LE(0),
      ...damageBlockFields(damageBlock),
      fieldConditions: await this.u32(
        context + CONTEXT_FIELD_CONDITIONS_OFFSET,
      ),
      defenderTurnFlags: await this.u32(
        context +
          CONTEXT_TURN_FLAGS_OFFSET +
          defender * CONTEXT_TURN_FLAGS_SIZE,
      ),
      attackerMon: monAt(attacker),
      defenderMon: monAt(defender),
    };
    const key = JSON.stringify(sample);
    const stable = key === this.pendingEffectiveness;
    this.pendingEffectiveness = key;
    if (!stable) return undefined;
    const result = classifyEffectiveness(sample, this.battleData);
    return result && { ...result, moveId: sample.moveCur };
  }
}

export class MelonDsConnector {
  private readonly cancel = new AbortController();
  private rom?: NdsRom;
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private polling?: Promise<void>;

  async start(
    path: string,
    port: number,
    maps: string[],
    onFrame: (frame: GameFrame, layout: PlatinumLayout) => void,
    onError: (error: unknown, disconnected: boolean) => void,
  ): Promise<void> {
    this.rom = await NdsRom.open(path);
    try {
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
      // Stopping the connector keeps this connection open so that reconnecting does not need a MelonDS reset.
      const memory = sharedGdbClient(port);
      const reader = await PlatinumReader.create(memory, this.rom, maps);
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
      await memory.connect(port, { signal: this.cancel.signal });
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
      let unstableSince: number | undefined;
      const poll = async () => {
        let delay = 250;
        try {
          const { frame, layout } = await reader.read();
          unstableSince = undefined;
          if (!this.stopped) onFrame(frame, layout);
        } catch (error) {
          if (error instanceof SnapshotError) {
            // Records being rewritten are expected for a moment; only a lasting inconsistency is reported.
            unstableSince ??= Date.now();
            if (
              !this.stopped &&
              Date.now() - unstableSince >= UNSTABLE_REPORT_MS
            )
              onError(error, false);
          } else {
            delay = 1000;
            // Transitions can briefly expose an unreadable state; only a lasting failure or a disconnection is reported.
            unstableSince ??= Date.now();
            if (
              !this.stopped &&
              (!memory.isConnected ||
                Date.now() - unstableSince >= TRANSIENT_ERROR_REPORT_MS)
            )
              onError(error, !memory.isConnected);
          }
        } finally {
          if (!this.stopped && memory.isConnected)
            this.timer = setTimeout(() => {
              this.polling = poll();
            }, delay);
        }
      };
      this.polling = poll();
      await this.polling;
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.cancel.abort();
    clearTimeout(this.timer);
    try {
      await this.polling;
    } finally {
      const rom = this.rom;
      this.rom = undefined;
      await rom?.close();
    }
  }
}
