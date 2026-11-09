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
 * Soul Link turn order reminder: the player who encounters first in the next zone.
 * Rotates through the players every zone that already has an encounter.
 */
export function nextEncounterPlayer(run: Run): SoulLinkPlayer | undefined {
  if (!run.isSoulLinkMode || !run.soulLinkTurnOrder) return undefined;
  const players = [...(run.soulLinkPlayers ?? [])].sort(
    (left, right) => left.playerIndex - right.playerIndex,
  );
  if (players.length < 2) return undefined;
  const encountered = run.zones.filter(
    (zone) => zone.status !== "not-visited" || zone.captures.length > 0,
  ).length;
  return players[encountered % players.length];
}
