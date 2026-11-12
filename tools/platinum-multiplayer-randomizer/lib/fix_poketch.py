"""Add or rebuild the Poketch digital watch panel: cycle time, Repel steps, period countdown and weather.

Usage: py -3.11 fix_poketch.py <input.nds> <output.nds>
An already installed panel is rebuilt in place. The input ROM and all save data are left unchanged.
"""

import argparse
import json
import sys
from pathlib import Path

import rom_extras
import rom_poketch
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
    report = rom_poketch.patch_poketch_panel(rom)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
