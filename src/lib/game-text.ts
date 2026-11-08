"use client";

import { useEffect, useState } from "react";
import { publicPath } from "@/lib/base-path";
import type { Lang } from "@/i18n/translations";
import type { LiveMove, LivePokemon, MoveCategory } from "@/lib/tracker/types";

type LocalizedText = Partial<Record<Lang, string>>;

interface MoveEntry {
  name?: LocalizedText;
  description?: LocalizedText;
  category?: MoveCategory;
  type?: string;
  power?: number;
  accuracy?: number;
  pp?: number;
}
interface TextEntry {
  name?: LocalizedText;
  description?: LocalizedText;
}
interface ItemEntry extends TextEntry {
  gen3?: number;
  gen4?: number;
}
interface NatureEntry {
  name?: LocalizedText;
  increased?: string;
  decreased?: string;
}
interface GameTextData {
  moves: Record<string, MoveEntry>;
  abilities: Record<string, TextEntry>;
  items: ItemEntry[];
  natures: Record<string, NatureEntry>;
}

export interface GameWord {
  name: string;
  description?: string;
}
export interface MoveWord extends GameWord {
  category?: MoveCategory;
  type?: string;
  power?: number;
  accuracy?: number;
}
export interface NatureWord extends GameWord {
  increased?: string;
  decreased?: string;
}

// Gen 1-3 games derive the damage category from the move type.
const PHYSICAL_TYPES_BEFORE_GEN4 = new Set([
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
]);

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const pick = (text: LocalizedText | undefined, lang: Lang) =>
  text?.[lang] ?? text?.en;

/** Game words keyed by in-game ids, localized with an English fallback. */
export class GameText {
  private readonly abilitiesByName = new Map<string, TextEntry>();
  private readonly itemsByName = new Map<string, ItemEntry>();
  private readonly itemsByIndex = new Map<string, ItemEntry>();

  constructor(private readonly data: GameTextData) {
    for (const ability of Object.values(data.abilities)) {
      if (ability.name?.en)
        this.abilitiesByName.set(normalize(ability.name.en), ability);
    }
    for (const item of data.items) {
      if (item.name?.en) this.itemsByName.set(normalize(item.name.en), item);
      if (item.gen3 !== undefined)
        this.itemsByIndex.set(`3:${item.gen3}`, item);
      if (item.gen4 !== undefined)
        this.itemsByIndex.set(`4:${item.gen4}`, item);
    }
  }

  move(move: LiveMove, lang: Lang, generation = 4): MoveWord {
    const entry = this.data.moves[move.id];
    const type = move.type ?? entry?.type;
    const power = move.power ?? entry?.power;
    const category =
      move.category ??
      (generation <= 3 && type
        ? !power
          ? "status"
          : PHYSICAL_TYPES_BEFORE_GEN4.has(type)
            ? "physical"
            : "special"
        : entry?.category);
    return {
      name: pick(entry?.name, lang) ?? move.name ?? `#${move.id}`,
      description: pick(entry?.description, lang),
      category,
      type,
      power,
      accuracy: move.accuracy ?? entry?.accuracy,
    };
  }

  ability(pokemon: LivePokemon, lang: Lang): GameWord | undefined {
    const entry =
      (pokemon.abilityId !== undefined
        ? this.data.abilities[pokemon.abilityId]
        : undefined) ??
      (pokemon.ability
        ? this.abilitiesByName.get(normalize(pokemon.ability))
        : undefined);
    const name = pick(entry?.name, lang) ?? pokemon.ability;
    return name
      ? { name, description: pick(entry?.description, lang) }
      : undefined;
  }

  item(pokemon: LivePokemon, lang: Lang, generation = 4): GameWord | undefined {
    const entry =
      (pokemon.heldItemId !== undefined
        ? this.itemsByIndex.get(
            `${generation <= 3 ? 3 : 4}:${pokemon.heldItemId}`,
          )
        : undefined) ??
      (pokemon.heldItem
        ? this.itemsByName.get(normalize(pokemon.heldItem))
        : undefined);
    const name = pick(entry?.name, lang) ?? pokemon.heldItem;
    return name
      ? { name, description: pick(entry?.description, lang) }
      : undefined;
  }

  nature(pokemon: LivePokemon, lang: Lang): NatureWord | undefined {
    if (!pokemon.nature) return undefined;
    const entry = this.data.natures[normalize(pokemon.nature)];
    return {
      name: pick(entry?.name, lang) ?? pokemon.nature,
      increased: entry?.increased,
      decreased: entry?.decreased,
    };
  }
}

let pending: Promise<GameText> | undefined;

export function loadGameText(): Promise<GameText> {
  pending ??= fetch(publicPath("/data/game-text.json"))
    .then((response) => {
      if (!response.ok) throw new Error("Game text could not be loaded.");
      return response.json() as Promise<GameTextData>;
    })
    .then((data) => new GameText(data))
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

export function useGameText(): GameText | undefined {
  const [text, setText] = useState<GameText>();
  useEffect(() => {
    let active = true;
    loadGameText()
      .then((loaded) => {
        if (active) setText(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return text;
}
