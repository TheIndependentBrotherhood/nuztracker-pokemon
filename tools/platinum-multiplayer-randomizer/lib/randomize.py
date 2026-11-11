"""One-click randomizer for Pokemon Platinum Multiplayer (Project PM v0.4.7 hack).

Runs the Project PM randomizer from the user's ProjectPMSetup.exe with the options of
settings.json, then applies the NuzTracker extras (items, marts, themed gyms, shiny odds).
"""

import hashlib
import json
import sys
import time
from pathlib import Path

import rom_extras
import rom_evolutions
import rom_learnsets
import rom_text
import rom_types
from pm_loader import load_pm_setup

ROOT = Path(__file__).resolve().parent.parent
PM_SHINY_THRESHOLDS = {8192: 8, 4096: 16, 2048: 32, 1024: 64, 512: 128, 257: 255}
PATCHED_SHINY_RATES = {128, 64, 32, 16}
MODES = {"completelyRandom": "completely_random", "area1to1": "area_1to1", "global1to1": "global_1to1"}
RULES = {"none": "none", "similarStrength": "similar_strength", "typeTheme": "type_theme"}
THEME_MODES = {"vanilla", "random", "off"}
POKEMON_TYPE_MODES = {"off", "random", "evolutionLines"}


def log(message=""):
    print(message, flush=True)


def bool_option(extras, name):
    enabled = extras.get(name, False)
    if type(enabled) is not bool:
        raise ValueError(f"extras.{name} must be true or false.")
    return enabled


def random_evolutions_enabled(extras):
    return bool_option(extras, "randomEvolutions")


def move_reminder_pre_evolution_moves_enabled(extras):
    return bool_option(extras, "moveReminderPreEvolutionMoves")


def pokemon_types_mode(coop):
    mode = coop["pokemonTypes"]
    if not isinstance(mode, str) or mode not in POKEMON_TYPE_MODES:
        raise ValueError(f"coop.pokemonTypes must be one of {sorted(POKEMON_TYPE_MODES)}.")
    return mode


def build_pm_settings(pm, config):
    world = config["yourWorld"]
    wild = config["wildEncounterOptions"]
    coop = config["coop"]
    seeds = config["seeds"]
    shiny = int(config["romTweaks"]["shinyOdds"])
    if shiny not in PM_SHINY_THRESHOLDS and shiny not in PATCHED_SHINY_RATES:
        raise ValueError(f"shinyOdds must be one of {sorted(PM_SHINY_THRESHOLDS | dict.fromkeys(PATCHED_SHINY_RATES))}.")
    if wild["mode"] not in MODES or wild["rule"] not in RULES:
        raise ValueError(f"mode must be one of {list(MODES)} and rule one of {list(RULES)}.")
    settings = {
        "wilds": world["wildEncounters"],
        "starters": world["starterTrio"],
        "starters_any": not world["evolvingStartersOnly"],
        "starters_pick": None,
        "statics": world["honeyTreesAndGiftEggs"],
        "wild_special": world["specialWildEncounters"],
        "gba_slots": world["gbaSlotEncounters"],
        "battles": world["staticEncounters"],
        "gifts": world["giftPokemon"],
        "trade_get": world["inGameTradesYouGet"],
        "trade_want": world["inGameTradesTheyWant"],
        "mode": MODES[wild["mode"]],
        "rule": RULES[wild["rule"]],
        "grass": wild["grass"],
        "surf": wild["surfing"],
        "fish": wild["fishing"],
        "spec": wild["special"],
        "noleg": wild["noLegendaries"],
        "every_species": True,
        "shiny": PM_SHINY_THRESHOLDS.get(shiny, 255),
        "seed": str(seeds.get("worldSeed") or pm.roll_seed()),
        "trainers": coop["trainerTeams"],
        # Evolution-line types replace Project PM's per-species types after its run.
        "types": pokemon_types_mode(coop) == "random",
        "abilities": coop["abilities"],
        "movesets": coop["movesets"],
        "coop_simstr": coop["similarStrength"],
        "coop_noleg": coop["noLegendaries"],
        "coop_seed": str(seeds.get("coopSeed") or pm.roll_seed()),
    }
    for key in ("worldCode", "coopCode"):
        code = (seeds.get(key) or "").strip()
        if not code:
            continue
        decoded, error = pm.decode_share_code(code)
        if error:
            raise ValueError(f"Invalid {key}: {error}")
        for name, value in decoded.items():
            if name in settings:
                settings[name] = value if isinstance(value, str) or value is None else type(settings[name])(value)
        if key == "worldCode" and decoded.get("shiny") != settings["shiny"]:
            log(f"Note: the World Code sets shiny threshold {decoded.get('shiny')}.")
    return settings, shiny


def run(config_path):
    config = json.loads(config_path.read_text(encoding="utf-8"))
    paths = config["paths"]
    extras = config["extras"]
    random_evolutions = random_evolutions_enabled(extras)
    pre_evolution_moves = move_reminder_pre_evolution_moves_enabled(extras)
    type_hints = bool_option(extras, "gymTypeHints")
    line_types = pokemon_types_mode(config["coop"]) == "evolutionLines"
    for key in ("gymTypes", "eliteFourTypes"):
        if extras[key] not in THEME_MODES:
            raise ValueError(f"extras.{key} must be one of {sorted(THEME_MODES)}.")
    tm_mode = extras.get("fieldTms", "keep")
    if tm_mode not in rom_extras.TM_MODES:
        raise ValueError(f"extras.fieldTms must be one of {sorted(rom_extras.TM_MODES)}.")
    stock_size = extras.get("specialtyClerkStockSize")
    if "specialtyClerkStockSize" in extras:
        rom_extras.validate_shop_stock_size(stock_size)
    setup = Path(paths["projectPmSetup"])
    source = Path(paths["inputRom"])
    output = Path(paths["outputRom"])
    if not setup.is_file():
        raise FileNotFoundError(f"ProjectPMSetup.exe not found: {setup}")
    if not source.is_file():
        raise FileNotFoundError(f"Input ROM not found: {source}")
    if source.resolve() == output.resolve():
        raise ValueError("outputRom must be different from inputRom.")

    log("Loading the Project PM randomizer from your ProjectPMSetup.exe...")
    pm = load_pm_setup(setup)
    settings, shiny = build_pm_settings(pm, config)
    output.parent.mkdir(parents=True, exist_ok=True)

    log("\n=== Step 1/2 - Project PM randomizer ===")
    ok, summary = pm.randomize_rom(str(source), str(output), settings, log)
    if not ok:
        raise RuntimeError(f"Project PM randomizer failed: {summary}")

    log("\n=== Step 2/2 - NuzTracker extras ===")
    rom = pm.RandNDSRom(str(output))
    report = []
    if shiny in PATCHED_SHINY_RATES:
        report.append(rom_extras.patch_shiny_rate(pm, rom, shiny))
    else:
        report.append(f"Shiny odds: 1 in {shiny} (Project PM).")
    if config["romTweaks"].get("guaranteedCatch", False):
        report.append(rom_extras.patch_guaranteed_catch(rom))
    if line_types:
        # Before themed gyms, which pick Pokémon by their final types.
        report.append(
            rom_types.randomize_family_types(
                pm,
                pm.RandNDSRom(str(source)),
                rom,
                rom_extras.seeded("evolution-line-types", settings["coop_seed"]),
                log,
            )
        )
    if random_evolutions:
        report.append(
            rom_evolutions.randomize_evolutions(
                pm, rom, rom_extras.seeded("evolutions", settings["coop_seed"]), log
            )
        )
    if pre_evolution_moves:
        # After evolutions are randomized, so the Move Reminder follows the final lines.
        report.append(rom_learnsets.inherit_learnsets(pm, rom, log))
    gym_rng = rom_extras.seeded("gyms", settings["coop_seed"])
    if extras["gymTypes"] != "off" or extras["eliteFourTypes"] != "off":
        themed, themes = rom_extras.theme_trainers(
            pm, rom, gym_rng, extras["gymTypes"], extras["eliteFourTypes"], settings["coop_noleg"], log
        )
        report.append(themed)
        if type_hints:
            report.append(rom_text.give_type_hints(pm, rom, themes, log))
    items = rom_extras.ItemCatalog(pm, rom, log)
    if extras["itemBalls"] or extras["hiddenItems"]:
        field_tms = rom_extras.FieldTms(items, rom_extras.gift_tms(pm, rom, log))
    if extras["itemBalls"]:
        report.append(
            rom_extras.randomize_field_items(
                pm, rom, rom_extras.seeded("item-balls", settings["seed"]), items, log, tm_mode, field_tms
            )
        )
    if extras["hiddenItems"]:
        report.append(
            rom_extras.randomize_hidden_items(
                rom, rom_extras.seeded("hidden-items", settings["seed"]), items, tm_mode, field_tms
            )
        )
    if extras["specialtyClerks"]:
        report.append(
            rom_extras.randomize_marts(
                rom, rom_extras.seeded("marts", settings["seed"]), items, extras["clerksSellHeldItems"], stock_size
            )
        )
    rom_extras.fix_header_crc(rom)
    rom.save(str(output))

    fingerprint = hashlib.sha1(output.read_bytes()).hexdigest()[:16]
    codes = [
        f"World Seed:   {settings['seed']}",
        f"Co-Op Seed:   {settings['coop_seed']}",
        f"World Code:   {pm.encode_world_code(settings)}",
        f"Co-Op Code:   {pm.encode_coop_code(settings)}",
        f"Final SHA-1:  {fingerprint}  (same settings.json + same seeds = same value for every player)",
    ]
    text = "\n".join(
        [
            "Pokemon Platinum Multiplayer - NuzTracker randomizer",
            time.strftime("%Y-%m-%d %H:%M:%S"),
            f"Input:  {source}",
            f"Output: {output}",
            "",
            *codes,
            "",
            "Project PM: " + str(summary),
            "",
            *report,
            "",
        ]
    )
    report_path = output.with_suffix(".nuztracker.txt")
    report_path.write_text(text, encoding="utf-8")
    log("\n" + "\n".join(report))
    log("\n" + "\n".join(codes))
    log(f"\nDone! ROM: {output}\nReport: {report_path}")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    config_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "settings.json"
    try:
        run(config_path)
    except Exception as error:
        log(f"\nERROR: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
