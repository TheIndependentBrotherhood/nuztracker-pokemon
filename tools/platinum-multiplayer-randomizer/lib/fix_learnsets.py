"""Let an already randomized Platinum Multiplayer ROM's evolutions relearn their pre-evolutions' moves.

Each species whose (random) pre-evolutions know level-up moves it lacks can relearn all of them at the
Move Reminder only; level-up learnsets stay unchanged and no move is dropped. Evolution targets are
read from the ROM and never printed. The input ROM is never modified.

Usage: py -3.11 fix_learnsets.py <input.nds> <output.nds>
"""

import argparse
import json
import sys
from pathlib import Path

import rom_extras
import rom_learnsets
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
    setup = Path(json.loads(args.settings.read_text(encoding="utf-8"))["paths"]["projectPmSetup"])
    pm = load_pm_setup(setup)
    rom = pm.RandNDSRom(str(args.input))
    report = rom_learnsets.inherit_learnsets(pm, rom, print)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
