"""Fix an already randomized Platinum Multiplayer ROM whose field TMs do not fit in the bag.

Platinum Multiplayer stores an obtained TM as 99 copies, so the game says the bag is full when the
player finds a TM they already own. This replaces duplicate field TMs, field TMs that NPCs give, and
TMs already owned in the given saves. The input ROM is never modified.

Usage: py -3.11 fix_field_tms.py <input.nds> <output.nds> [--save player.sav ...] [--seed text]
"""

import argparse
import json
import sys
from pathlib import Path

import rom_extras
from pm_loader import load_pm_setup

ROOT = Path(__file__).resolve().parent.parent


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--save", type=Path, action="append", default=[], help="a player's .sav (repeatable)")
    parser.add_argument("--seed", default="field-tm-fix", help="same seed + same ROM + same saves = same ROM")
    parser.add_argument("--settings", type=Path, default=ROOT / "settings.json")
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        raise SystemExit("ERROR: the output ROM must be different from the input ROM.")
    owned = set()
    for save in args.save:
        owned |= rom_extras.owned_tms_from_save(save.read_bytes())
    setup = Path(json.loads(args.settings.read_text(encoding="utf-8"))["paths"]["projectPmSetup"])
    pm = load_pm_setup(setup)
    rom = pm.RandNDSRom(str(args.input))
    items = rom_extras.ItemCatalog(pm, rom, print)
    report = rom_extras.dedupe_field_tms(pm, rom, rom_extras.seeded("field-tm-fix", args.seed), items, print, owned)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
