import { test } from "node:test";
import assert from "node:assert/strict";
import { MelonDsInput, NDS_KEY_INPUT } from "../desktop/melonds-input";
import { movePower } from "../src/lib/tracker/move-power";
import {
  nextBattleFocus,
  type BattleFocusSelection,
} from "../src/lib/tracker/battle-focus";
import { gameFrameSchema } from "../src/lib/tracker/schema";
import { overlayData, opponentMember } from "../src/lib/tracker/overlay";
import { capture, frame, pokemon, record } from "./fixtures";

test("STAB uses only known types, excludes status and fixed damage, and respects known Adaptability", () => {
  const move = {
    id: 52,
    pp: 20,
    type: "fire",
    power: 65,
    category: "special" as const,
  };
  assert.equal(movePower(move, { types: [], generation: 4 }).power, 65);
  assert.equal(
    movePower(move, { types: ["water"], generation: 4 }).stab,
    false,
  );
  assert.deepEqual(movePower(move, { types: ["fire"], generation: 4 }), {
    power: 97,
    basePower: 65,
    stab: true,
    variable: false,
  });
  assert.equal(
    movePower(move, { types: ["fire"], generation: 4, abilityId: 88 }).power,
    130,
  );
  assert.equal(
    movePower(
      { ...move, category: "status" },
      { types: ["fire"], generation: 4 },
    ).stab,
    false,
  );
  for (const id of [12, 32, 49, 69, 82, 90, 101, 149, 162, 283, 329])
    assert.equal(
      movePower({ ...move, id }, { types: ["fire"], generation: 4 }).stab,
      false,
    );
  assert.equal(
    movePower({ ...move, id: 237 }, { types: ["fire"], generation: 4 }).power,
    undefined,
  );
  assert.equal(
    movePower(
      { ...move, id: 237 },
      { types: ["fire"], generation: 4, hiddenPowerKnown: true },
    ).power,
    97,
  );
});

test("weight-based power covers every threshold and never guesses a missing target", () => {
  const cases = [
    [1, 20],
    [99, 20],
    [100, 40],
    [249, 40],
    [250, 60],
    [499, 60],
    [500, 80],
    [999, 80],
    [1000, 100],
    [1999, 100],
    [2000, 120],
  ];
  for (const id of [67, 447]) {
    for (const [weight, expected] of cases)
      assert.equal(
        movePower(
          { id, pp: 10, power: 1 },
          {
            types: [],
            generation: 4,
            target: { weight },
          },
        ).power,
        expected,
      );
    assert.equal(
      movePower({ id, pp: 10 }, { types: [], generation: 4 }).power,
      undefined,
    );
  }
  assert.equal(
    movePower({ id: 67, pp: 10 }, { types: [], generation: 2 }).power,
    50,
  );
  assert.equal(
    movePower(
      { id: 67, pp: 10, custom: true, power: 95 },
      { types: [], generation: 4, target: { weight: 1 } },
    ).power,
    95,
  );
});

test("HP, friendship, PP and visible stages determine only computable variable powers", () => {
  const context = { types: [], generation: 4 };
  for (const id of [175, 179]) {
    for (const [hp, expected] of [
      [1, 200],
      [2, 150],
      [5, 100],
      [10, 80],
      [17, 40],
      [33, 20],
    ])
      assert.equal(
        movePower({ id, pp: 10 }, { ...context, hp, maxHp: 48 }).power,
        expected,
      );
    assert.equal(movePower({ id, pp: 10 }, context).power, undefined);
  }
  for (const id of [284, 323]) {
    assert.equal(
      movePower({ id, pp: 5 }, { ...context, hp: 1, maxHp: 200 }).power,
      1,
    );
    assert.equal(
      movePower({ id, pp: 5 }, { ...context, hp: 100, maxHp: 200 }).power,
      75,
    );
    assert.equal(movePower({ id, pp: 5 }, context).power, undefined);
  }
  assert.equal(
    movePower({ id: 216, pp: 20 }, { ...context, friendship: 255 }).power,
    102,
  );
  assert.equal(
    movePower({ id: 218, pp: 20 }, { ...context, friendship: 0 }).power,
    102,
  );
  assert.equal(movePower({ id: 216, pp: 20 }, context).power, undefined);
  for (const [pp, expected] of [
    [5, 40],
    [4, 50],
    [3, 60],
    [2, 80],
    [1, 200],
  ])
    assert.equal(movePower({ id: 376, pp, maxPp: 5 }, context).power, expected);
  assert.equal(movePower({ id: 376, pp: 0 }, context).power, undefined);
  assert.equal(
    movePower({ id: 386, pp: 5 }, { ...context, target: {} }).power,
    60,
  );
  assert.equal(
    movePower(
      { id: 386, pp: 5 },
      {
        ...context,
        target: { statStages: { attack: 6, speed: 6, defense: -6 } },
      },
    ).power,
    200,
  );
  assert.equal(movePower({ id: 386, pp: 5 }, context).power, undefined);
  assert.equal(movePower({ id: 360, pp: 5, power: 1 }, context).variable, true);
});

test("Start cycles lead, both opponents and second owned Pokemon or NPC ally, excluding the bench", () => {
  const current = record();
  current.run.team = [capture("lead"), capture("second"), capture("bench")].map(
    (entry) => ({
      ...entry,
      gameIdentity: entry.id,
    }),
  );
  const team = overlayData(current).teams[0];
  const battle = {
    id: "battle-1",
    kind: "trainer" as const,
    isDouble: true,
    activePlayerIdentities: ["lead", "second"],
    opponents: [
      { identity: "enemy-1", pokemonId: 25, level: 10 },
      { identity: "enemy-2", pokemonId: 48, level: 10 },
    ],
  };
  let selected: BattleFocusSelection = {
    battleId: battle.id,
    memberId: "lead",
  };
  const selections = [];
  for (let index = 0; index < 4; index++) {
    const next = nextBattleFocus(battle, team, selected);
    assert.ok(next);
    selections.push(next);
    selected = next;
  }
  assert.deepEqual(selections, [
    { battleId: battle.id, opponentIdentity: "enemy-1" },
    { battleId: battle.id, opponentIdentity: "enemy-2" },
    { battleId: battle.id, memberId: "second" },
    { battleId: battle.id, memberId: "lead" },
  ]);
  const npcBattle = {
    ...battle,
    activePlayerIdentities: ["lead"],
    allies: [{ identity: "ally", pokemonId: 4, level: 10 }],
  };
  assert.deepEqual(nextBattleFocus(npcBattle, team, selections[1]), {
    battleId: battle.id,
    allyIdentity: "ally",
  });
  const single = {
    ...battle,
    isDouble: false,
    activePlayerIdentities: ["lead"],
    opponents: battle.opponents.slice(0, 1),
  };
  assert.equal(nextBattleFocus(single, team)?.memberId, "lead");
  assert.equal(
    nextBattleFocus(single, team, { battleId: "old", memberId: "bench" })
      ?.memberId,
    "lead",
  );
});

test("Start sampling reads the emulated keypad, ignores holds and only emits for the current battle", async () => {
  let now = 0,
    buttons = 0x03ff;
  const presses: string[] = [];
  const reads: number[] = [];
  const input = new MelonDsInput(
    {
      async readMemory(address, length) {
        reads.push(address);
        const data = Buffer.alloc(length);
        if (address === NDS_KEY_INPUT) data.writeUInt16LE(buttons);
        return data;
      },
    },
    (id) => presses.push(id),
    () => now,
  );
  const sample = async (held: boolean) => {
    buttons = held ? 0x03f7 : 0x03ff;
    now += 40;
    await input.readMemory(0x02000000, 4);
  };
  await sample(true);
  input.setBattle("one");
  await sample(true);
  assert.deepEqual(presses, []);
  await sample(false);
  await sample(true);
  await sample(true);
  await sample(true);
  assert.deepEqual(presses, ["one"]);
  input.setBattle("two");
  await sample(true);
  await sample(false);
  await sample(true);
  assert.deepEqual(presses, ["one", "two"]);
  input.setBattle();
  await sample(false);
  await sample(true);
  assert.deepEqual(presses, ["one", "two"]);
  assert.equal(reads.filter((address) => address === NDS_KEY_INPUT).length, 11);
});

test("battle PP are individual, current-battle data; double targets and hidden fields are not inferred", () => {
  const current = record();
  const next = frame();
  next.battle = {
    id: "battle",
    kind: "wild",
    opponents: [
      {
        identity: "enemy",
        pokemonId: 48,
        level: 5,
        weight: 300,
        movePp: [{ id: 52, pp: 24, maxPp: 25 }],
      },
    ],
  };
  const parsed = gameFrameSchema.parse(next);
  const enemy = opponentMember(
    current.run,
    "solo",
    parsed.battle!.opponents[0],
    pokemon(48),
    [52, 45],
  );
  assert.deepEqual(enemy.movePp, [{ id: 52, pp: 24, maxPp: 25 }]);
  const other = opponentMember(
    current.run,
    "solo",
    { identity: "other", pokemonId: 48, level: 5 },
    pokemon(48),
    [52],
  );
  assert.equal(other.movePp, undefined);
  current.tracking.solo = {
    game: next.game,
    sessionId: next.sessionId,
    sequence: next.sequence,
    frame: next.frame,
    lastSeenAt: 1,
    latest: next,
    suspended: false,
    pendingPokemon: [],
    ignoredIdentities: [],
    zoneMappings: {},
    retiredSessions: [],
  };
  assert.equal(overlayData(current).teams[0].powerTarget?.weight, 300);
  next.battle.isDouble = true;
  assert.equal(overlayData(current).teams[0].powerTarget, undefined);
  delete next.battle.isDouble;
  next.battle.opponents.push({
    identity: "second-enemy",
    pokemonId: 25,
    level: 5,
    weight: 600,
  });
  assert.equal(
    overlayData(current).teams[0].powerTarget,
    undefined,
    "Older connector frames with multiple opponents must not infer a target either.",
  );
  const invalid = structuredClone(next);
  invalid.battle!.opponents[0].movePp![0].pp = 26;
  assert.equal(gameFrameSchema.safeParse(invalid).success, false);
  assert.equal(
    gameFrameSchema.safeParse({
      ...next,
      battle: {
        ...next.battle,
        opponents: [
          { ...next.battle.opponents[0], hp: 20, moves: [{ id: 1 }] },
        ],
      },
    }).success,
    false,
  );
});

test("Start sampling throttles serialized reads and propagates keypad failures", async () => {
  let samples = 0;
  const input = new MelonDsInput(
    {
      async readMemory(address, length) {
        if (address === NDS_KEY_INPUT) samples++;
        return Buffer.alloc(length, 0xff);
      },
    },
    () => assert.fail("No Start press was sent."),
    () => 0,
  );
  await input.readMemory(0x02000000, 4);
  await input.readMemory(0x02000004, 4);
  await input.sample();
  assert.equal(samples, 1);
  const failure = new Error("Keypad read failed.");
  const broken = new MelonDsInput(
    {
      async readMemory() {
        throw failure;
      },
    },
    () => {},
  );
  await assert.rejects(broken.readMemory(0x02000000, 4), failure);
});
