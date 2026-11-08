import { Dex } from "@pkmn/dex";
import { getGameVersion, type GameVersionId } from "./game-catalog";
import type { PokemonData } from "./types";

const cache = new WeakMap<PokemonData, Map<GameVersionId, PokemonData>>();

export function pokemonForGame(
  pokemon: PokemonData,
  version?: GameVersionId,
): PokemonData {
  const game = getGameVersion(version);
  if (!game || !version || pokemon.id < 1) return pokemon;
  const previous = cache.get(pokemon)?.get(version);
  if (previous) return previous;

  const dex = Dex.mod(`gen${game.generation}`);
  const species = dex.species.get(pokemon.technicalName);
  const available = species.exists && species.gen <= game.generation;
  const stats = available
    ? [
        { stat: { name: "hp" }, base_stat: species.baseStats.hp },
        { stat: { name: "attack" }, base_stat: species.baseStats.atk },
        { stat: { name: "defense" }, base_stat: species.baseStats.def },
        { stat: { name: game.generation === 1 ? "special" : "special-attack" }, base_stat: species.baseStats.spa },
        ...(game.generation === 1 ? [] : [{ stat: { name: "special-defense" }, base_stat: species.baseStats.spd }]),
        { stat: { name: "speed" }, base_stat: species.baseStats.spe },
      ]
    : [];
  const result: PokemonData = {
    ...pokemon,
    stats,
    types: available ? species.types.map((type) => type.toLowerCase()) : [],
    abilities:
      available && game.generation >= 3
        ? Object.entries(species.abilities)
            .filter(([slot]) => game.generation >= 5 || slot !== "H")
            .map(([slot, name], index) => {
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              return {
                ability: {
                  name: slug,
                  url: `https://pokeapi.co/api/v2/ability/${slug}/`,
                },
                is_hidden: slot === "H",
                slot: index + 1,
              };
            })
        : [],
  };
  const entries = cache.get(pokemon) ?? new Map<GameVersionId, PokemonData>();
  entries.set(version, result);
  cache.set(pokemon, entries);
  return result;
}
