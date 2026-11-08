import { z } from "zod";
import { POKEMON_STAT_NAMES } from "../types";
import { GAME_VERSIONS } from "../game-catalog";
import type { Run, RunKnowledge, PokemonData } from "../types";
import type {
  DesktopEvent,
  DesktopStatus,
  GameFrame,
  LivePokemon,
  RunRecord,
  RunEdit,
} from "./types";

const id = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w:.-]+$/);
const text = z.string().max(500);
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const playerIndex = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
const speciesId = z.number().int().min(-1).max(100000);
const speciesMap = <T extends z.ZodType>(value: T) =>
  z.record(z.string().regex(/^-?\d+$/), value);
const typeNames = z.array(z.string().max(40)).max(2);
const spriteSet = z.object({
  default: z.string().max(4000),
  alternatives: z.array(z.string().max(4000)).max(1000),
  excludeUrls: z.array(z.string().max(4000)).max(1000).optional(),
});

export const pokemonSchema: z.ZodType<PokemonData> = z.object({
  id: speciesId,
  technicalName: text,
  alternativeTechnicalNames: z.array(text).max(100).optional(),
  names: z.object({ en: text.optional(), fr: text.optional() }).optional(),
  generation: z.number().int().min(1).max(20),
  captureRate: z.number().min(0).max(255).optional(),
  types: typeNames,
  abilities: z
    .array(
      z.object({
        ability: z.object({ name: text, url: z.string().max(4000) }),
        is_hidden: z.boolean(),
        slot: z.number().int(),
      }),
    )
    .max(20),
  stats: z
    .array(
      z.object({
        base_stat: z.number().nonnegative(),
        stat: z.object({ name: text }),
      }),
    )
    .max(10),
  height: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  sprites: z.object({ normal: spriteSet, shiny: spriteSet }),
});

export const captureSchema = z.object({
  id,
  pokemon: pokemonSchema,
  nickname: text.optional(),
  gender: z.enum(["male", "female", "unknown"]),
  isShiny: z.boolean(),
  isDead: z.boolean(),
  failedCapture: z.boolean().optional(),
  customTypes: typeNames.optional(),
  ability: text.optional(),
  selectedSprite: z
    .object({
      url: z.string().max(4000),
      source: z.enum(["alternatives", "default"]),
      label: text.optional(),
      unownLetter: text.optional(),
    })
    .optional(),
  createdAt: timestamp,
  diedAt: timestamp.optional(),
  originalCapturedPokemonId: speciesId.optional(),
  playerIndex: playerIndex.optional(),
  killedByPlayerIndex: playerIndex.optional(),
  linkedDeath: z.boolean().optional(),
  gameIdentity: id.optional(),
  soulLinkGroupId: id.optional(),
});

const knowledgeShape = {
  customTypesByPokemonId: speciesMap(typeNames).optional(),
  customAbilitiesByPokemonId: speciesMap(z.array(text).max(3)).optional(),
  statAnnotationsByPokemonId: speciesMap(
    z.partialRecord(z.enum(POKEMON_STAT_NAMES), z.enum(["high", "low"])),
  ).optional(),
  pokedexObservationsByPokemonId: speciesMap(
    z
      .array(
        z.object({
          id,
          type: z.enum(["immunity", "weakness", "resistance", "neutral"]),
          observationType: z.string().max(40),
          createdAt: timestamp,
        }),
      )
      .max(10000),
  ).optional(),
  pokedexNotesByPokemonId: speciesMap(z.string().max(20000)).optional(),
  evolutionHistoryByPokemonId: speciesMap(
    z
      .array(
        z.object({
          pokemonId: speciesId,
          technicalName: text,
          timestamp,
        }),
      )
      .max(10000),
  ).optional(),
};

export const knowledgeSchema: z.ZodType<RunKnowledge> =
  z.object(knowledgeShape);

const zoneSchema = z.object({
  id,
  zoneName: text,
  zoneNames: z.object({ fr: text.optional(), en: text.optional() }).optional(),
  regionArea: text,
  status: z.enum(["not-visited", "captured", "lost"]),
  captures: z.array(captureSchema).max(1000),
  updatedAt: timestamp,
});

export const runSchema: z.ZodType<Run> = z
  .object({
    id,
    gameName: text.min(1),
    gameVersion: z.enum(GAME_VERSIONS.map((game) => game.id)).optional(),
    region: text.min(1),
    difficulty: z.enum(["easy", "normal", "hard"]),
    isShinyHuntMode: z.boolean(),
    isRandomMode: z.boolean(),
    isSoulLinkMode: z.boolean().optional(),
    soulLinkPlayers: z
      .array(
        z.object({
          id,
          name: text.min(1),
          playerIndex,
        }),
      )
      .min(2)
      .max(4)
      .optional(),
    playerTeams: z
      .record(z.string().regex(/^[0-3]$/), z.array(captureSchema).max(6))
      .optional(),
    playerKnowledge: z.record(id, knowledgeSchema).optional(),
    randomizerOptions: z
      .object({
        randomizeTypes: z.boolean(),
        randomizeAbilities: z.boolean(),
        randomizeEncounters: z.boolean(),
        randomizeEvolvedForms: z.boolean(),
        randomizeStats: z.boolean(),
      })
      .optional(),
    ...knowledgeShape,
    status: z.enum(["in-progress", "completed", "abandoned"]),
    zones: z.array(zoneSchema).max(5000),
    removedZones: z.array(zoneSchema).max(5000).optional(),
    pokedexAddedPokemonIds: z.array(speciesId).max(10000).optional(),
    pokedexRemovedPokemonIds: z.array(speciesId).max(10000).optional(),
    team: z.array(captureSchema).max(6),
    typeChartGeneration: z.enum(["gen1", "gen2-5", "gen6+"]),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .superRefine((run, context) => {
    const unique = (values: string[], label: string) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${label} must be unique.`,
        });
      }
    };
    unique(
      run.zones.map((zone) => zone.id),
      "Zone IDs",
    );
    unique(
      run.zones.flatMap((zone) => zone.captures.map((capture) => capture.id)),
      "Capture IDs",
    );
    if (run.isSoulLinkMode) {
      if (!run.soulLinkPlayers)
        context.addIssue({
          code: "custom",
          message: "SoulLink players are required.",
        });
      unique(
        run.soulLinkPlayers?.map((player) => player.id) ?? [],
        "Player IDs",
      );
      unique(
        run.soulLinkPlayers?.map((player) => String(player.playerIndex)) ?? [],
        "Player indexes",
      );
      const indexes = new Set(
        run.soulLinkPlayers?.map((player) => player.playerIndex),
      );
      for (const capture of run.zones.flatMap((zone) => zone.captures)) {
        if (!indexes.has(capture.playerIndex ?? 0)) {
          context.addIssue({
            code: "custom",
            message: "A capture has an unknown owner.",
          });
        }
      }
    }
  });

export const gameIdentitySchema = z
  .object({
    gameCode: id,
    revision: z.number().int().min(0).max(255),
    language: text.min(1),
    romHash: id,
    trainerId: id,
  })
  .strict();

export const livePokemonSchema: z.ZodType<LivePokemon> = z
  .object({
    identity: id,
    pokemonId: z.number().int().min(1).max(100000),
    nickname: text.optional(),
    level: z.number().int().min(1).max(100),
    hp: z.number().int().min(0).max(65535),
    maxHp: z.number().int().min(1).max(65535),
    status: text,
    isEgg: z.boolean(),
    isShiny: z.boolean(),
    gender: z.enum(["male", "female", "unknown"]),
    nature: text.optional(),
    ability: text.optional(),
    types: typeNames.optional(),
    heldItem: text.optional(),
    experience: z.number().int().nonnegative().optional(),
    stats: z
      .record(
        z.enum([
          "attack",
          "defense",
          "speed",
          "special-attack",
          "special-defense",
        ]),
        z.number().int().min(0).max(65535),
      )
      .optional(),
    moves: z
      .array(
        z
          .object({
            id: z.number().int().min(1).max(10000),
            name: text.optional(),
            pp: z.number().int().min(0).max(255),
            type: text.optional(),
            power: z.number().min(0).max(65535).optional(),
            accuracy: z.number().min(0).max(100).optional(),
          })
          .strict(),
      )
      .max(4),
  })
  .strict()
  .refine((pokemon) => pokemon.hp <= pokemon.maxHp, "HP exceeds maximum HP.");

const observationShape = {
  id,
  encounterId: id,
  pokemonId: z.number().int().min(1).max(100000),
  kind: z.enum(["move", "ability", "effectiveness"]),
  value: text.min(1),
  attackType: text.optional(),
  moveId: z.number().int().min(1).max(10000).optional(),
};

export const gameFrameSchema: z.ZodType<GameFrame> = z
  .object({
    protocolVersion: z.literal(1),
    connector: id,
    sessionId: id,
    sequence: timestamp,
    frame: timestamp,
    game: gameIdentitySchema,
    party: z.array(livePokemonSchema).max(6),
    location: z.object({ id, name: text.optional() }).strict().optional(),
    battle: z
      .object({
        id,
        kind: z.enum(["wild", "trainer"]),
        activePlayerIdentity: id.optional(),
        opponents: z
          .array(
            z
              .object({
                identity: id,
                pokemonId: z.number().int().min(1).max(100000),
                level: z.number().int().min(1).max(100),
              })
              .strict(),
          )
          .max(2),
      })
      .strict()
      .optional(),
    observations: z.array(z.object(observationShape).strict()).max(1000),
    stateLoaded: z.boolean().optional(),
    warnings: z.array(z.string().max(1000)).max(10).optional(),
  })
  .strict()
  .superRefine((frame, context) => {
    if (frame.battle?.activePlayerIdentity &&
        !frame.party.some((pokemon) => pokemon.identity === frame.battle?.activePlayerIdentity)) {
      context.addIssue({ code: "custom", message: "The active player Pokemon must belong to the party." });
    }
    if (
      new Set(frame.party.map((pokemon) => pokemon.identity)).size !==
      frame.party.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Party identities must be unique.",
      });
    }
    for (const observation of frame.observations) {
      if (
        observation.kind === "effectiveness" &&
        (!observation.attackType ||
          !["immunity", "weakness", "resistance", "neutral"].includes(
            observation.value,
          ))
      ) {
        context.addIssue({
          code: "custom",
          message:
            "An effectiveness observation needs an attack type and a valid outcome.",
        });
      }
    }
  });

export const recordSchema: z.ZodType<RunRecord> = z.object({
  formatVersion: z.literal(1),
  revision: timestamp,
  run: runSchema,
  history: z
    .array(
      z.object({
        id,
        at: timestamp,
        playerId: id,
        kind: z.enum([
          "manual",
          "capture",
          "death",
          "evolution",
          "observation",
          "connection",
          "rollback",
        ]),
        message: z.string().max(2000),
      }),
    )
    .max(100000),
  tracking: z.record(
    id,
    z.object({
      game: gameIdentitySchema,
      sessionId: id,
      sequence: timestamp,
      frame: timestamp,
      lastSeenAt: timestamp,
      latest: gameFrameSchema,
      suspended: z.boolean(),
      pendingPokemon: z.array(livePokemonSchema).max(1000),
      ignoredIdentities: z.array(id).max(10000),
      zoneMappings: z.record(id, id),
      retiredSessions: z.array(id).max(10000).default([]),
      seenEncounters: z.array(z.object({
        id: z.string().max(1000), gameKey: id, locationId: id,
        pokemonId: z.number().int().min(1).max(100000),
        level: z.number().int().min(1).max(100),
        observedAt: timestamp,
      })).max(100000).optional(),
    }),
  ),
  observations: z
    .array(
      z.object({
        ...observationShape,
        playerId: id,
        gameKey: id,
        observedAt: timestamp,
      }),
    )
    .max(100000),
});

export const runEditSchema: z.ZodType<RunEdit> = z.object({
  id,
  runId: id,
  playerId: id,
  before: runSchema,
  after: runSchema,
});

export const hostRoomSchema = z.object({
  runId: id,
  playerId: id,
  port: z.number().int().min(1024).max(65535),
  allowLan: z.boolean(),
  resetCredentials: z.boolean().optional(),
});

export const joinRoomSchema = z.object({
  address: z.string().min(1).max(2000),
  invitation: z.string().min(32).max(200),
  playerId: id,
});

export const bindBridgeSchema = z.object({ runId: id, playerId: id });
export const connectMelonDsSchema = bindBridgeSchema.extend({
  port: z.number().int().min(1024).max(65535),
  confirmRomMatch: z.literal(true),
}).strict();
export const linkPokemonSchema = bindBridgeSchema.extend({
  identity: id,
  zoneId: id,
  captureId: id.optional(),
  soulLinkGroupId: id.optional(),
});
export const mapZoneSchema = bindBridgeSchema.extend({ locationId: id, zoneId: id }).strict();

export const desktopStatusSchema: z.ZodType<DesktopStatus> = z.object({
  room: z.object({
    mode: z.enum([
      "offline",
      "hosting",
      "joining",
      "connected",
      "disconnected",
      "conflict",
    ]),
    runId: id.optional(),
    playerId: id.optional(),
    address: z.string().optional(),
    invitation: z.string().optional(),
    participants: z.array(
      z.object({ playerId: id, name: text, connected: z.boolean() }),
    ),
    pendingCount: z.number().int().nonnegative(),
    error: z.string().optional(),
  }),
  bridge: z.object({
    url: z.string(),
    token: z.string(),
    runId: id.optional(),
    playerId: id.optional(),
    lastSeenAt: timestamp.optional(),
    error: z.string().optional(),
  }),
  storagePath: z.string(),
  melonDs: z.object({
    romName: z.string(),
    gameCode: z.string(),
    revision: z.number().int().nonnegative(),
    port: z.number().int().optional(),
    state: z.enum(["disconnected", "waiting", "tracking"]),
    attached: z.boolean(),
    layout: z.enum(["standard", "project-pm"]).optional(),
  }).optional(),
});

export const desktopEventSchema: z.ZodType<DesktopEvent> = z.discriminatedUnion(
  "type",
  [
    z.object({ type: z.literal("record"), record: recordSchema }),
    z.object({ type: z.literal("deleted"), runId: id }),
    z.object({ type: z.literal("status"), status: desktopStatusSchema }),
    z.object({ type: z.literal("error"), message: z.string() }),
  ],
);

export function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return `Invalid tracker data${issue?.path.length ? ` at ${issue.path.join(".")}` : ""}: ${issue?.message ?? "validation failed"}`;
  }
  return error instanceof Error
    ? error.message
    : "The operation failed. No changes were saved.";
}
