"""Set the day/night cycle length of an already randomized Platinum Multiplayer ROM.

One in-game day lasts the given number of real hours (1-24); dates, berries and daily events keep the real
time. Can be run again on a patched ROM to change the length. The input ROM is never modified.

Usage: py -3.11 fix_day_cycle.py <input.nds> <output.nds> [--hours N]
"""

import argparse
import json
import sys
from pathlib import Path

import rom_daycycle
import rom_extras
from pm_loader import load_pm_setup

ROOT = Path(__file__).resolve().parent.parent


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--hours", type=int, help="real hours per in-game day (default: romTweaks.dayNightCycle)")
    parser.add_argument("--settings", type=Path, default=ROOT / "settings.json")
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        raise SystemExit("ERROR: the output ROM must be different from the input ROM.")
    config = json.loads(args.settings.read_text(encoding="utf-8"))
    hours = rom_daycycle.parse_cycle(
        args.hours if args.hours is not None else config["romTweaks"].get("dayNightCycle", rom_daycycle.REAL_TIME)
    )
    if hours is None:
        raise SystemExit("ERROR: choose a cycle length with --hours (1-24) or romTweaks.dayNightCycle.")
    pm = load_pm_setup(Path(config["paths"]["projectPmSetup"]))
    rom = pm.RandNDSRom(str(args.input))
    report = rom_daycycle.patch_day_night_cycle(rom, hours)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
