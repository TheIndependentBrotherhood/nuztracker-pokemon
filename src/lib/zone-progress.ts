import { Capture, Zone } from "./types";

/**
 * Outcome of a zone, for the whole run or for a single Soul Link player.
 * - "captured": alive and usable Pokémon
 * - "dead": Pokémon captured then died (including Soul Link linked deaths)
 * - "lost": capture failed, or (Soul Link) zone locked by a partner before the player could capture
 * - "pending": nothing recorded yet
 */
export type ZoneOutcome = "captured" | "dead" | "lost" | "pending";

export interface ZoneOutcomeCounts {
  captured: number;
  dead: number;
  lost: number;
}

const isAlive = (c: Capture) => !c.isDead;
const isFailed = (c: Capture) => c.isDead && Boolean(c.failedCapture);
const isDeadAfterCapture = (c: Capture) => c.isDead && !c.failedCapture;

/** Zone outcome for the whole run */
export function getZoneOutcome(zone: Zone): ZoneOutcome {
  const captures = zone.captures;
  if (captures.length === 0) {
    return zone.status === "lost" ? "lost" : "pending";
  }
  if (captures.every(isFailed)) return "lost";
  // A Pokémon was caught here: the zone is alive as long as one of them is
  if (captures.some(isAlive)) return "captured";
  if (captures.some(isDeadAfterCapture)) return "dead";
  return "lost";
}

/**
 * Soul Link: a zone is locked for the other players as soon as one player
 * failed the capture or lost the Pokémon caught there.
 */
export function isZoneLockedForPlayer(
  zone: Zone,
  playerIndex: number,
): boolean {
  return zone.captures.some(
    (c) => (c.playerIndex ?? 0) !== playerIndex && c.isDead,
  );
}

/** Zone outcome from the point of view of one Soul Link player */
export function getZoneOutcomeForPlayer(
  zone: Zone,
  playerIndex: number,
): ZoneOutcome {
  const own = zone.captures.filter((c) => (c.playerIndex ?? 0) === playerIndex);
  const lockedByPartner = isZoneLockedForPlayer(zone, playerIndex);

  // Nothing caught yet: the zone is lost for this player if a partner already lost it
  if (own.length === 0) return lockedByPartner ? "lost" : "pending";
  if (own.every(isFailed)) return "lost";
  // Linked deaths are regular deaths; an alive Pokémon with a locked zone is as good as dead
  if (!own.some(isAlive) || lockedByPartner) return "dead";
  return "captured";
}

/** Soul Link: number of partners' Pokémon released because of this player's failures or deaths */
export function countLinkedDeathsCausedByPlayer(
  zones: Zone[],
  playerIndex: number,
): number {
  return zones
    .flatMap((zone) => zone.captures)
    .filter((c) => c.linkedDeath && c.killedByPlayerIndex === playerIndex)
    .length;
}

export function countZoneOutcomes(
  zones: Zone[],
  classify: (zone: Zone) => ZoneOutcome,
): ZoneOutcomeCounts {
  const counts: ZoneOutcomeCounts = { captured: 0, dead: 0, lost: 0 };
  for (const zone of zones) {
    const outcome = classify(zone);
    if (outcome !== "pending") counts[outcome]++;
  }
  return counts;
}
