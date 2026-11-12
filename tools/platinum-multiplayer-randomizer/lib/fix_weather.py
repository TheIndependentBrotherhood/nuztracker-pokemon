"""Add, update or remove random daily weather on an already randomized Platinum Multiplayer ROM.

One weighted weather is picked per in-game day for outdoor towns and routes, and battles start with it
(sun acts like Sunny Day). Weights come from romTweaks.randomWeather; set it to false (or pass --disable)
to restore the original weathers. Run again to change the weights; the weather seed of a patched ROM is
kept unless --reseed is given. The input ROM is never modified.

Usage: py -3.11 fix_weather.py <input.nds> <output.nds> [--reseed | --disable]
"""

import argparse
import json
import random
import sys
from pathlib import Path

import rom_extras
import rom_weather
from pm_loader import load_pm_setup

ROOT = Path(__file__).resolve().parent.parent


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--reseed", action="store_true", help="pick a new weather sequence")
    parser.add_argument("--disable", action="store_true", help="remove the patch and restore original weathers")
    parser.add_argument("--settings", type=Path, default=ROOT / "settings.json")
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        raise SystemExit("ERROR: the output ROM must be different from the input ROM.")
    config = json.loads(args.settings.read_text(encoding="utf-8"))
    weights = None if args.disable else rom_weather.parse_random_weather(config["romTweaks"].get("randomWeather", False))
    pm = load_pm_setup(Path(config["paths"]["projectPmSetup"]))
    rom = pm.RandNDSRom(str(args.input))
    if weights is None:
        report = rom_weather.remove_random_weather(rom)
        if report is None:
            raise SystemExit("Random weather is not installed on this ROM: nothing to do.")
    else:
        existing = rom_weather.WeatherPatch(rom).patched_seed
        seed = existing if existing is not None and not args.reseed else random.SystemRandom().getrandbits(32)
        report = rom_weather.patch_random_weather(rom, weights, seed)
    rom_extras.fix_header_crc(rom)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rom.save(str(args.output))
    print(report)
    print(f"Done! ROM: {args.output}")


if __name__ == "__main__":
    main()
