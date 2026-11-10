import type { GameFrame } from "./types";
import type { OverlayTeam } from "./overlay";

export interface BattleFocusSelection {
  battleId?: string;
  memberId?: string;
  opponentIdentity?: string;
  allyIdentity?: string;
}

/** Lead, visible opponents, then the second owned Pokémon or NPC ally. */
export function nextBattleFocus(
  battle: NonNullable<GameFrame["battle"]>,
  team: OverlayTeam,
  current?: BattleFocusSelection,
): BattleFocusSelection | undefined {
  const active =
    battle.activePlayerIdentities ??
    (battle.activePlayerIdentity ? [battle.activePlayerIdentity] : []);
  const owned = active.flatMap((identity) => {
    const member = team.members.find(
      (entry) =>
        entry.identity === identity &&
        !entry.isDead &&
        (!entry.live || entry.live.hp > 0),
    );
    return member ? [{ memberId: member.id }] : [];
  });
  const choices: BattleFocusSelection[] = [
    ...owned.slice(0, 1),
    ...battle.opponents.map((opponent) => ({
      opponentIdentity: opponent.identity,
    })),
    ...owned.slice(1),
    ...(battle.allies ?? []).map((ally) => ({ allyIdentity: ally.identity })),
  ];
  if (!choices.length) return undefined;
  const selected = current?.battleId === battle.id ? current : undefined;
  const index = selected
    ? choices.findIndex(
        (choice) =>
          choice.memberId === selected.memberId &&
          choice.opponentIdentity === selected.opponentIdentity &&
          choice.allyIdentity === selected.allyIdentity,
      )
    : choices.findIndex((choice) => Boolean(choice.opponentIdentity));
  return { ...choices[(index + 1) % choices.length], battleId: battle.id };
}
