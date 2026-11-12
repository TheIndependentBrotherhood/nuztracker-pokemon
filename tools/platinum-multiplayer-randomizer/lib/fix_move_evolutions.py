"""Make an already randomized Platinum Multiplayer ROM's move evolutions happen at a fixed level.

"Level up knowing a move" evolutions (Lickitung, Tangela, Aipom, Yanma, Piloswine, Bonsly, Mime Jr.)
become level evolutions, like Universal Pokemon Randomizer ZX does with random movesets. Evolution
targets are never printed. The input ROM is never modified.

Usage: py -3.11 fix_move_evolutions.py <input.nds> <output.nds>
"""

import argparse
import json
import sys
from pathlib import Path

import rom_evolutions
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
    setup = Path(json.loads(args.settings.read_text(encoding="utf-8"))["paths"]["projectPmSetup"])
    pm = load_pm_setup(setup)
    rom = pm.RandNDSRom(str(args.input))
    report = rom_evolutions.level_move_evolutions(pm, rom, print)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
