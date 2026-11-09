import { Capture, Run, SoulLinkPlayer } from "./types";

export interface RunTeam {
  /** Soul Link player owning this team; undefined in classic mode */
  player?: SoulLinkPlayer;
  team: Capture[];
}

/** Teams of a run: one per Soul Link player, or the single shared team */
export function getRunTeams(run: Run): RunTeam[] {
  if (run.isSoulLinkMode && run.soulLinkPlayers?.length) {
    return run.soulLinkPlayers.map((player) => ({
      player,
      team: run.playerTeams?.[player.playerIndex] ?? [],
    }));
  }
  return [{ team: run.team }];
}

/** Every Pokémon currently in a team, all players included */
export function getAllTeamCaptures(run: Run): Capture[] {
  return getRunTeams(run).flatMap(({ team }) => team);
}

/**
 * Soul Link turn order reminder: the players in encounter order for the next zone.
 * Rotates through the players every zone that already has an encounter.
 */
export function encounterOrder(run: Run): SoulLinkPlayer[] {
  if (!run.isSoulLinkMode || !run.soulLinkTurnOrder) return [];
  const players = [...(run.soulLinkPlayers ?? [])].sort(
    (left, right) => left.playerIndex - right.playerIndex,
  );
  if (players.length < 2) return [];
  const encountered = run.zones.filter(
    (zone) => zone.status !== "not-visited" || zone.captures.length > 0,
  ).length;
  const first = encountered % players.length;
  return [...players.slice(first), ...players.slice(0, first)];
}

/** Soul Link turn order reminder: the player who encounters first in the next zone. */
export function nextEncounterPlayer(run: Run): SoulLinkPlayer | undefined {
  return encounterOrder(run)[0];
}
