import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

interface EvolutionStage {
  id: number;
  technicalName: string;
}

interface EvolutionChain {
  base: EvolutionStage;
  stage2?: EvolutionStage;
  stage3?: EvolutionStage;
}

interface PokemonListEntry {
  id: number;
  technicalName: string;
}

async function getPokemonId(
  technicalName: string,
  pokemonList: PokemonListEntry[],
): Promise<number | null> {
  const pokemon = pokemonList.find(
    (p) => p.technicalName.toLowerCase() === technicalName.toLowerCase(),
  );
  return pokemon?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting evolution chains sync...");

    // Load pokemon-list.json
    const pokemonListPath = join(
      process.cwd(),
      "public/data/pokemon-list.json",
    );
    const pokemonListData = readFileSync(pokemonListPath, "utf-8");
    const pokemonList: PokemonListEntry[] = JSON.parse(pokemonListData);

    console.log(
      `✓ Loaded ${pokemonList.length} pokémon from pokemon-list.json`,
    );

    const evolutionChains: EvolutionChain[] = [];

    // Get total count
    const countResponse = await fetch(
      "https://pokeapi.co/api/v2/evolution-chain/?limit=1",
    );
    const countData = (await countResponse.json()) as { count: number };
    const totalChains = countData.count;

    console.log(`📊 Found ${totalChains} evolution chains in PokeAPI`);

    // Fetch all evolution chains
    for (let i = 0; i < totalChains; i += 20) {
      const response = await fetch(
        `https://pokeapi.co/api/v2/evolution-chain/?offset=${i}&limit=20`,
      );
      const data = (await response.json()) as {
        results: Array<{ url: string }>;
      };

      for (const result of data.results) {
        try {
          const chainResponse = await fetch(result.url);
          const chainData = (await chainResponse.json()) as {
            chain: {
              species: { name: string };
              evolves_to: Array<{
                species: { name: string };
                evolves_to: Array<{
                  species: { name: string };
                }>;
              }>;
            };
          };

          const baseSpecies = chainData.chain.species.name;
          const baseId = await getPokemonId(baseSpecies, pokemonList);

          if (baseId === null) {
            console.warn(`⚠️  Could not find ID for ${baseSpecies}`);
            continue;
          }

          const chain: EvolutionChain = {
            base: {
              id: baseId,
              technicalName: baseSpecies,
            },
          };

          // Stage 2
          if (
            chainData.chain.evolves_to &&
            chainData.chain.evolves_to.length > 0
          ) {
            const stage2Species = chainData.chain.evolves_to[0].species.name;
            const stage2Id = await getPokemonId(stage2Species, pokemonList);

            if (stage2Id !== null) {
              chain.stage2 = {
                id: stage2Id,
                technicalName: stage2Species,
              };

              // Stage 3
              if (
                chainData.chain.evolves_to[0].evolves_to &&
                chainData.chain.evolves_to[0].evolves_to.length > 0
              ) {
                const stage3Species =
                  chainData.chain.evolves_to[0].evolves_to[0].species.name;
                const stage3Id = await getPokemonId(stage3Species, pokemonList);

                if (stage3Id !== null) {
                  chain.stage3 = {
                    id: stage3Id,
                    technicalName: stage3Species,
                  };
                }
              }
            }
          }

          evolutionChains.push(chain);
        } catch (error) {
          console.error(`❌ Error processing evolution chain:`, error);
        }
      }

      console.log(
        `✓ Processed chains ${i} to ${Math.min(i + 20, totalChains)}`,
      );
    }

    // Write to evolution-chains.json
    const outputPath = join(process.cwd(), "public/data/evolution-chains.json");
    writeFileSync(outputPath, JSON.stringify(evolutionChains, null, 2));

    console.log(
      `✅ Successfully saved ${evolutionChains.length} evolution chains`,
    );

    return NextResponse.json({
      message: `✅ Successfully synced ${evolutionChains.length} evolution chains`,
      count: evolutionChains.length,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error syncing evolution chains:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
