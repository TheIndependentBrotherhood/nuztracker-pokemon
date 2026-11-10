import hashlib
import random
import struct
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import rom_extras


class FakeRom:
    def __init__(self):
        self.data = bytearray(b"\xff" * 0x60000)
        self.data[:0x200] = bytes(0x200)
        self.data[0x4000:0x14000] = bytes(0x10000)
        self.data[0x20000:0x25F40] = b"\xa5" * rom_extras.SHOP_OVERLAY_SIZE
        struct.pack_into("<I", self.data, 0x20, 0x4000)
        struct.pack_into("<I", self.data, 0x28, 0x02000000)
        struct.pack_into("<I", self.data, 0x2C, 0x10000)
        struct.pack_into("<II", self.data, 0x48, 0x16000, 16)
        struct.pack_into("<II", self.data, 0x50, 0x16200, 64)
        struct.pack_into("<I", self.data, 0x80, 0x32000)
        struct.pack_into("<II", self.data, 0x16000, 0x20000, 0x25F40)
        struct.pack_into("<II", self.data, 0x16008, 0x26000, 0x30540)
        struct.pack_into(
            "<8I",
            self.data,
            0x16200,
            7,
            rom_extras.SHOP_OVERLAY_RAM,
            rom_extras.SHOP_OVERLAY_SIZE,
            rom_extras.SHOP_OVERLAY_BSS,
            0,
            0,
            0,
            0,
        )
        struct.pack_into("<8I", self.data, 0x16220, 9, rom_extras.SHOP_OVERLAY_RAM, 0xA540, 0, 0, 0, 1, 0)
        city_indices = {index for index, _ in rom_extras.CITY_MARTS}
        stock_offset = 0x4200
        for index in range(rom_extras.MART_COUNT):
            if index in rom_extras.MART_ANCHORS:
                stock = rom_extras.MART_ANCHORS[index]
            elif index == 27:
                stock = tuple(range(2, 10))
            elif index in city_indices:
                stock = (137 + index % 12, 14, 6)
            else:
                stock = (2 + index, 40 + index)
            struct.pack_into("<" + "H" * (len(stock) + 1), self.data, stock_offset, *stock, 0xFFFF)
            struct.pack_into("<I", self.data, 0x9000 + index * 4, 0x02000000 + stock_offset - 0x4000)
            stock_offset += (len(stock) + 1) * 2

    def write(self, start, end, value):
        if end - start != len(value) or start < 0 or end > len(self.data):
            raise ValueError("Invalid ROM write.")
        self.data[start:end] = value


class FakeItems:
    def sellable(self, item):
        return True

    def name(self, item):
        return str(item)


def city_stocks(rom):
    table = rom_extras.find_mart_table(rom_extras.Arm9(rom), rom)
    return [table[index][2] for index, _ in rom_extras.CITY_MARTS]


def clear_league_stones(rom):
    table = rom_extras.find_mart_table(rom_extras.Arm9(rom), rom)
    _, offset, stock = table[27]
    replacements = iter(item for item in rom_extras.SHOP_POOL if item not in stock)
    for index, item in enumerate(stock):
        if item in rom_extras.STONES:
            rom.write(offset + index * 2, offset + index * 2 + 2, struct.pack("<H", next(replacements)))


class MartExpansionTests(unittest.TestCase):
    def setUp(self):
        digest = hashlib.sha256(b"\xa5" * rom_extras.SHOP_OVERLAY_SIZE).hexdigest()
        self.overlay_hash = patch.object(rom_extras, "SHOP_OVERLAY_SHA256", digest)
        self.overlay_hash.start()
        self.addCleanup(self.overlay_hash.stop)
        self.rom = FakeRom()
        self.items = FakeItems()

    def randomize(self, stock_size=None):
        return rom_extras.randomize_marts(self.rom, random.Random(12345), self.items, True, stock_size)

    def test_legacy_randomization_preserves_sizes_and_guarantees_stones(self):
        before = city_stocks(self.rom)
        self.randomize()
        after = city_stocks(self.rom)
        self.assertEqual([len(stock) for stock in after], [len(stock) for stock in before])
        self.assertTrue(all(any(item in rom_extras.STONES for item in stock) for stock in after))
        self.assertTrue(set(rom_extras.STONES).issubset(item for stock in after for item in stock))
        self.assertTrue(all(len(set(stock)) == len(stock) for stock in after))
        self.assertEqual(rom_extras.ShopOverlay(self.rom).metadata, None)

    def test_random_pool_includes_stones_with_or_without_held_items(self):
        for include_held_items in (False, True):
            with self.subTest(include_held_items=include_held_items):
                pool = rom_extras.shop_item_pool(self.items, include_held_items)
                self.assertTrue(set(rom_extras.STONES).issubset(pool))
                self.assertEqual(rom_extras.HELD_ITEMS[0] in pool, include_held_items)
                self.assertEqual(len(pool), len(set(pool)))

    def test_randomization_does_not_depend_on_mail_slots(self):
        table = rom_extras.find_mart_table(rom_extras.Arm9(self.rom), self.rom)
        for index, _ in rom_extras.CITY_MARTS:
            _, offset, stock = table[index]
            for position, item in enumerate(stock):
                if item in rom_extras.MAIL:
                    self.rom.write(offset + position * 2, offset + position * 2 + 2, struct.pack("<H", 14))
        rom_extras.randomize_marts(self.rom, random.Random(12345), self.items, False, 10)
        after = city_stocks(self.rom)
        self.assertTrue(set(rom_extras.STONES).issubset(item for stock in after for item in stock))
        self.assertTrue(all(any(item in rom_extras.STONES for item in stock) for stock in after))
        self.assertTrue(all(len(set(stock)) == 10 for stock in after))
        self.assertFalse(any(item in rom_extras.HELD_ITEMS for stock in after for item in stock))

    def test_expand_existing_stocks_preserves_items_and_unrelated_rom_bytes(self):
        self.randomize()
        clear_league_stones(self.rom)
        before = city_stocks(self.rom)
        self.assertFalse(any(item in rom_extras.STONES for item in before[-1]))
        previous = bytes(self.rom.data)
        old_table = rom_extras.find_mart_table(rom_extras.Arm9(self.rom), self.rom)
        rom_extras.expand_existing_marts(self.rom, random.Random(9), self.items, True, 10)
        table = rom_extras.find_mart_table(rom_extras.Arm9(self.rom), self.rom)
        after = [table[index][2] for index, _ in rom_extras.CITY_MARTS]
        self.assertEqual([len(stock) for stock in after], [10] * 12)
        for old_stock, new_stock in zip(before, after):
            self.assertEqual(new_stock[: len(old_stock)], old_stock)
            self.assertEqual(len(set(new_stock)), 10)
            self.assertTrue(any(item in rom_extras.STONES for item in new_stock))
        self.assertIn(after[-1][len(before[-1])], rom_extras.STONES)
        self.assertTrue(set(rom_extras.STONES).issubset(item for stock in after for item in stock))
        for index in set(range(rom_extras.MART_COUNT)) - {item[0] for item in rom_extras.CITY_MARTS}:
            self.assertEqual(table[index], old_table[index])

        overlay = rom_extras.ShopOverlay(self.rom)
        self.assertEqual(overlay.metadata, (rom_extras.SHOP_OVERLAY_SIZE, 0x5F60, 10))
        self.assertEqual(
            self.rom.data[overlay.start : overlay.start + rom_extras.SHOP_OVERLAY_SIZE],
            previous[0x20000:0x25F40],
        )
        self.assertEqual(self.rom.data[overlay.start + 0x5F40 : overlay.start + 0x5F60], bytes(0x20))
        allowed = [(0x80, 0x84), (0x16000, 0x16008), (0x16208, 0x1620C), (overlay.start, overlay.end)]
        allowed.extend((old_table[index][0], old_table[index][0] + 4) for index, _ in rom_extras.CITY_MARTS)
        changes = [index for index, (old, new) in enumerate(zip(previous, self.rom.data)) if old != new]
        self.assertTrue(changes)
        self.assertTrue(all(any(start <= index < end for start, end in allowed) for index in changes))

    def test_new_rom_randomizes_then_extends_and_keeps_stones(self):
        self.randomize(10)
        stocks = city_stocks(self.rom)
        self.assertEqual([len(stock) for stock in stocks], [10] * 12)
        self.assertTrue(set(rom_extras.STONES).issubset(item for stock in stocks for item in stock))
        self.assertTrue(all(any(item in rom_extras.STONES for item in stock) for stock in stocks))
        self.assertTrue(any(sum(item in rom_extras.STONES for item in stock) > 1 for stock in stocks))
        self.assertTrue(all(len(set(stock)) == 10 for stock in stocks))

    def test_supported_stock_size_boundaries_and_determinism(self):
        for size in (rom_extras.MIN_SHOP_STOCK, rom_extras.MAX_SHOP_STOCK):
            with self.subTest(size=size):
                first, second = FakeRom(), FakeRom()
                for rom in (first, second):
                    rom_extras.randomize_marts(rom, random.Random(12345), self.items, True, size)
                    self.assertEqual([len(stock) for stock in city_stocks(rom)], [size] * 12)
                    self.assertTrue(all(len(set(stock)) == size for stock in city_stocks(rom)))
                    self.assertTrue(all(any(item in rom_extras.STONES for item in stock) for stock in city_stocks(rom)))
                self.assertEqual(first.data, second.data)

    def test_reexpand_preserves_items_and_reuses_space_when_size_is_unchanged(self):
        self.randomize(10)
        before = city_stocks(self.rom)
        overlay = rom_extras.ShopOverlay(self.rom)
        used = rom_extras.u32(self.rom.data, 0x80)
        rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, 10)
        self.assertEqual(city_stocks(self.rom), before)
        self.assertEqual(rom_extras.ShopOverlay(self.rom).start, overlay.start)
        self.assertEqual(rom_extras.u32(self.rom.data, 0x80), used)

        rom_extras.expand_existing_marts(self.rom, random.Random(2), self.items, True, 12)
        after = city_stocks(self.rom)
        self.assertTrue(all(new[:10] == old and len(new) == 12 for old, new in zip(before, after)))
        self.assertGreater(rom_extras.ShopOverlay(self.rom).start, overlay.start)

    def test_stock_size_is_validated_without_changing_rom(self):
        for size in (None, True, False, 7, 33, 10.0, "10"):
            with self.subTest(size=size):
                before = bytes(self.rom.data)
                with self.assertRaises(ValueError):
                    rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, size)
                self.assertEqual(self.rom.data, before)

    def test_invalid_overlay_or_padding_fails_without_changing_rom(self):
        self.randomize()
        self.rom.data[0x20000] = 0
        before = bytes(self.rom.data)
        with self.assertRaisesRegex(RuntimeError, "shop overlay"):
            rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, 10)
        self.assertEqual(self.rom.data, before)

        self.rom.data[0x20000] = 0xA5
        self.rom.data[0x32000] = 0
        before = bytes(self.rom.data)
        with self.assertRaisesRegex(RuntimeError, "padding"):
            rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, 10)
        self.assertEqual(self.rom.data, before)

    def test_unsellable_stone_fails_without_changing_rom(self):
        class MissingStone(FakeItems):
            def sellable(self, item):
                return item != rom_extras.STONES[0]

        before = bytes(self.rom.data)
        with self.assertRaisesRegex(RuntimeError, "cannot be sold"):
            rom_extras.randomize_marts(self.rom, random.Random(1), MissingStone(), True, 10)
        self.assertEqual(self.rom.data, before)

    def test_full_stock_without_a_stone_is_not_silently_modified(self):
        self.randomize(10)
        clear_league_stones(self.rom)
        before = bytes(self.rom.data)
        with self.assertRaisesRegex(ValueError, "without removing an existing item"):
            rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, 10)
        self.assertEqual(self.rom.data, before)

    def test_rerandomizing_preserves_guaranteed_stones_and_adds_one_to_the_league(self):
        self.randomize(10)
        clear_league_stones(self.rom)
        before = city_stocks(self.rom)
        previous = bytes(self.rom.data)
        overlay = rom_extras.ShopOverlay(self.rom)
        rom_extras.rerandomize_existing_marts(self.rom, random.Random(23), self.items, True, 10)
        after = city_stocks(self.rom)
        self.assertEqual([len(stock) for stock in after], [10] * 12)
        for old_stock, new_stock in zip(before, after):
            old_stone = next((item for item in old_stock if item in rom_extras.STONES), None)
            self.assertIn(new_stock[0], rom_extras.STONES)
            if old_stone is not None:
                self.assertEqual(new_stock[0], old_stone)
            self.assertEqual(len(set(new_stock)), 10)
        self.assertTrue(set(rom_extras.STONES).issubset(stock[0] for stock in after))
        self.assertTrue(any(sum(item in rom_extras.STONES for item in stock) > 1 for stock in after))
        self.assertEqual(rom_extras.ShopOverlay(self.rom).start, overlay.start)
        start = overlay.start + overlay.metadata[1] + rom_extras.SHOP_STOCK_HEADER.size
        end = start + len(rom_extras.CITY_MARTS) * (10 + 1) * 2
        self.assertEqual(self.rom.data[:start], previous[:start])
        self.assertEqual(self.rom.data[end:], previous[end:])

    def test_cannot_expand_unrandomized_stocks_or_remove_existing_items(self):
        before = bytes(self.rom.data)
        with self.assertRaisesRegex(RuntimeError, "every evolution stone"):
            rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, 10)
        self.assertEqual(self.rom.data, before)
        self.randomize(10)
        before = bytes(self.rom.data)
        with self.assertRaisesRegex(ValueError, "remove existing items"):
            rom_extras.expand_existing_marts(self.rom, random.Random(1), self.items, True, 8)
        self.assertEqual(self.rom.data, before)


if __name__ == "__main__":
    unittest.main()
