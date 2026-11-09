# NuzTracker

A local-first Nuzlocke and SoulLink companion. The existing web tracker remains available; the desktop application adds SQLite storage, a read-only emulator bridge, player-hosted rooms and live OBS overlays.

## Development

Requires Node.js 24+ and Yarn 1.22.

```sh
yarn install --frozen-lockfile
yarn dev
yarn test
yarn typecheck
yarn build
```

Format changed files with `yarn format <files>` (or `yarn format .` for the whole repository).

### Desktop

```sh
yarn desktop
```

This builds the static interface and launches Electron. No separate database server or cloud account is required.

**Open live tracker** opens the compact party view. Move/stat panels expand on demand; backups remain available inside **Connections** in this view.

The compact tracker automatically focuses on the first visible opponent during battles and returns to the party lead outside battle. In double battles, both visible opponents appear as selectable compact buttons; choosing one pins its card until **Live** restores the automatic view. Selecting a party member also pins its card, and the party drawer closes when a selection is made. Buttons below the sprite open private species notes (the same notes as in the Pokédex) and incoming type matchups using the run's type-chart generation. Unknown randomized types are not replaced with vanilla types, and the matchup table excludes ability and item modifiers. Opponent HP, hidden moves, unrevealed abilities and actual stats are not fabricated.

The **Moves** header shows the level-up moves already reachable at the current level over the species' total, followed by the next learning level in parentheses (for example `Moves 5/13 (22)`). The level-up levels are read from the loaded ROM, so randomized learnsets are supported: Platinum on MelonDS uses `poketool/personal/wotbl.narc` and the FireRed BizHawk connector uses the `gLevelUpLearnsets` table (save the connector again to get it). Manual runs have no Moves section because their moves are not known, so there is no progress to show. Opponent cards list every move seen for that species in the current game, most recent first, scrolling beyond four rows. With Platinum on MelonDS, opponent moves are detected from PP drops on the active battlers (Transform and loaded states are ignored); the FireRed connector records the moves opponents announce in single battles. Unused moves remain hidden.

With Platinum on MelonDS, opponent cards also show the **Ability** once the game has revealed it on screen, either when it is announced on entry (Intimidate, Pressure, weather…) or in a battle message. NuzTracker reads the "known abilities" memory the game keeps for its battle AI (`BattleContext + 0x390`, one byte per battler), which the game resets when a battler switches out, so abilities that were never shown are never read. Abilities swapped by Skill Swap or Role Play are not captured. Revealed abilities are remembered per species for the current game. FireRed does not report abilities.

After the level, the compact tracker shows how the species evolves, using Ironmon-style abbreviations: the evolution level (Lv. 16 (30), green once reached), the item (THUNDR, LEAF/SUN, WTR/RCK), FRIEND, TRADE, 20 M/F or VARIOUS for many branches. Hovering it lists each condition with its target species in the selected language. Evolution methods are read from the ROM (Platinum vo.narc, FireRed gEvolutionTable), so randomized evolutions are shown as they are; re-load the updated BizHawk script for FireRed. When the run uses **Random evolutions**, only the condition is shown and the target species stays hidden. Manual tracking shows no evolution hint.

The compact card also shows the Pokémon's gender (♂/♀) next to its name and, for party members, its friendship next to a heart (pink once it reaches 220, the friendship-evolution threshold). In battle, stat stages are read live like Ironmon (Platinum `BattleMon + 0x18`, FireRed battler `+0x18`): a ▲/▼ column marks raised or lowered stats, accuracy/evasion rows appear when modified, and hovering lists each stage with its multiplier. Opponent gender is read from battle memory on Platinum and derived from the personality value on FireRed. Party members also show their Hidden Power (`PC`/`HPw`, type badge and power) at the end of the nature line, computed from their IVs; the Hidden Power move row uses that type and power. After the zone name, a green check means the player already caught a Pokémon in the current zone (grey: not yet) and a yellow check marks a shiny caught there.

On Windows and Linux, compact windows have a slim title bar with a pin button that keeps the window always on top; the choice is remembered for the next compact windows.
In random-types runs, species whose types are not confirmed show a **Clues** button instead of **Types**. It shows how many type combinations remain possible for the run's type chart, the remaining candidates and the recorded clues; the player confirms the deduced combination (or picks one, or enters the types manually), after which the **Types** button returns. When the tracker missed a result (an immunity seen by one SoulLink player but not the other, for example), the **+** button next to the confirm button adds a clue by hand (outcome and attack type) to the player's own knowledge; clues added by hand can be removed with ×. The **Types** dialog switches between **Defender** (incoming damage) and **Attacker** (best STAB multiplier against each type). With Platinum on MelonDS, damaging moves in single and double battles add clues automatically from the effectiveness computed by the game (super effective, not very effective, immune or neutral), for both sides, after two identical reads. Results that abilities, Levitate, Magnet Rise, Foresight, Scrappy, Miracle Eye, Gravity, Roost, Iron Ball, Ingrain, form-changing species or in-battle type changes could distort are ignored; a Pokémon that changed type (Conversion, Conversion 2, Camouflage, Transform, Color Change, Forecast, Multitype) gives no more clues until the battle ends; misses and status moves are skipped. ROM hacks that replace moves or add abilities (for example Moonblast over Lunar Dance) are detected: their names and data are read from the ROM. Move data is never limited to the game's generation: on Platinum, the type, category, power and accuracy of every move (party and opponents) come from the loaded ROM, so rebalanced hacks show their own values, moves beyond the vanilla list are supported and evolution conditions name hack moves with their ROM name.

```sh
yarn desktop:build
yarn desktop:package
```

The Windows portable executable is generated in `release`. On every push to `main`, the **Windows release** workflow publishes a GitHub release whose **What's Changed** lists the commits since the previous release (`scripts/release-notes.ps1`). Packaged builds do not include the development dependency tree. The executable is currently unsigned.

## Storage and backups

- **Web:** IndexedDB. Existing `nuztracker-runs` localStorage data is migrated transactionally, once per browser origin. The original localStorage data is retained as a recovery source. Invalid data produces an error instead of an empty, apparently successful workspace.
- **Desktop:** `tracker.sqlite` in Electron's user-data directory, shown in **Connections**. Writes are transactional, with WAL and full synchronization. The last ten recovery snapshots per run are kept before manual changes.
- Browser and desktop storage are separate. Export from the existing browser installation and import into the desktop application to transfer a run.
- Use **Export run / Export all runs** and **Import backup** to transfer `.nuzrun` files. Imports are previewed and created as new runs; they never overwrite an existing run.
- Archives contain versioned JSON, a SHA-256 integrity checksum, captures, teams, deaths, knowledge, observations, evolution history and tracking state. The checksum detects corruption; it is not an authenticity signature.
- **Export shared copy** and room synchronization exclude private Pokédex notes. Personal exports include them. Room credentials and connector tokens are not part of either export.
- Legacy JSON arrays exported from localStorage can also be imported.
- Older runs without `randomizerOptions.randomizeStats` load with stat randomization disabled; explicit settings are preserved. This compatibility rule applies to localStorage migration, IndexedDB, desktop storage and backup imports.

Web updates should not delete runs. A validation error can prevent saved runs from loading without erasing them. Do not clear site data: keep the same browser profile and origin, and export a backup once loading is restored. In browser developer tools, the original `nuztracker-runs` key remains under Local Storage after migration; current records are in the `runs` store of the `nuztracker-local` IndexedDB database. Copy the original value before attempting manual recovery. Changing the domain, protocol or port uses separate browser storage.

Keep an exported backup outside the browser/computer. IndexedDB is still subject to browser storage policies. To copy the entire desktop database manually, close the application first so SQLite can checkpoint its WAL.

**Tracker backups are not game saves.** This version does not parse `.sav` / `.dsv` files and does not restore or modify an emulator save state.

## Connecting FireRed

1. Load **FireRed English revision 1.0, game code BPRE**, in BizHawk.
2. Create or open the matching run in the desktop application.
3. In **Connections**, select your player, then **Connect this game**.
4. Choose **Save Lua connector**. Open the saved script in BizHawk's Lua Console.
5. Open the **Live tracker**. Associate detected Pokémon with existing captures or confirm their encounter zones.

The configured Lua file contains a local access token. Do not share or commit it. The template in `connectors` has placeholders and cannot connect until configured.

### Current connector capabilities

- Read-only party tracking: identities, levels, HP, status, experience, actual statistics, nature, types, abilities, held items and moves.
- Automatic synchronization of associated captures, party membership, evolutions and observed HP transitions to zero.
- Opponent identities, levels, gender and stat stages from active battlers only. Enemy party contents, hidden moves, exact statistics and unrevealed abilities are not read for display.
- Enemy moves recorded through a battle-results memory-write callback in **single battles**, when supported by the selected BizHawk core. Missing callback support is reported visibly.
- Map identifiers, observed-move history, ROM/trainer identity checks and save-state/backward-jump protection: tracking continues automatically when the loaded state matches the tracked team (no level loss, devolution or revived dead Pokémon) and otherwise pauses until the game matches again or the player reconciles from the compact tracker.
- Pokémon checksums and all 24 encrypted-block permutations are validated.

New captures require confirmation because party changes alone do not establish the Nuzlocke encounter clause. Captures sent directly to boxes, gifts, eggs, encounter failures and special battle exceptions still need manual handling. Unhatched egg contents are not transmitted. A Pokémon already fainted at first observation is not silently treated as a newly detected death.

The Lua reader has automated synthetic-memory tests, including its exact TypeScript protocol output. **It has not yet been qualified with a real ROM/emulator session.** ROM hacks with changed layouts, other revisions/languages, mGBA and NDS connectors are not supported by this first adapter.

Keep the desktop application running while playing. Network errors are reported; the Lua script is not a standalone disk-backed recorder.

## SoulLink rooms

1. Create a SoulLink run with two to four players.
2. The host selects their player in **Connections**, chooses a port and starts the room.
3. **Allow connections from my trusted LAN / VPN** is enabled by default so other computers can connect. Without it the room listens on loopback (`127.0.0.1`) only.
4. Give partners the room address, invitation and their player IDs (normally `p2`, `p3`, `p4`). The address uses this PC's IPv4, physical private LAN interfaces first; other reachable addresses (VPN, virtual adapters) are listed below it. IPs and the invitation are masked by default for streaming; they can be revealed or copied (the Copy buttons use Electron's clipboard).
5. Partners choose **Connections → Join room** on their own desktop installations. The shared run appears on their home screen.
6. Each partner binds their own emulator to their assigned player.

Only the host manages shared run settings. Participants can modify their own captures, team and knowledge. The server applies linked deaths and validates ownership. Explicit SoulLink group IDs support linking captures across different zones; old captures continue to use their zone ID as the group. With the **Second Chance (Shiny)** option, each player may also keep one shiny per zone as a second chance, even if that zone is closed. A first shiny (linked automatically or added manually) takes the zone's shiny second chance; a second shiny then takes the regular encounter if it is still free. These shinies are linked to the partners' shinies from the same zone (group `<zone>:shiny`), not to the regular captures. The optional **Turn order** reminder (at run creation or in **Run settings**) shows which player encounters first in the next zone, rotating P1 → P2 → … at every newly encountered zone; it is purely informative.

Player knowledge is isolated when connecting a run. Existing shared manual knowledge is assigned to the player making the first connection; it is not assumed to describe every player's randomizer seed. Captures keep their stable identity through evolution and party rearrangement.

### Disconnections and recovery

- Changes are stored locally before transmission. A persistent outbox survives application restarts.
- Reconnection reapplies independent changes without duplicating acknowledged commands. Conflicting edits are surfaced instead of silently overwriting one another.
- Player credentials reserve a slot. The host can explicitly reset previous credentials when creating a room if a player loses access.
- **Leave room safely** preserves unsent changes in a new offline copy before disconnecting. It does not silently discard them.
- If the host becomes unavailable, local tracking can continue, but the collective state is not authoritative until synchronization resumes.
- Host takeover is manual: agree on an exported shared checkpoint and start a new room with new invitations. There is no automatic host election.

Unencrypted `ws://` is limited to loopback/private LAN/VPN addresses. For Internet play, tick **Reachable from the Internet**: the host serves `wss://` with a persistent self-signed certificate, and the invitation embeds its SHA-256 fingerprint (`token.fingerprint`) so guests pin it before sending any secret. Enter your public IP or domain as the public address and forward the TCP port on your router (or use a VPN such as Tailscale). A `wss://` reverse proxy with a CA-signed certificate also works. Invitations do not bypass NAT, CGNAT or firewalls. A room is a cooperative tracker, not an anti-cheat system.

## Streaming

Existing PNG exports and static share links remain available. In the desktop app, **Connections → Get live overlay URL** provides a local, read-only OBS browser-source URL.

Keep the app running on the OBS computer. The token is in the URL fragment, not in server access URLs. If the app disconnects, the overlay visibly marks the last known state as unavailable rather than presenting it as current.

Reference JSON is bundled for offline use. Some existing sprite URLs and web fonts are external and can still require an Internet connection; offline fonts use system fallbacks.

## Architecture

- `src/lib/tracker`: validated, portable domain records, knowledge isolation, archives, merge rules and observation ingestion.
- `src/store/runStore.ts`: shared UI actions for browser and desktop persistence.
- `desktop`: SQLite, authenticated local bridge, hosted WebSocket rooms and restricted Electron IPC.
- `connectors`: independently implemented, read-only game adapters.
- `tests`: persistence, protocol, ownership, real local WebSocket/HTTP flows, rollback and synthetic Lua memory tests.

Source references for the initial reader:

- [BizHawk Lua API](https://tasvideos.org/Bizhawk/LuaFunctions)
- [FireRed 1.0 symbol map](https://github.com/40Cakes/pokebot-gen3/blob/main/modules/data/symbols/pokefirered.sym)
- [FireRed battle-result structure](https://github.com/pret/pokefirered/blob/master/include/battle.h)
- [Ironmon Tracker feature reference](https://github.com/besteon/Ironmon-Tracker/wiki/Feature-List)
- [NDS Ironmon Tracker feature reference](https://github.com/Brian0255/NDS-Ironmon-Tracker)

No Ironmon tracker source, ROM, BIOS or game save is bundled. Inspiration from those projects does not grant rights to redistribute their code or third-party assets.
