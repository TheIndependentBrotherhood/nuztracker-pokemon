"""Finish the type themed teams of a Platinum Multiplayer ROM themed before the party stride fix.

Older `gymTypes` / `eliteFourTypes` runs wrote only some species at the right place in parties edited by
Project PM. This clears those misplaced writes and gives every off-type Pokémon of a themed gym or Elite
Four room a species of the themed type with a similar BST. Types and species are never printed.
The input ROM is never modified.

Usage: py -3.11 fix_trainer_themes.py <input.nds> <output.nds>
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
    parser.add_argument("--settings", type=Path, default=ROOT / "settings.json")
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        raise SystemExit("ERROR: the output ROM must be different from the input ROM.")
    config = json.loads(args.settings.read_text(encoding="utf-8"))
    pm = load_pm_setup(Path(config["paths"]["projectPmSetup"]))
    rom = pm.RandNDSRom(str(args.input))
    report = rom_extras.repair_trainer_themes(pm, rom, config["coop"]["noLegendaries"], print)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
