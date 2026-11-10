import random
import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import rom_extras


class AllReal:
    def is_real(self, item):
        return True


class FakeNarc:
    def __init__(self, files):
        self.files = files
        self.num_files = len(files)

    def get(self, index):
        return self.files[index]


class FakePm:
    def __init__(self, files):
        self.narc = FakeNarc(files)

    def _open_narc(self, rom, path, log):
        return None, self.narc


def save_with_tms(main, backup, main_counter=1, backup_counter=2):
    save = bytearray(0x80000)
    for base, tms, counter in ((0, main, main_counter), (0x40000, backup, backup_counter)):
        struct.pack_into("<III", save, base + 0xCF2C - 0x14, counter, counter, 0xCF2C)
        for slot, tm in enumerate(tms):
            struct.pack_into("<HH", save, base + 0x98C + slot * 4, tm, 99)
    return bytes(save)


class FieldTmTests(unittest.TestCase):
    def test_keep_mode_places_each_tm_once_then_other_items(self):
        items = AllReal()
        tms = rom_extras.FieldTms(items, {328, 329})
        pool = rom_extras.field_pool(items, "keep")
        rng = random.Random(1)
        placed = [rom_extras.replacement_for(330, rng, pool, "keep", tms) for _ in range(120)]
        field_tms = [item for item in placed if item in rom_extras.TM_SET]
        self.assertEqual(len(field_tms), len(set(field_tms)))
        self.assertEqual(len(field_tms), 90)
        self.assertNotIn(328, field_tms)
        self.assertNotIn(329, field_tms)

    def test_random_mode_never_repeats_a_tm(self):
        items = AllReal()
        tms = rom_extras.FieldTms(items, {350})
        pool = rom_extras.field_pool(items, "random")
        rng = random.Random(2)
        placed = [rom_extras.replacement_for(2, rng, pool, "random", tms) for _ in range(2000)]
        field_tms = [item for item in placed if item in rom_extras.TM_SET]
        self.assertGreater(len(field_tms), 50)
        self.assertEqual(len(field_tms), len(set(field_tms)))
        self.assertNotIn(350, field_tms)
        self.assertEqual(rom_extras.replacement_for(420, rng, pool, "random", tms), 420)

    def test_dedupe_replaces_repeated_reserved_and_owned_tms_only(self):
        placed = [2, 340, 341, 340, 342, 3, 341]
        plan = rom_extras.plan_tm_dedupe(placed, {342}, AllReal(), random.Random(3))
        self.assertEqual(sorted(plan), [3, 4, 6])
        final = [plan.get(slot, item) for slot, item in enumerate(placed)]
        tms = [item for item in final if item in rom_extras.TM_SET]
        self.assertEqual(len(tms), len(set(tms)))
        self.assertNotIn(342, final)
        self.assertEqual(final[1], 340)
        self.assertEqual(final[2], 341)

    def test_dedupe_falls_back_to_other_items_without_free_tms(self):
        placed = [*rom_extras.TMS, 330]
        plan = rom_extras.plan_tm_dedupe(placed, set(), AllReal(), random.Random(4))
        self.assertEqual(list(plan), [len(placed) - 1])
        self.assertNotIn(plan[len(placed) - 1], rom_extras.TM_SET)

    def test_owned_tms_come_from_the_latest_save_block(self):
        self.assertEqual(rom_extras.owned_tms_from_save(save_with_tms([352], [352, 405])), {352, 405})
        self.assertEqual(rom_extras.owned_tms_from_save(save_with_tms([360], [361], 5, 4)), {360})
        with self.assertRaises(ValueError):
            rom_extras.owned_tms_from_save(bytes(0x80000))

    def test_gift_tms_are_read_outside_the_item_ball_scripts(self):
        files = [b""] * (rom_extras.ITEM_SCRIPT_FILE + 1)
        files[3] = b"\x28\x00\x04\x80" + struct.pack("<H", 345) + b"\x28\x00\x04\x80" + struct.pack("<H", 20)
        files[rom_extras.ITEM_SCRIPT_FILE] = b"\x28\x00\x04\x80" + struct.pack("<H", 346)
        self.assertEqual(rom_extras.gift_tms(FakePm(files), None, print), {345})


if __name__ == "__main__":
    unittest.main()
