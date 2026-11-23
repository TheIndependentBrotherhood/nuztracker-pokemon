import type { GameVersionId } from "../game-catalog";
import { isPlatinumZone } from "./platinum/zones";

export type GameConnector = "melonds" | "bizhawk";

/** What the tracker knows about a game beyond the catalog entry. */
export interface GameSupport {
  /** Automatic tracking connector. */
  connector?: GameConnector;
  /** Keeps only the region zones of this game; `slug` is the zone id without region prefix. */
  includesZone?: (zoneId: string, slug: string) => boolean;
}

const GAME_SUPPORT: Partial<Record<GameVersionId, GameSupport>> = {
  platinum: { connector: "melonds", includesZone: isPlatinumZone },
  firered: { connector: "bizhawk" },
};

export function getGameSupport(id?: string): GameSupport | undefined {
  return GAME_SUPPORT[id as GameVersionId];
}

/** Automatic tracking connector available for a game version, if any. */
export function getGameConnector(id?: string): GameConnector | undefined {
  return getGameSupport(id)?.connector;
}
