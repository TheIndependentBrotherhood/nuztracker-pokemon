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
