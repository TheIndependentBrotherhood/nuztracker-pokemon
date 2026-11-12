import { z } from "zod";
import {
  gameFrameSchema,
  ignorePokemonSchema,
  linkPokemonSchema,
  mapZoneSchema,
  recordSchema,
  runEditSchema,
} from "../src/lib/tracker/schema";
import type { RunRecord } from "../src/lib/tracker/types";
import { addHistory, applyRunEdit } from "../src/lib/tracker/records";
import {
  ignorePendingPokemon,
  ingestFrame,
  linkPokemon,
  mapZone,
  resumeTracking,
  type PokemonResolver,
} from "../src/lib/tracker/live";
import { withoutPrivateNotes } from "../src/lib/tracker/knowledge";

const id = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w:.-]+$/);
export const MAX_ROOM_MESSAGE_BYTES = 50 * 1024 * 1024;

/** A shared invitation is "<token>.<certificate fingerprint>" for encrypted rooms. */
export function splitInvitation(invitation: string): {
  token: string;
  fingerprint?: string;
} {
  const [token, fingerprint] = invitation.trim().split(".", 2);
  return fingerprint ? { token, fingerprint } : { token };
}

export function joinInvitation(token: string, fingerprint?: string): string {
  return fingerprint ? `${token}.${fingerprint}` : token;
}
export const roomCommandSchema = z.discriminatedUnion("kind", [
  z.object({ id, kind: z.literal("edit"), edit: runEditSchema }),
  z.object({ id, kind: z.literal("frame"), frame: gameFrameSchema }),
  z.object({ id, kind: z.literal("link"), input: linkPokemonSchema }),
  z.object({ id, kind: z.literal("ignore"), input: ignorePokemonSchema }),
  z.object({ id, kind: z.literal("map-zone"), input: mapZoneSchema }),
  z.object({ id, kind: z.literal("resume") }),
]);
export type RoomCommand = z.infer<typeof roomCommandSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    protocolVersion: z.literal(1),
    playerId: id,
    invitation: z.string().min(32).max(200),
    credential: z.string().min(32).max(200).optional(),
  }),
  z.object({ type: z.literal("command"), command: roomCommandSchema }),
]);

const participants = z
  .array(
    z.object({
      playerId: id,
      name: z.string().max(500),
      connected: z.boolean(),
    }),
  )
  .max(4);
export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("welcome"),
    roomId: id,
    credential: z.string(),
    record: recordSchema,
    participants,
  }),
  z.object({
    type: z.literal("record"),
    record: recordSchema,
    acknowledgement: id.optional(),
  }),
  z.object({ type: z.literal("presence"), participants }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    commandId: id.optional(),
  }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export function sharedCommand(command: RoomCommand): RoomCommand {
  return command.kind === "edit"
    ? {
        ...command,
        edit: {
          ...command.edit,
          before: withoutPrivateNotes(command.edit.before),
          after: withoutPrivateNotes(command.edit.after),
        },
      }
    : command;
}

export function applyRoomCommand(
  record: RunRecord,
  command: RoomCommand,
  playerId: string,
  resolvePokemon: PokemonResolver,
  enforceOwnership = true,
): RunRecord {
  if (record.history.some((entry) => entry.id === command.id)) return record;
  switch (command.kind) {
    case "edit":
      if (
        command.edit.playerId !== playerId ||
        command.id !== command.edit.id
      ) {
        throw new Error(
          "The command identity does not match the authenticated player.",
        );
      }
      return applyRunEdit(record, command.edit, { enforceOwnership });
    case "frame":
      return ingestFrame(record, playerId, command.frame, resolvePokemon);
    case "link":
      if (command.input.playerId !== playerId)
        throw new Error("A player cannot link another player's game.");
      return addHistory(
        linkPokemon(record, command.input, resolvePokemon),
        playerId,
        "connection",
        "Capture association synchronized.",
        Date.now(),
        command.id,
      );
    case "ignore":
      if (command.input.playerId !== playerId)
        throw new Error("A player cannot ignore another player's Pokémon.");
      return addHistory(
        ignorePendingPokemon(record, command.input),
        playerId,
        "connection",
        "Ignored Pokémon synchronized.",
        Date.now(),
        command.id,
      );
    case "map-zone":
      if (command.input.playerId !== playerId)
        throw new Error("A player cannot map another player's game.");
      return addHistory(
        mapZone(record, command.input),
        playerId,
        "connection",
        "Game location mapped to an encounter zone.",
        Date.now(),
        command.id,
      );
    case "resume":
      return addHistory(
        resumeTracking(record, playerId),
        playerId,
        "connection",
        "Reconciliation synchronized.",
        Date.now(),
        command.id,
      );
  }
}

export function normalizeRoomAddress(address: string): string {
  const url = new URL(address);
  if (
    !["ws:", "wss:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Use a ws:// or wss:// room address without credentials or query parameters.",
    );
  }
  const host = url.hostname.toLowerCase();
  const parts = host.split(".").map(Number);
  const privateIpv4 =
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (parts[0] === 127 ||
      parts[0] === 10 ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127));
  const privateIpv6 = host === "[::1]" || /^\[f[cd][0-9a-f:]+\]$/.test(host);
  if (
    url.protocol === "ws:" &&
    host !== "localhost" &&
    !privateIpv4 &&
    !privateIpv6
  ) {
    throw new Error(
      "Unencrypted rooms are limited to a trusted LAN or VPN. Use wss:// for public Internet connections.",
    );
  }
  if (url.pathname !== "/" && url.pathname !== "/room")
    throw new Error("The room endpoint must be /room.");
  url.pathname = "/room";
  return url.toString();
}
