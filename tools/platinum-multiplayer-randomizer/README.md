# Platinum Multiplayer randomizer

One-click randomizer for **Pokémon Platinum Multiplayer** (Project PM v0.4.7 hack, French ROM). This is the only supported game: ROM structures (maps, gyms, marts, items) are located for this hack and other ROMs are not supported.

Double-click `Randomize Platinum Multiplayer.bat` to:

1. Run the Project PM randomizer with the options in `settings.json`. The randomizer code is loaded from your own `ProjectPMSetup.exe` and is not redistributed here.
2. Apply the NuzTracker extras:
   - randomize item balls and hidden items;
   - turn the second (specialty) clerk of every city mart into an evolution stone and held item shop;
   - give each gym and the Elite Four a common type;
   - raise shiny odds beyond Project PM's maximum.

## Requirements

- Windows with [Python 3.11](https://www.python.org/downloads/release/python-3119/) (`py -3.11` must work). Project PM is compiled for Python 3.11.
- `ProjectPMSetup.exe` and the unrandomized patched ROM (`paths` in `settings.json`).

The input ROM is never modified. The output is written to `paths.outputRom`, along with:

- `<output>.nuztracker.txt`: seeds, share codes, final SHA-1, mart changes, gym themes and teams;
- the usual Project PM logs (`.rand.txt`, encounter list).

To use another settings file, run `py -3.11 lib\randomize.py path\to\settings.json`.

## Settings

| Section                | Key                                                                                                                                                                                                             | Values                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `seeds`                | `worldSeed`, `coopSeed`                                                                                                                                                                                         | Number, or empty for a random seed                                                                                              |
| `seeds`                | `worldCode`, `coopCode`                                                                                                                                                                                         | Project PM share code (`PMW-…`, `PMC-…`); overrides the matching section and seed                                               |
| `yourWorld`            | `wildEncounters`, `starterTrio`, `evolvingStartersOnly`, `honeyTreesAndGiftEggs`, `specialWildEncounters`, `gbaSlotEncounters`, `staticEncounters`, `giftPokemon`, `inGameTradesYouGet`, `inGameTradesTheyWant` | `true` / `false`                                                                                                                |
| `wildEncounterOptions` | `mode`                                                                                                                                                                                                          | `completelyRandom`, `area1to1`, `global1to1`                                                                                    |
| `wildEncounterOptions` | `rule`                                                                                                                                                                                                          | `none`, `similarStrength`, `typeTheme`                                                                                          |
| `wildEncounterOptions` | `grass`, `surfing`, `fishing`, `special`, `noLegendaries`                                                                                                                                                       | `true` / `false`                                                                                                                |
| `romTweaks`            | `shinyOdds`                                                                                                                                                                                                     | `8192`, `4096`, `2048`, `1024`, `512`, `257` (Project PM), or `128`, `64`, `32`, `16` (code patch)                              |
| `romTweaks`            | `guaranteedCatch`                                                                                                                                                                                               | `true`: every Poké Ball catches on the first throw (wild Pokémon only, like a Master Ball)                                      |
| `coop`                 | `trainerTeams`, `pokemonTypes`, `abilities`, `movesets`, `similarStrength`, `noLegendaries`                                                                                                                     | `true` / `false`                                                                                                                |
| `extras`               | `itemBalls`, `hiddenItems`                                                                                                                                                                                      | Randomize visible and hidden field items. HMs and key items are untouched                                                       |
| `extras`               | `fieldTms`                                                                                                                                                                                                      | `keep` (field TMs become other TMs) or `random` (TMs join the item pool: a TM can become any item and any item can become a TM) |
| `extras`               | `specialtyClerks`                                                                                                                                                                                               | Replace the second clerk's stock; each mart has at least one evolution stone, and all 10 are available across the marts         |
| `extras`               | `specialtyClerkStockSize`                                                                                                                                                                                       | Number of items per specialty clerk, from `8` to `32`; omit to keep the original stock sizes                                    |
| `extras`               | `clerksSellHeldItems`                                                                                                                                                                                           | Also add held items to the specialty clerks                                                                                     |
| `extras`               | `gymTypes`, `eliteFourTypes`                                                                                                                                                                                    | `vanilla` (original leader type), `random` (one random type per leader), `off`                                                  |

Themed teams keep the randomized team size and each Pokémon's approximate BST. They use the **randomized** species types, so a Rock gym really contains Rock-type Pokémon in this ROM. Legendaries are excluded when `coop.noLegendaries` is enabled. The Champion keeps a mixed team.

Expanded specialty stocks apply to the 12 city and Pokémon League specialty clerks, not the regular clerk or department stores. Each specialty clerk has at least one evolution stone; the remaining random slots can also contain additional evolution stones. The original randomized items are kept and the remaining slots are filled with distinct sellable items. The expansion requires the supported Platinum Multiplayer shop overlay and enough unused ROM padding; unsupported layouts fail instead of overwriting other data.

## Tests

From this directory, run `py -3.11 -m unittest discover -s tests -p "test_*.py"` to check specialty stock generation and ROM safety checks.

## SoulLink

Every player must use the **same** `settings.json` options and the same seeds or codes. Share the World and Co-Op codes and seeds from the report, then compare the final SHA-1: identical values mean identical ROMs.

Gym themes are derived from the Co-Op seed; items and marts are derived from the World seed.

## NuzTracker

The desktop tracker reads the shiny check from the loaded ROM, so shiny Pokémon are detected with the odds of the generated ROM.
