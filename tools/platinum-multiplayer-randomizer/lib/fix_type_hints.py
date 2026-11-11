"""Add gym type hints to an already randomized Platinum Multiplayer ROM.

Themed types are read from the trainers' teams (the type shared by every Pokémon of a gym or Elite Four
room) and never printed. Gym city signs then show "Type: <type>" and gym / Elite Four speeches name it.
The input ROM is never modified.

Usage: py -3.11 fix_type_hints.py <input.nds> <output.nds>
"""

import argparse
import json
import sys
from pathlib import Path

import rom_extras
import rom_text
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
    themes = rom_extras.detect_trainer_themes(pm, rom, print)
    gyms = sum(theme.is_gym for theme in themes)
    print(f"Themed groups found: {gyms} gyms, {len(themes) - gyms} Elite Four rooms.")
    report = rom_text.give_type_hints(pm, rom, themes, print)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
