import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import rom_daycycle as dc

ARM9_OFFSET, ARM9_RAM, ARM9_SIZE = 0x200, 0x02000000, 0x2000
TIME_OF_DAY = 0x1000
TABLE, DIVIDE, CONVERT, ASSERT, CALLER = 0x1800, 0x1C00, 0x1D00, 0x1E00, 0x100
TIME = 0x021CEDAC


class FakeRom:
    def __init__(self, data):
        self.data = bytearray(data)

    def write(self, start, end, data):
        assert len(data) == end - start
        self.data[start:end] = data


def fake_rom():
    code = bytearray(ARM9_SIZE)

    def put(relative, data):
        code[TIME_OF_DAY + relative : TIME_OF_DAY + relative + len(data)] = data

    for relative, data in dc.ORIGINAL.items():
        put(relative, data)
    put(dc.ASSERT_CALL, dc.thumb_bl(ARM9_RAM + TIME_OF_DAY + dc.ASSERT_CALL, ARM9_RAM + ASSERT))
    put(dc.DAY_NUMBER_DIVISION, dc.thumb_blx(ARM9_RAM + TIME_OF_DAY + dc.DAY_NUMBER_DIVISION, ARM9_RAM + DIVIDE))
    put(dc.SECONDS_SINCE_MIDNIGHT + 0x20, struct.pack("<I", TIME))
    put(dc.TABLE_LITERAL, struct.pack("<I", ARM9_RAM + TABLE))
    code[TABLE : TABLE + len(dc.TIME_OF_DAY_TABLE)] = dc.TIME_OF_DAY_TABLE
    date_time = ARM9_RAM + TIME_OF_DAY + dc.GET_CURRENT_DATE_TIME
    code[CALLER : CALLER + 4] = dc.thumb_bl(ARM9_RAM + CALLER, date_time)
    code[CALLER + 4 : CALLER + 6] = dc.DATE_TIME_CALLER
    code[CALLER + 6 : CALLER + 10] = dc.thumb_blx(ARM9_RAM + CALLER + 6, ARM9_RAM + CONVERT)
    data = bytearray(ARM9_OFFSET + ARM9_SIZE)
    struct.pack_into("<I", data, 0x20, ARM9_OFFSET)
    struct.pack_into("<I", data, 0x28, ARM9_RAM)
    struct.pack_into("<I", data, 0x2C, ARM9_SIZE)
    data[ARM9_OFFSET:] = code
    return FakeRom(data)


def at(rom, relative):
    return ARM9_OFFSET + TIME_OF_DAY + relative


class DayCycleTest(unittest.TestCase):
    def test_locates_the_clock_routines(self):
        patch = dc.DayCyclePatch(fake_rom())
        self.assertIsNone(patch.patched_hours)
        self.assertEqual(patch.address(0), ARM9_RAM + TIME_OF_DAY)
        self.assertEqual((patch.divide, patch.convert_date_to_day, patch.time), (ARM9_RAM + DIVIDE, ARM9_RAM + CONVERT, TIME))

    def test_patch_calls_the_rom_routines_and_keeps_entry_points(self):
        rom = fake_rom()
        before = bytes(rom.data)
        dc.patch_day_night_cycle(rom, 6)
        code, ram = bytes(rom.data[ARM9_OFFSET:]), ARM9_RAM
        base = TIME_OF_DAY

        def target(relative):
            return dc.call_target(code, base + relative, ram + base + relative)

        clock = dc.VIRTUAL_CLOCK
        self.assertEqual(target(dc.GET_TIME_OF_DAY + 0x02), ram + base + dc.SECONDS_SINCE_MIDNIGHT)
        self.assertEqual(target(dc.GET_TIME_OF_DAY + 0x08), ram + DIVIDE)
        self.assertEqual(target(clock + 0x06), ram + CONVERT)
        self.assertEqual(target(clock + 0x14), ram + DIVIDE)
        self.assertEqual(target(clock + 0x36), ram + DIVIDE)
        self.assertEqual(code[base + clock + 0x12], 6)
        self.assertEqual(struct.unpack_from("<I", code, base + clock + 0x3C)[0], TIME - 0x10)
        # TimeOfDayForHour and GetSecondsSinceMidnight branch to the shared code; their literals are kept.
        self.assertEqual(struct.unpack_from("<H", code, base)[0] >> 11, 0x1C)
        self.assertEqual(struct.unpack_from("<H", code, base + dc.SECONDS_SINCE_MIDNIGHT)[0] >> 11, 0x1C)
        self.assertEqual(struct.unpack_from("<I", code, base + dc.TABLE_LITERAL)[0], ram + TABLE)
        self.assertEqual(struct.unpack_from("<I", code, base + dc.SECONDS_SINCE_MIDNIGHT + 0x20)[0], TIME)
        changed = [index for index, (old, new) in enumerate(zip(before, rom.data)) if old != new]
        start, end = at(rom, dc.SECONDS_SINCE_MIDNIGHT), at(rom, dc.TIME_ELAPSED_END)
        self.assertTrue(all(start <= index < end for index in changed))
        self.assertFalse(any(at(rom, -0x80) <= index < at(rom, dc.GET_TIME_OF_DAY) for index in changed))

    def test_patched_rom_can_be_patched_again(self):
        rom = fake_rom()
        dc.patch_day_night_cycle(rom, 2)
        self.assertEqual(dc.DayCyclePatch(rom).patched_hours, 2)
        report = dc.patch_day_night_cycle(rom, 24)
        self.assertIn("was 2 h", report)
        reference = fake_rom()
        dc.patch_day_night_cycle(reference, 24)
        self.assertEqual(rom.data, reference.data)

    def test_unknown_layout_is_refused(self):
        rom = fake_rom()
        rom.data[at(rom, dc.GET_TIME_OF_DAY)] ^= 1
        with self.assertRaises(RuntimeError):
            dc.DayCyclePatch(rom)

    def test_virtual_clock(self):
        for hours in dc.CYCLE_HOURS:
            previous = dc.virtual_seconds(100, 23, 59, 0, hours)
            for minute in range(1, 240):
                day, rest = divmod(23 * 60 + 59 + minute, 1440)
                value = dc.virtual_seconds(100 + day, rest // 60, rest % 60, 0, hours)
                self.assertTrue(0 <= value < dc.SECONDS_PER_DAY)
                self.assertLessEqual(abs((value - previous) % dc.SECONDS_PER_DAY - 60 * 24 / hours), 1)
                previous = value
        self.assertEqual(dc.virtual_seconds(9000, 13, 45, 12, 24), 13 * 3600 + 45 * 60 + 12)
        self.assertEqual(dc.virtual_seconds(0, 0, 30, 0, 1), 12 * 3600)

    def test_setting(self):
        self.assertIsNone(dc.parse_cycle("real"))
        self.assertIsNone(dc.parse_cycle(None))
        self.assertEqual(dc.parse_cycle(3), 3)
        for value in (0, 25, "3", 2.5, True):
            with self.assertRaises(ValueError):
                dc.parse_cycle(value)


if __name__ == "__main__":
    unittest.main()
