import random
import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import randomize
import rom_evolutions
import rom_types


def evolution_record(*entries):
    data = bytearray(rom_evolutions.EVOLUTION_RECORD_SIZE)
    for slot, entry in enumerate(entries):
        struct.pack_into("<HHH", data, slot * rom_evolutions.EVOLUTION_ENTRY_SIZE, *entry)
    return bytes(data)


def personal_record(type1, type2):
    data = bytearray(rom_types.PERSONAL_RECORD_SIZE)
    data[6], data[7] = type1, type2
    return bytes(data)


class FakeArchive:
    def __init__(self, files):
        self.files = list(files)
        self.num_files = len(self.files)

    def get(self, index):
        return self.files[index]

    def put(self, index, data):
        self.files[index] = bytes(data)


def personal_files():
    files = [personal_record(0, 0) for _ in range(508)]
    # Turtwig line: Grass, Grass, Grass/Ground; Eevee line branches to several types.
    files[387], files[388], files[389] = personal_record(12, 12), personal_record(12, 12), personal_record(12, 4)
    files[133], files[134], files[135] = personal_record(0, 0), personal_record(11, 11), personal_record(13, 13)
    files[479] = personal_record(13, 7)
    files[505] = personal_record(13, 15)
    for index in range(1, 494):
        if index not in (387, 388, 389, 133, 134, 135, 479):
            files[index] = personal_record(index % 18, (index * 7) % 18)
    return files


class FakeProjectPm:
    def __init__(self):
        evolutions = [evolution_record() for _ in range(509)]
        evolutions[387] = evolution_record((4, 18, 388))
        evolutions[388] = evolution_record((4, 32, 389))
        evolutions[133] = evolution_record((7, 84, 134), (7, 83, 135))
        self.archives = {
            ("source", rom_types.EVOLUTION_ARCHIVE): FakeArchive(evolutions),
            ("source", rom_types.PERSONAL_ARCHIVE): FakeArchive(personal_files()),
            # Project PM may already have randomized the output's types.
            ("output", rom_types.PERSONAL_ARCHIVE): FakeArchive(
                [personal_record(5, 5) for _ in range(508)]
            ),
        }
        self.saved = False

    def _open_narc(self, rom, path, log):
        return (0, 0), self.archives[rom, path]

    def _save_narc(self, rom, span, archive, path, log):
        self.saved = True
        return True


def types_of(archive, index):
    data = archive.get(index)
    return data[6], data[7]


class EvolutionLineTypeTests(unittest.TestCase):
    def setUp(self):
        self.pm = FakeProjectPm()
        self.report = rom_types.randomize_family_types(
            self.pm, "source", "output", random.Random(42), lambda _: None
        )
        self.output = self.pm.archives["output", rom_types.PERSONAL_ARCHIVE]

    def test_a_line_keeps_one_swap_from_its_original_types(self):
        self.assertTrue(self.pm.saved)
        turtwig, grotle, torterra = (types_of(self.output, index) for index in (387, 388, 389))
        self.assertEqual(turtwig, grotle)
        self.assertEqual(turtwig[0], torterra[0])
        self.assertNotEqual(torterra[0], torterra[1])
        self.assertIn("families", self.report)

    def test_branches_stay_distinct_and_forms_follow_their_base_species(self):
        eevee, vaporeon, jolteon = (types_of(self.output, index) for index in (133, 134, 135))
        self.assertEqual(len({eevee[0], vaporeon[0], jolteon[0]}), 3)
        rotom, rotom_form = types_of(self.output, 479), types_of(self.output, 505)
        self.assertEqual(rotom[0], rotom_form[0])
        self.assertNotEqual(rotom_form[0], rotom_form[1])

    def test_every_species_is_rewritten_from_the_input_rom(self):
        changed = sum(types_of(self.output, index) != (5, 5) for index in range(1, 494))
        self.assertGreater(changed, 400)

    def test_families_join_every_evolution(self):
        families = rom_types.evolution_families(
            {1: [(0, 4, 16, 2)], 2: [(0, 4, 32, 3)], 4: [(0, 4, 16, 5)]}, [1, 2, 3, 4, 5, 6]
        )
        self.assertEqual(families, [[1, 2, 3], [4, 5], [6]])


class ConfigTests(unittest.TestCase):
    def test_pokemon_types_accepts_only_string_modes(self):
        for mode in ("off", "random", "evolutionLines"):
            self.assertEqual(randomize.pokemon_types_mode({"pokemonTypes": mode}), mode)
        for invalid in (True, False, "lines"):
            with self.assertRaises(ValueError):
                randomize.pokemon_types_mode({"pokemonTypes": invalid})


if __name__ == "__main__":
    unittest.main()
