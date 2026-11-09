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

/** Soul Link: default link group of a capture; shiny second chances are linked together, apart from regular captures. */
export function defaultCaptureGroup(zone: Zone, capture: Capture): string {
  return capture.shinyChance ? shinyChanceGroup(zone.id) : zone.id;
}

export function shinyChanceGroup(zoneId: string): string {
  return `${zoneId}:shiny`;
}

const groupOf = (zone: Zone, capture: Capture) =>
  capture.soulLinkGroupId ?? defaultCaptureGroup(zone, capture);

/**
 * Soul Link: a zone is locked for the other players as soon as one player
 * failed the capture or lost the Pokémon caught there. Regular captures and
 * shiny second chances are locked independently.
 */
export function isZoneLockedForPlayer(
  zone: Zone,
  playerIndex: number,
  shinyChance = false,
): boolean {
  const own = zone.captures.filter(
    (capture) =>
      (capture.playerIndex ?? 0) === playerIndex &&
      Boolean(capture.shinyChance) === shinyChance,
  );
  const groups = new Set(
    own.length
      ? own.map((capture) => groupOf(zone, capture))
      : [shinyChance ? shinyChanceGroup(zone.id) : zone.id],
  );
  return zone.captures.some(
    (c) =>
      (c.playerIndex ?? 0) !== playerIndex &&
      c.isDead &&
      groups.has(groupOf(zone, c)),
  );
}

/**
 * Soul Link: slot a new capture would take for a player. With the shiny hunt option, a shiny first
 * takes the zone's shiny second chance (even if the zone is closed); a second shiny then falls back
 * to the regular encounter if it is still free. Other Pokémon only use the regular encounter.
 */
export function soulLinkCaptureSlot(
  zone: Zone,
  playerIndex: number,
  isShiny: boolean,
  shinyHuntMode: boolean,
): "regular" | "shiny" | undefined {
  const own = zone.captures.filter(
    (capture) => (capture.playerIndex ?? 0) === playerIndex,
  );
  if (
    shinyHuntMode &&
    isShiny &&
    !own.some((capture) => capture.shinyChance) &&
    !isZoneLockedForPlayer(zone, playerIndex, true)
  )
    return "shiny";
  if (
    !own.some((capture) => !capture.shinyChance) &&
    !isZoneLockedForPlayer(zone, playerIndex)
  )
    return "regular";
  return undefined;
}

/** Zone outcome from the point of view of one Soul Link player */
export function getZoneOutcomeForPlayer(
  zone: Zone,
  playerIndex: number,
): ZoneOutcome {
  const mine = zone.captures.filter(
    (c) => (c.playerIndex ?? 0) === playerIndex,
  );
  const own = mine.filter((c) => !c.shinyChance);
  const lockedByPartner = isZoneLockedForPlayer(zone, playerIndex);
  const shinyAlive =
    mine.some((c) => c.shinyChance && isAlive(c)) &&
    !isZoneLockedForPlayer(zone, playerIndex, true);

  let outcome: ZoneOutcome;
  // Nothing caught yet: the zone is lost for this player if a partner already lost it
  if (own.length === 0) outcome = lockedByPartner ? "lost" : "pending";
  else if (own.every(isFailed)) outcome = "lost";
  // Linked deaths are regular deaths; an alive Pokémon with a locked zone is as good as dead
  else if (!own.some(isAlive) || lockedByPartner) outcome = "dead";
  else outcome = "captured";
  return shinyAlive ? "captured" : outcome;
}
/** Soul Link: number of partners' Pokémon released because of this player's failures or deaths */
export function countLinkedDeathsCausedByPlayer(
  zones: Zone[],
  playerIndex: number,
): number {
  return zones
    .flatMap((zone) => zone.captures)
    .filter(
      (c) => c.isDead && c.linkedDeath && c.killedByPlayerIndex === playerIndex,
    ).length;
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
