import type { Capture, Run, Zone } from "../types";
import { defaultCaptureGroup } from "../zone-progress";

export function deriveZoneStatus(
  captures: Capture[],
  currentStatus: Zone["status"],
): Zone["status"] {
  if (captures.length === 0)
    return currentStatus === "lost" ? "lost" : "not-visited";
  if (captures.some((capture) => !capture.isDead)) return "captured";
  return captures.every((capture) => capture.failedCapture)
    ? "lost"
    : "captured";
}

export function captureGroup(zone: Zone, capture: Capture): string {
  return capture.soulLinkGroupId ?? defaultCaptureGroup(zone, capture);
}

/** The SoulLink pair of a capture: one Pokémon per player, in player order. */
export function soulLinkPair(run: Run, captureId: string): Capture[] {
  if (!run.isSoulLinkMode) return [];
  for (const zone of run.zones) {
    const capture = zone.captures.find((entry) => entry.id === captureId);
    if (!capture) continue;
    const group = captureGroup(zone, capture);
    return zone.captures
      .filter(
        (entry) => !entry.failedCapture && captureGroup(zone, entry) === group,
      )
      .sort(
        (left, right) => (left.playerIndex ?? 0) - (right.playerIndex ?? 0),
      );
  }
  return [];
}

export interface SoulLinkTeamIssue {
  key: string;
  zone: Zone;
  /** Every pair member, in player order. */
  pair: Capture[];
  /** Players whose part of the pair is not in their team; `capture` is absent when they have no Pokémon for this pair. */
  missing: { playerIndex: number; capture?: Capture }[];
}

/**
 * SoulLink rule: a Pokémon may only be in a team when its partners are in the other players' teams.
 * Positions do not matter. A team that was never received (no entry in `playerTeams`, e.g. a partner
 * who has not connected yet) cannot be checked; a known empty team is checked like any other.
 */
export function soulLinkTeamIssues(run: Run): SoulLinkTeamIssue[] {
  const players = run.soulLinkPlayers ?? [];
  if (!run.isSoulLinkMode || players.length < 2) return [];
  const teams = new Map(
    players.flatMap((player) => {
      const team = run.playerTeams?.[player.playerIndex];
      return team
        ? [
            [
              player.playerIndex as number,
              new Set(team.map((capture) => capture.id)),
            ] as const,
          ]
        : [];
    }),
  );

  const issues = new Map<string, SoulLinkTeamIssue>();
  for (const zone of run.zones) {
    for (const capture of zone.captures) {
      const owner = capture.playerIndex ?? 0;
      if (!teams.get(owner)?.has(capture.id)) continue;
      const group = captureGroup(zone, capture);
      const key = `${zone.id}:${group}`;
      if (issues.has(key)) continue;
      const pair = soulLinkPair(run, capture.id);
      const missing = players
        .map((player) => player.playerIndex as number)
        .sort((left, right) => left - right)
        .flatMap((playerIndex) => {
          const partner = pair.find(
            (member) => (member.playerIndex ?? 0) === playerIndex,
          );
          if (!partner) return [{ playerIndex }];
          const team = teams.get(playerIndex);
          return !team || team.has(partner.id)
            ? []
            : [{ playerIndex, capture: partner }];
        });
      if (missing.length) issues.set(key, { key, zone, pair, missing });
    }
  }
  return [...issues.values()];
}

export function applySoulLinkDeaths(run: Run, now = Date.now()): Run {
  if (!run.isSoulLinkMode) return run;
  const roots = run.zones.flatMap((zone) =>
    zone.captures
      .filter((capture) => capture.isDead && !capture.linkedDeath)
      .map((capture) => ({ capture, group: captureGroup(zone, capture) })),
  );

  return {
    ...run,
    zones: run.zones.map((zone) => {
      let changed = false;
      const captures = zone.captures.map((capture) => {
        const cause = roots.find(
          (root) =>
            root.group === captureGroup(zone, capture) &&
            (root.capture.playerIndex ?? 0) !== (capture.playerIndex ?? 0),
        );
        if (!capture.isDead && cause) {
          changed = true;
          return {
            ...capture,
            isDead: true,
            linkedDeath: true,
            diedAt: now,
            killedByPlayerIndex: cause.capture.playerIndex ?? 0,
          };
        }
        if (capture.linkedDeath && !cause) {
          changed = true;
          const revived = { ...capture, isDead: false };
          delete revived.linkedDeath;
          delete revived.diedAt;
          delete revived.killedByPlayerIndex;
          return revived;
        }
        return capture;
      });
      return changed ? { ...zone, captures, updatedAt: now } : zone;
    }),
  };
}

export function resolvePendingFaint(
  run: Run,
  captureId: string,
  countAsDeath: boolean,
  now = Date.now(),
): Run {
  let found = false;
  const zones = run.zones.map((zone) => ({
    ...zone,
    captures: zone.captures.map((capture) => {
      if (capture.id !== captureId || !capture.faintPendingAt) return capture;
      found = true;
      const resolved: Capture = countAsDeath
        ? {
            ...capture,
            isDead: true,
            linkedDeath: false,
            diedAt: capture.faintPendingAt,
          }
        : { ...capture };
      delete resolved.faintPendingAt;
      return resolved;
    }),
  }));
  if (!found)
    throw new Error("This Pokémon has no faint waiting for a decision.");
  return finalizeRun({ ...run, zones, updatedAt: now }, now);
}

export function reviveCapture(
  run: Run,
  captureId: string,
  now = Date.now(),
): Run {
  let revived: Capture | undefined;
  const zones = run.zones.map((zone) => {
    const index = zone.captures.findIndex(
      (capture) => capture.id === captureId && capture.isDead,
    );
    if (index < 0) return zone;
    const capture = { ...zone.captures[index], isDead: false };
    delete capture.linkedDeath;
    delete capture.diedAt;
    delete capture.killedByPlayerIndex;
    revived = capture;
    const captures = [...zone.captures];
    captures[index] = capture;
    return { ...zone, captures, updatedAt: now };
  });
  if (!revived) throw new Error("This Pokémon is not marked as dead.");
  const addTo = (team: Capture[]) =>
    team.length < 6 && !team.some((capture) => capture.id === captureId)
      ? [...team, revived!]
      : team;
  const playerIndex = revived.playerIndex ?? 0;
  return finalizeRun(
    {
      ...run,
      zones,
      ...(run.isSoulLinkMode
        ? {
            playerTeams: {
              ...run.playerTeams,
              [playerIndex]: addTo(run.playerTeams?.[playerIndex] ?? []),
            },
          }
        : { team: addTo(run.team) }),
      updatedAt: now,
    },
    now,
  );
}

export function finalizeRun(input: Run, now = Date.now()): Run {
  const run = applySoulLinkDeaths(input, now);
  const captures = new Map(
    run.zones.flatMap((zone) =>
      zone.captures.map((capture) => [capture.id, capture] as const),
    ),
  );
  const syncTeam = (team: Capture[]) =>
    team
      .map((capture) => captures.get(capture.id) ?? capture)
      .filter((capture) => !capture.isDead);
  return {
    ...run,
    zones: run.zones.map((zone) => ({
      ...zone,
      status: deriveZoneStatus(zone.captures, zone.status),
    })),
    team: syncTeam(run.team),
    ...(run.playerTeams
      ? {
          playerTeams: Object.fromEntries(
            Object.entries(run.playerTeams).map(([index, team]) => [
              index,
              syncTeam(team),
            ]),
          ),
        }
      : {}),
  };
}
