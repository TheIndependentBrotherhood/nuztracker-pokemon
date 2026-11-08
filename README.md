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

```sh
yarn desktop:build
yarn desktop:package
```

The Windows portable executable is generated in `release`. Packaged builds do not include the development dependency tree. The executable is currently unsigned.

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
- Opponent identities and levels from active battlers only. Enemy party contents, hidden moves, exact statistics and abilities are not read for display.
- Enemy moves recorded through a battle-results memory-write callback in **single battles**, when supported by the selected BizHawk core. Missing callback support is reported visibly.
- Map identifiers, observed-move history, ROM/trainer identity checks and explicit reconciliation after save-state loads/backward jumps.
- Pokémon checksums and all 24 encrypted-block permutations are validated.

New captures require confirmation because party changes alone do not establish the Nuzlocke encounter clause. Captures sent directly to boxes, gifts, eggs, encounter failures and special battle exceptions still need manual handling. Unhatched egg contents are not transmitted. A Pokémon already fainted at first observation is not silently treated as a newly detected death.

The Lua reader has automated synthetic-memory tests, including its exact TypeScript protocol output. **It has not yet been qualified with a real ROM/emulator session.** ROM hacks with changed layouts, other revisions/languages, mGBA and NDS connectors are not supported by this first adapter.

Keep the desktop application running while playing. Network errors are reported; the Lua script is not a standalone disk-backed recorder.

## SoulLink rooms

1. Create a SoulLink run with two to four players.
2. The host selects their player in **Connections**, chooses a port and starts the room.
3. Enable **Allow connections from my trusted LAN / VPN** to let other computers connect. Otherwise the room listens on loopback only.
4. Give partners the room address, invitation and their player IDs (normally `p2`, `p3`, `p4`).
5. Partners choose **Connections → Join room** on their own desktop installations. The shared run appears on their home screen.
6. Each partner binds their own emulator to their assigned player.

Only the host manages shared run settings. Participants can modify their own captures, team and knowledge. The server applies linked deaths and validates ownership. Explicit SoulLink group IDs support linking captures across different zones; old captures continue to use their zone ID as the group.

Player knowledge is isolated when connecting a run. Existing shared manual knowledge is assigned to the player making the first connection; it is not assumed to describe every player's randomizer seed. Captures keep their stable identity through evolution and party rearrangement.

### Disconnections and recovery

- Changes are stored locally before transmission. A persistent outbox survives application restarts.
- Reconnection reapplies independent changes without duplicating acknowledged commands. Conflicting edits are surfaced instead of silently overwriting one another.
- Player credentials reserve a slot. The host can explicitly reset previous credentials when creating a room if a player loses access.
- **Leave room safely** preserves unsent changes in a new offline copy before disconnecting. It does not silently discard them.
- If the host becomes unavailable, local tracking can continue, but the collective state is not authoritative until synchronization resumes.
- Host takeover is manual: agree on an exported shared checkpoint and start a new room with new invitations. There is no automatic host election.

Unencrypted `ws://` is limited to loopback/private LAN/VPN addresses. Use a trusted VPN, or configure a secure `wss://` reverse proxy, for Internet play. Invitations do not bypass NAT, CGNAT or firewalls. A room is a cooperative tracker, not an anti-cheat system.

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
