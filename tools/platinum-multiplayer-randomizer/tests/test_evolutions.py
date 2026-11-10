import json
import random
import struct
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import randomize
import rom_evolutions
import rom_extras


def evolution_record(*entries):
    data = bytearray(rom_evolutions.EVOLUTION_RECORD_SIZE)
    for slot, entry in enumerate(entries):
        struct.pack_into("<HHH", data, slot * rom_evolutions.EVOLUTION_ENTRY_SIZE, *entry)
    return bytes(data)


class FakeArchive:
    def __init__(self):
        self.files = [evolution_record() for _ in range(509)]
        self.files[1] = evolution_record((4, 16, 2))
        self.files[2] = evolution_record((4, 30, 3))
        self.files[4] = evolution_record((7, 80, 5), (7, 81, 6), (1, 0, 5))
        self.files[7] = evolution_record((27, 223, 8))
        self.files[290] = evolution_record((13, 20, 291), (14, 20, 292))
        self.num_files = len(self.files)

    def get(self, index):
        return self.files[index]

    def put(self, index, data):
        self.files[index] = bytes(data)


class FakeRom:
    def __init__(self):
        self.data = bytearray(0x3000)
        struct.pack_into("<I", self.data, 0x20, 0x200)
        struct.pack_into("<I", self.data, 0x28, 0x02000000)
        struct.pack_into("<I", self.data, 0x2C, 0x1000)
        self.bonus_offset = 0x400
        self.data[self.bonus_offset : self.bonus_offset + len(rom_evolutions.EXTRA_EVOLUTION_CODE)] = (
            rom_evolutions.EXTRA_EVOLUTION_CODE
        )

    def write(self, start, end, value):
        if start < 0 or end > len(self.data) or end - start != len(value):
            raise ValueError("Invalid ROM write.")
        self.data[start:end] = value


class FakeProjectPm:
    def __init__(self):
        self.archive = FakeArchive()
        self.saved = False
        self.can_save = True

    def rand_load_pokemon_db(self, rom):
        return {species: {} for species in range(1, rom_evolutions.SPECIES_COUNT + 1)}

    def _open_narc(self, rom, path, log):
        if path != rom_evolutions.EVOLUTION_ARCHIVE:
            raise ValueError("Unexpected archive.")
        return (0x1000, 0x2000), self.archive

    def _save_narc(self, rom, span, archive, path, log):
        self.saved = self.can_save
        return self.can_save


def entries(record):
    return [
        struct.unpack_from("<HHH", record, offset)
        for offset in range(0, rom_evolutions.EVOLUTION_SLOTS * rom_evolutions.EVOLUTION_ENTRY_SIZE, 6)
    ]


def assert_acyclic(test, archive):
    graph = {
        species: [target for method, _, target in entries(archive.get(species)) if method]
        for species in range(1, rom_evolutions.SPECIES_COUNT + 1)
    }
    visited, visiting = set(), set()

    def visit(species):
        test.assertNotIn(species, visiting)
        if species in visited:
            return
        visiting.add(species)
        for target in graph[species]:
            visit(target)
        visiting.remove(species)
        visited.add(species)

    for species in graph:
        visit(species)


class RandomEvolutionTests(unittest.TestCase):
    def setUp(self):
        self.pm = FakeProjectPm()
        self.rom = FakeRom()

    def randomize(self, seed=123):
        return rom_evolutions.randomize_evolutions(self.pm, self.rom, random.Random(seed), lambda _: None)

    def test_existing_paths_change_targets_only_and_preserve_bonus_evolution(self):
        before = list(self.pm.archive.files)
        before_rom = bytes(self.rom.data)
        report = self.randomize()
        self.assertTrue(self.pm.saved)
        self.assertIn("targets hidden", report)
        for source, old in enumerate(before):
            new = self.pm.archive.get(source)
            for old_entry, new_entry in zip(entries(old), entries(new)):
                old_method, old_param, old_target = old_entry
                method, param, target = new_entry
                self.assertEqual((method, param), (old_method, old_param))
                if method:
                    self.assertIn(target, range(1, rom_evolutions.SPECIES_COUNT + 1))
                    self.assertNotEqual(target, source)
                    self.assertNotEqual(target, old_target)
                else:
                    self.assertEqual(new_entry, old_entry)
            self.assertEqual(old[42:], new[42:])
            if not any(method for method, _, _ in entries(old)):
                self.assertEqual(old, new)
        branches = entries(self.pm.archive.get(4))
        self.assertEqual(branches[0][2], branches[2][2])
        self.assertNotEqual(branches[0][2], branches[1][2])
        bonus_target = entries(self.pm.archive.get(290))[1][2]
        patch = self.rom.data[self.rom.bonus_offset : self.rom.bonus_offset + 4]
        self.assertEqual((patch[1], patch[3]), (0x20, 0x30))
        self.assertEqual(patch[0] + patch[2], bonus_target)
        self.assertEqual(self.rom.data[: self.rom.bonus_offset], before_rom[: self.rom.bonus_offset])
        self.assertEqual(self.rom.data[self.rom.bonus_offset + 4 :], before_rom[self.rom.bonus_offset + 4 :])
        assert_acyclic(self, self.pm.archive)

    def test_determinism_and_no_cycles_across_seeds(self):
        results = []
        for seed in range(25):
            first, second = FakeProjectPm(), FakeProjectPm()
            first_rom, second_rom = FakeRom(), FakeRom()
            for pm, rom in ((first, first_rom), (second, second_rom)):
                rom_evolutions.randomize_evolutions(pm, rom, random.Random(seed), lambda _: None)
                assert_acyclic(self, pm.archive)
            self.assertEqual(first.archive.files, second.archive.files)
            self.assertEqual(first_rom.data, second_rom.data)
            results.append(first.archive.files[1])
        self.assertGreater(len(set(results)), 1)

    def test_bonus_instruction_encodes_every_supported_species(self):
        for target in range(1, rom_evolutions.SPECIES_COUNT + 1):
            instruction = rom_evolutions.extra_evolution_instruction(target)
            self.assertEqual((instruction[1], instruction[3]), (0x20, 0x30))
            self.assertEqual(instruction[0] + instruction[2], target)
        for target in (0, 494, -1, True):
            with self.subTest(target=target), self.assertRaises(ValueError):
                rom_evolutions.extra_evolution_instruction(target)

    def test_unknown_method_or_invalid_record_fails_without_writing(self):
        for bad_record in (
            evolution_record((28, 1, 2)),
            evolution_record((4, 1, 0)),
            evolution_record((0, 1, 2)),
            bytes(43),
        ):
            with self.subTest(record=bad_record):
                pm, rom = FakeProjectPm(), FakeRom()
                pm.archive.files[1] = bad_record
                before_rom = bytes(rom.data)
                before_archive = list(pm.archive.files)
                with self.assertRaises(RuntimeError):
                    rom_evolutions.randomize_evolutions(pm, rom, random.Random(1), lambda _: None)
                self.assertFalse(pm.saved)
                self.assertEqual(rom.data, before_rom)
                self.assertEqual(pm.archive.files, before_archive)

    def test_unsupported_extra_evolution_code_or_data_fails_without_writing(self):
        for mutation in ("missing_code", "duplicate_code", "different_target", "missing_bonus"):
            with self.subTest(mutation=mutation):
                pm, rom = FakeProjectPm(), FakeRom()
                if mutation == "missing_code":
                    rom.data[rom.bonus_offset] = 0
                elif mutation == "duplicate_code":
                    rom.data[0x500 : 0x500 + len(rom_evolutions.EXTRA_EVOLUTION_CODE)] = (
                        rom_evolutions.EXTRA_EVOLUTION_CODE
                    )
                elif mutation == "different_target":
                    pm.archive.files[290] = evolution_record((13, 20, 291), (14, 20, 293))
                else:
                    pm.archive.files[290] = evolution_record((13, 20, 291))
                before_rom = bytes(rom.data)
                before_archive = list(pm.archive.files)
                with self.assertRaisesRegex(RuntimeError, "extra-evolution"):
                    rom_evolutions.randomize_evolutions(pm, rom, random.Random(1), lambda _: None)
                self.assertFalse(pm.saved)
                self.assertEqual(rom.data, before_rom)
                self.assertEqual(pm.archive.files, before_archive)

    def test_archive_save_failure_does_not_patch_bonus_code(self):
        self.pm.can_save = False
        before = bytes(self.rom.data)
        with self.assertRaisesRegex(RuntimeError, "Could not save"):
            self.randomize()
        self.assertEqual(self.rom.data, before)

    def test_option_is_optional_and_rejects_non_boolean_values(self):
        self.assertFalse(randomize.random_evolutions_enabled({}))
        self.assertFalse(randomize.random_evolutions_enabled({"randomEvolutions": False}))
        self.assertTrue(randomize.random_evolutions_enabled({"randomEvolutions": True}))
        for value in (None, 0, 1, "true", [], {}):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "randomEvolutions"):
                randomize.random_evolutions_enabled({"randomEvolutions": value})

    def test_randomizer_uses_coop_seed_only_when_option_is_enabled(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            setup, source = root / "setup.exe", root / "source.nds"
            setup.write_bytes(b"setup")
            source.write_bytes(b"source")
            pm = Mock()
            pm.randomize_rom.return_value = (True, "ok")
            pm.encode_world_code.return_value = "WORLD"
            pm.encode_coop_code.return_value = "COOP"
            rom = Mock()
            rom.save.side_effect = lambda path: Path(path).write_bytes(b"rom")
            pm.RandNDSRom.return_value = rom
            config = {
                "paths": {"projectPmSetup": str(setup), "inputRom": str(source), "outputRom": str(root / "output.nds")},
                "seeds": {"worldSeed": "1234", "coopSeed": "9876"},
                "yourWorld": dict.fromkeys(
                    (
                        "wildEncounters", "starterTrio", "evolvingStartersOnly", "honeyTreesAndGiftEggs",
                        "specialWildEncounters", "gbaSlotEncounters", "staticEncounters", "giftPokemon",
                        "inGameTradesYouGet", "inGameTradesTheyWant",
                    ),
                    False,
                ),
                "wildEncounterOptions": {
                    "mode": "completelyRandom", "rule": "none", "grass": False, "surfing": False,
                    "fishing": False, "special": False, "noLegendaries": False,
                },
                "romTweaks": {"shinyOdds": 8192, "guaranteedCatch": False},
                "coop": dict.fromkeys(
                    ("trainerTeams", "pokemonTypes", "abilities", "movesets", "similarStrength", "noLegendaries"),
                    False,
                ),
                "extras": {
                    "gymTypes": "off", "eliteFourTypes": "off", "itemBalls": False, "hiddenItems": False,
                    "specialtyClerks": False,
                },
            }
            config_path = root / "settings.json"
            with (
                patch.object(randomize, "load_pm_setup", return_value=pm),
                patch.object(randomize, "log"),
                patch.object(rom_extras, "ItemCatalog"),
                patch.object(rom_extras, "fix_header_crc"),
                patch.object(rom_evolutions, "randomize_evolutions", return_value="Evolution targets hidden.") as apply,
            ):
                for enabled in (None, False, True):
                    if enabled is None:
                        config["extras"].pop("randomEvolutions", None)
                    else:
                        config["extras"]["randomEvolutions"] = enabled
                    config_path.write_text(json.dumps(config), encoding="utf-8")
                    randomize.run(config_path)
                    if enabled is not True:
                        apply.assert_not_called()
                    else:
                        apply.assert_called_once()
                        args = apply.call_args.args
                        self.assertIs(args[0], pm)
                        self.assertIs(args[1], rom)
                        self.assertEqual(args[2].getstate(), rom_extras.seeded("evolutions", "9876").getstate())


if __name__ == "__main__":
    unittest.main()
