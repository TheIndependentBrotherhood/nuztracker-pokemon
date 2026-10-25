import { Capture, Zone } from "./types";

/**
 * Outcome of a zone, for the whole run or for a single Soul Link player.
 * - "captured": alive and usable Pokémon
 * - "linkBroken": zone unusable because a linked partner lost it (alive Pokémon unusable, or capture no longer possible) — Soul Link
 * - "dead": Pokémon captured then died
 * - "lost": capture failed
 * - "pending": nothing recorded yet
 */
export type ZoneOutcome =
  "captured" | "linkBroken" | "dead" | "lost" | "pending";

export interface ZoneOutcomeCounts {
  captured: number;
  linkBroken: number;
  dead: number;
  lost: number;
}

const isAlive = (c: Capture) => !c.isDead;
const isFailed = (c: Capture) => c.isDead && Boolean(c.failedCapture);
const isDeadAfterCapture = (c: Capture) => c.isDead && !c.failedCapture;

/** Zone outcome for the whole run */
export function getZoneOutcome(zone: Zone, isSoulLink: boolean): ZoneOutcome {
  const captures = zone.captures;
  if (captures.length === 0) {
    return zone.status === "lost" ? "lost" : "pending";
  }
  if (captures.every(isFailed)) return "lost";

  if (isSoulLink) {
    // The link dies with any of its Pokémon
    if (captures.some(isDeadAfterCapture)) return "dead";
    if (captures.some(isFailed)) return "linkBroken";
    return "captured";
  }

  if (captures.some(isAlive)) return "captured";
  return "dead";
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

  // Nothing caught yet: the zone is unusable if a partner already lost it
  if (own.length === 0) return lockedByPartner ? "linkBroken" : "pending";
  if (own.every(isFailed)) return "lost";
  if (!own.some(isAlive)) return "dead";

  // Alive, but unusable if a linked partner lost or died in this zone
  return lockedByPartner ? "linkBroken" : "captured";
}

/** Number of zones where this player's failure or death made a partner's alive Pokémon unusable */
export function countLinksBrokenByPlayer(
  zones: Zone[],
  playerIndex: number,
): number {
  return zones.filter((zone) => {
    const own = zone.captures.filter(
      (c) => (c.playerIndex ?? 0) === playerIndex,
    );
    if (own.length === 0 || own.some(isAlive)) return false;
    return zone.captures.some(
      (c) => (c.playerIndex ?? 0) !== playerIndex && isAlive(c),
    );
  }).length;
}

export function countZoneOutcomes(
  zones: Zone[],
  classify: (zone: Zone) => ZoneOutcome,
): ZoneOutcomeCounts {
  const counts: ZoneOutcomeCounts = {
    captured: 0,
    linkBroken: 0,
    dead: 0,
    lost: 0,
  };
  for (const zone of zones) {
    const outcome = classify(zone);
    if (outcome !== "pending") counts[outcome]++;
  }
  return counts;
}
