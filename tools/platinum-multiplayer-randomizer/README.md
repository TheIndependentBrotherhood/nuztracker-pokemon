# Platinum Multiplayer randomizer

One-click randomizer for **Pokémon Platinum Multiplayer** (Project PM v0.4.7 hack, French ROM). This is the only supported game: ROM structures (maps, gyms, marts, items) are located for this hack and other ROMs are not supported.

Double-click `Randomize Platinum Multiplayer.bat` to:

1. Run the Project PM randomizer with the options in `settings.json`. The randomizer code is loaded from your own `ProjectPMSetup.exe` and is not redistributed here.
2. Apply the NuzTracker extras:
   - randomize item balls and hidden items;
   - turn the second (specialty) clerk of every city mart into an evolution stone and held item shop;
   - randomize evolution targets while keeping their original conditions;
   - give each gym and the Elite Four a common type;
   - raise shiny odds beyond Project PM's maximum;
   - speed up the day/night cycle.

## Requirements

- Windows with [Python 3.11](https://www.python.org/downloads/release/python-3119/) (`py -3.11` must work). Project PM is compiled for Python 3.11.
- `ProjectPMSetup.exe` and the unrandomized patched ROM (`paths` in `settings.json`).

The input ROM is never modified. The output is written to `paths.outputRom`, along with:

- `<output>.nuztracker.txt`: seeds, share codes, final SHA-1, mart changes, gym themes and teams;
- the usual Project PM logs (`.rand.txt`, encounter list).

To use another settings file, run `py -3.11 lib\randomize.py path\to\settings.json`.

## Settings

| Section                | Key                                                                                                                                                                                                             | Values                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seeds`                | `worldSeed`, `coopSeed`                                                                                                                                                                                         | Number, or empty for a random seed                                                                                                                                                                                                                                                                                                     |
| `seeds`                | `worldCode`, `coopCode`                                                                                                                                                                                         | Project PM share code (`PMW-…`, `PMC-…`); overrides the matching section and seed                                                                                                                                                                                                                                                      |
| `yourWorld`            | `wildEncounters`, `starterTrio`, `evolvingStartersOnly`, `honeyTreesAndGiftEggs`, `specialWildEncounters`, `gbaSlotEncounters`, `staticEncounters`, `giftPokemon`, `inGameTradesYouGet`, `inGameTradesTheyWant` | `true` / `false`                                                                                                                                                                                                                                                                                                                       |
| `wildEncounterOptions` | `mode`                                                                                                                                                                                                          | `completelyRandom`, `area1to1`, `global1to1`                                                                                                                                                                                                                                                                                           |
| `wildEncounterOptions` | `rule`                                                                                                                                                                                                          | `none`, `similarStrength`, `typeTheme`                                                                                                                                                                                                                                                                                                 |
| `wildEncounterOptions` | `grass`, `surfing`, `fishing`, `special`, `noLegendaries`                                                                                                                                                       | `true` / `false`                                                                                                                                                                                                                                                                                                                       |
| `romTweaks`            | `shinyOdds`                                                                                                                                                                                                     | `8192`, `4096`, `2048`, `1024`, `512`, `257` (Project PM), or `128`, `64`, `32`, `16` (code patch)                                                                                                                                                                                                                                     |
| `romTweaks`            | `guaranteedCatch`                                                                                                                                                                                               | `true`: every Poké Ball catches on the first throw (wild Pokémon only, like a Master Ball)                                                                                                                                                                                                                                             |
| `romTweaks`            | `dayNightCycle`                                                                                                                                                                                                 | `"real"` (default) or a number of real hours from `1` to `24` for one in-game day (code patch, see below)                                                                                                                                                                                                                              |
| `coop`                 | `trainerTeams`, `abilities`, `movesets`, `similarStrength`, `noLegendaries`                                                                                                                                     | `true` / `false`                                                                                                                                                                                                                                                                                                                       |
| `coop`                 | `pokemonTypes`                                                                                                                                                                                                  | `off`, `random` (Project PM, random per species) or `evolutionLines`: each original evolution line gets one type swap (e.g. Grass → Ice, Ground → Steel) applied to all its members and forms, so lines stay coherent and dual types stay dual. Lines are the input ROM's, so random evolutions can still lead to another line's types |
| `extras`               | `itemBalls`, `hiddenItems`                                                                                                                                                                                      | Randomize visible and hidden field items. HMs and key items are untouched                                                                                                                                                                                                                                                              |
| `extras`               | `fieldTms`                                                                                                                                                                                                      | `keep` (field TMs become other TMs) or `random` (TMs join the item pool: a TM can become any item and any item can become a TM). Each TM is placed once.                                                                                                                                                                               |
| `extras`               | `specialtyClerks`                                                                                                                                                                                               | Replace the second clerk's stock; each mart has at least one evolution stone, and all 10 are available across the marts                                                                                                                                                                                                                |
| `extras`               | `specialtyClerkStockSize`                                                                                                                                                                                       | Number of items per specialty clerk, from `8` to `32`; omit to keep the original stock sizes                                                                                                                                                                                                                                           |
| `extras`               | `clerksSellHeldItems`                                                                                                                                                                                           | Also add held items to the specialty clerks                                                                                                                                                                                                                                                                                            |
| `extras`               | `randomEvolutions`                                                                                                                                                                                              | `true` / `false`: randomize evolution targets without changing their conditions; omitted defaults to `false`                                                                                                                                                                                                                           |
| `extras`               | `moveReminderPreEvolutionMoves`                                                                                                                                                                                 | `true` / `false`: the Move Reminder also offers every level-up move of the (final, possibly random) pre-evolutions; level-up learnsets are unchanged; omitted defaults to `false`                                                                                                                                                      |
| `extras`               | `gymTypes`, `eliteFourTypes`                                                                                                                                                                                    | `vanilla` (original leader type), `random` (one random type per leader), `off`                                                                                                                                                                                                                                                         |
| `extras`               | `gymTypeHints`                                                                                                                                                                                                  | `true` / `false`: gym city signs show `Type: <type>` and gym guides / Elite Four speeches name the themed type; omitted defaults to `false`; no effect when both type options are `off`                                                                                                                                                |

With `gymTypeHints`, the city sign in front of each themed gym keeps its gym name and leader lines but its subtitle becomes `Type: <type>` (the leader's themed type). In themed gyms and Elite Four rooms, sentences naming the original type next to the word "type" ("de type Roche", "Rock-type") name the new type instead; when the type changed, a guide's following pages are dropped if they mention other types, so no wrong weakness advice remains. Gym statues, texts shared with other maps and sentences without the word "type" are unchanged. The rewritten message archive is moved to unused ROM padding when it no longer fits in place.

To add these hints to a ROM randomized before this option existed, run from `lib`:

```powershell
py -3.11 fix_type_hints.py "<randomized.nds>" "<fixed.nds>"
```

Themed types are read from the trainers' teams (the only type shared by every Pokémon of a gym or Elite Four room) and never printed. Existing saves keep working; as with other fixes, each player clicks **Use the new ROM** in NuzTracker after the first connection.

Themed teams keep the randomized team size and each Pokémon's approximate BST. They use the **randomized** species types, so a Rock gym really contains Rock-type Pokémon in this ROM. Legendaries are excluded when `coop.noLegendaries` is enabled. The Champion keeps a mixed team.

Party entries are located from the trainer flags (Project PM clears them without shrinking party files). ROMs themed before this fix have some off-type Pokémon in leaders' and trainers' teams; to complete them without re-randomizing, run from `lib`:

```powershell
py -3.11 fix_trainer_themes.py "<randomized.nds>" "<fixed.nds>"
```

It clears the misplaced writes, replaces only off-type Pokémon (similar BST, levels unchanged) and reports counts only.

Random evolutions keep every existing method, parameter and branch; species without evolutions remain unchanged. Targets are drawn from the supported species without type or strength restrictions, including legendary Pokémon, and cannot create cycles or repeat the original target. Different branches remain distinct, while alternative methods for the same original target remain equivalent. Chains may become shorter or longer. The special extra evolution also uses its new target without changing its original requirements. The report does not list evolution targets.

Expanded specialty stocks apply to the 12 city and Pokémon League specialty clerks, not the regular clerk or department stores. Each specialty clerk has at least one evolution stone; the remaining random slots can also contain additional evolution stones. The original randomized items are kept and the remaining slots are filled with distinct sellable items. The expansion requires the supported Platinum Multiplayer shop overlay and enough unused ROM padding; unsupported layouts fail instead of overwriting other data.

Platinum Multiplayer stores an obtained TM as 99 copies (reusable TMs), so the game says the bag is full when the player finds a TM they already own. Item balls and hidden items therefore place each TM at most once and never a TM that an NPC gives; once every TM is placed, remaining TM slots get other items.

To fix a ROM randomized before this rule without re-randomizing it, run from `lib`:

```powershell
py -3.11 fix_field_tms.py "<randomized.nds>" "<fixed.nds>" --save "<player1.sav>" --save "<player2.sav>"
```

It replaces duplicate field TMs, field TMs given by NPCs and TMs already owned in the given saves (read only), and reports only counts. Give it every player's save so nobody keeps a field TM they already own, then share the fixed `.nds`: existing saves keep working. NuzTracker pauses on the first connection with the fixed ROM (its hash changed); each player clicks **Use the new ROM** in the compact tracker to continue the run.

With `moveReminderPreEvolutionMoves` (applied after `randomEvolutions`), each evolved species can also relearn every level-up move of its pre-evolutions, but only at the Move Reminder (Project PM's PC "Pokémon Lab" uses the same routine): level-up learnsets are left byte for byte unchanged, so levelling up and evolving teach exactly the usual moves. The Move Reminder lists are stored as extra members after the original learnsets (member `index + 509`, forms included) and contain the species' own moves plus every missing pre-evolution move at its lowest level. The Move Reminder routine is patched to read these lists, with its buffers enlarged to hold up to 248 moves: no move is ever dropped, and the randomizer stops with an error (use another seed) if a list would need more. TM compatibility and tutors are unchanged. The rewritten learnset archive is moved to unused ROM padding when it no longer fits in place.

To add these moves to a ROM randomized before this option existed, run from `lib`:

```powershell
py -3.11 fix_learnsets.py "<randomized.nds>" "<fixed.nds>"
```

It only reports counts, can be run again safely, and existing saves keep working; share the fixed `.nds` and click **Use the new ROM** in NuzTracker as above.

With `dayNightCycle` set to a number of hours, one in-game day (morning, day, evening, night) lasts that many real hours instead of 24. The game's clock routines get a virtual time computed from the real date and time, `((days × 24 + hour) mod N) h + minutes` scaled by `24 / N`: the cycle is continuous across midnight and two consoles set to the same real time are always in the same period, so SoulLink players stay synchronized without anything to share. Wild encounters, time-based evolutions, music, field lighting, battle backgrounds, scripts and Pokédex areas follow the accelerated cycle; dates, berries, daily events, timestamps and the Poketch clocks keep the real time. `24` behaves like `real`.

To set or change the cycle of an already randomized ROM, run from `lib`:

```powershell
py -3.11 fix_day_cycle.py "<randomized.nds>" "<fixed.nds>" --hours 2
```

It can be run again to change the length (keep a copy of the unpatched ROM to go back to real time). Existing saves keep working; share the fixed `.nds` and click **Use the new ROM** in NuzTracker as above.

## Tests

From this directory, run `py -3.11 -m unittest discover -s tests -p "test_*.py"` to check specialty stocks, randomized evolutions and ROM safety checks.

## SoulLink

Every player must use the **same** `settings.json` options and the same seeds or codes. Share the World and Co-Op codes and seeds from the report, then compare the final SHA-1: identical values mean identical ROMs.

Gym themes and evolution targets are derived from the Co-Op seed; items and marts are derived from the World seed. Project PM codes do not include NuzTracker extras, so every player must also enable the same extras in their settings.

## NuzTracker

The desktop tracker reads the shiny check and evolution conditions from the loaded ROM. Enable **Random evolutions** when creating the run or in its settings to hide randomized targets in the tracker; enabling it in the settings also enables Randomizer mode. Platinum Multiplayer's custom evolution method 27 is preserved; its condition is displayed as unknown rather than guessed.
