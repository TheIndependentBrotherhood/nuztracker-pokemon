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
