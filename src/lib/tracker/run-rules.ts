import type { Capture, Run, Zone } from "../types";

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
  return capture.soulLinkGroupId ?? zone.id;
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
