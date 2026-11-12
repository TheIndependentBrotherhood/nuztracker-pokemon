import hashlib
import struct
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import rom_daycycle as clock
import rom_poketch as watch
import rom_weather as weather

try:
    import unicorn
    from unicorn import arm_const as arm
except ImportError:
    unicorn = None


class Clock:
    def address(self, relative):
        return 0x02013EA0 + relative


class PoketchTest(unittest.TestCase):
    def test_font_fits_unused_character_memory(self):
        self.assertEqual(len(watch.font_tiles()), 59 * 32)
        self.assertLess(watch.FONT_VRAM + len(watch.font_tiles()), 0x06207000)
        for text in ("REPEL STEPS OFF MORNING DAY NIGHT IN", "0123456789:"):
            self.assertTrue(all(character == " " or character in watch.GLYPHS for character in text))

    def test_payload_and_calls_fit_the_overlay(self):
        payload, labels = watch.build_panel(0x02277A8C, Clock())
        self.assertLess(len(payload) + watch.ORIGINAL_SIZE + watch.HEADER.size, 0x1900)
        self.assertEqual(labels["font"] % 2, 0)
        self.assertTrue(payload.endswith(watch.font_tiles()))
        for offset in watch.RTC_CALLS:
            data = clock.thumb_bl(watch.RAM + offset, labels["read_time"])
            self.assertEqual(clock.call_target(data, 0, watch.RAM + offset), labels["read_time"])

    def test_countdown_uses_real_seconds_for_all_cycles(self):
        for hours in range(1, 25):
            duration = hours * 3600
            for elapsed in range(0, duration, 7):
                virtual = elapsed * 24 // hours
                name, remaining = watch.remaining_seconds(virtual, hours)
                boundary = next(value for value in (14400, 36000, 72000, 100800) if value > virtual)
                self.assertEqual(remaining, boundary * hours // 24 - elapsed)
                self.assertIn(name, ("MORNING", "DAY", "NIGHT"))
        self.assertEqual(watch.remaining_seconds(14400, 1), ("DAY", 900))
        self.assertEqual(watch.remaining_seconds(36000, 1), ("NIGHT", 1500))
        self.assertEqual(watch.remaining_seconds(72000, 1), ("MORNING", 1200))
        self.assertEqual(watch.remaining_seconds(61200, 1), ("NIGHT", 450))
        for value, hours in ((-1, 1), (86400, 1), (0, 0), (0, 25)):
            with self.assertRaises(ValueError):
                watch.remaining_seconds(value, hours)


class PatchSafetyTest(unittest.TestCase):
    def setUp(self):
        self.data = bytearray(b"\xff" * 0x80000)
        self.table, self.fat, self.used = 0x200, 0x300, 0x54000
        struct.pack_into("<I", self.data, 0x20, 0x4000)
        struct.pack_into("<II", self.data, 0x28, 0x02000000, 0x40000)
        struct.pack_into("<II", self.data, 0x48, self.fat, 16)
        struct.pack_into("<II", self.data, 0x50, self.table, 64)
        struct.pack_into("<I", self.data, 0x80, self.used)
        struct.pack_into("<8I", self.data, self.table, 25, 0x02274FC0, 0x24E0, 0, 0, 0, 0, 0)
        struct.pack_into("<8I", self.data, self.table + 32, 26, watch.RAM, watch.ORIGINAL_SIZE, 0, 0, 0, 1, 0)
        struct.pack_into("<4I", self.data, self.fat, 0x50000, 0x524E0, 0x53000, 0x535E0)
        self.original = b"\xab" * watch.ORIGINAL_SIZE
        self.data[0x53000:0x535E0] = self.original
        self.data[0x50000 + watch.GET_SAVE - 0x02274FC0:0x50004 + watch.GET_SAVE - 0x02274FC0] = bytes.fromhex("406d7047")
        for address, expected in {
            watch.GET_REPEL: bytes.fromhex("014940187047c0464f010000"),
            watch.GET_ENCOUNTERS: bytes.fromhex("014b19211847c046bd520202"),
        }.items():
            offset = 0x4000 + address - 0x02000000
            self.data[offset:offset + len(expected)] = expected
        self.rom = SimpleNamespace(data=self.data, write=self.write)
        self.rtc = Clock()
        self.rtc.arm9 = SimpleNamespace(ram=0x02000000)
        self.rtc.divide = watch.DIVIDE

    def write(self, start, end, value):
        self.assertEqual(len(value), end - start)
        self.data[start:end] = value

    def apply(self):
        with patch.object(watch, "ORIGINAL_HASH", hashlib.sha256(self.original).hexdigest()), \
             patch.object(watch, "ORIGINAL_SITES", {offset: self.original[offset:offset + len(data)] for offset, data in watch.ORIGINAL_SITES.items()}), \
             patch.object(watch, "weather_table_address", return_value=None), \
             patch.object(watch.clock, "DayCyclePatch", return_value=self.rtc):
            return watch.patch_poketch_panel(self.rom)

    def test_only_overlay_metadata_and_new_padding_are_written(self):
        before = bytes(self.data)
        self.apply()
        start, end = struct.unpack_from("<II", self.data, self.fat + 8)
        self.assertEqual(start, self.used)
        self.assertEqual(bytes(self.data[0x53000:0x535E0]), self.original)
        allowed = [(0x80, 0x84), (self.fat + 8, self.fat + 16), (self.table + 40, self.table + 44), (start, end)]
        changed = [index for index, (a, b) in enumerate(zip(before, self.data)) if a != b]
        self.assertTrue(changed)
        self.assertTrue(all(any(lo <= index < hi for lo, hi in allowed) for index in changed))
        installed = bytes(self.data)
        self.assertIn("updated", self.apply())
        self.assertEqual(bytes(self.data), installed)

    def test_rebuild_with_a_smaller_panel_clears_the_old_tail(self):
        self.apply()
        start, end = struct.unpack_from("<II", self.data, self.fat + 8)
        self.data[end : end + 0x40] = bytes(0x40)
        struct.pack_into("<II", self.data, self.fat + 8, start, end + 0x40)
        struct.pack_into("<I", self.data, self.table + 40, end + 0x40 - start)
        struct.pack_into("<I", self.data, 0x80, end + 0x40)
        self.apply()
        self.assertEqual(struct.unpack_from("<II", self.data, self.fat + 8), (start, end))
        self.assertEqual(bytes(self.data[end : end + 0x40]), b"\xff" * 0x40)

    def test_installed_panel_before_other_files_is_refused(self):
        self.apply()
        struct.pack_into("<I", self.data, 0x80, struct.unpack_from("<I", self.data, 0x80)[0] + 0x200)
        before = bytes(self.data)
        with self.assertRaisesRegex(RuntimeError, "end of the ROM"):
            self.apply()
        self.assertEqual(bytes(self.data), before)

    def test_unknown_overlay_is_refused_without_writes(self):
        self.data[0x53000] ^= 1
        before = bytes(self.data)
        with self.assertRaisesRegex(RuntimeError, "digital watch"):
            self.apply()
        self.assertEqual(bytes(self.data), before)

    def test_occupied_padding_is_refused_without_writes(self):
        self.data[self.used] = 0
        before = bytes(self.data)
        with self.assertRaisesRegex(RuntimeError, "padding"):
            self.apply()
        self.assertEqual(bytes(self.data), before)

    def test_neighboring_overlay_is_not_overwritten(self):
        struct.pack_into("<I", self.data, 0x54, 96)
        struct.pack_into("<8I", self.data, self.table + 64, 200, watch.RAM + watch.ORIGINAL_SIZE, 0x100, 0, 0, 0, 0, 0)
        before = bytes(self.data)
        with self.assertRaisesRegex(RuntimeError, "overlap"):
            self.apply()
        self.assertEqual(bytes(self.data), before)


@unittest.skipUnless(unicorn, "Install unicorn to execute the native ARM/Thumb display tests.")
class NativePoketchTest(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.address = 0x02277A8C
        self.payload, self.labels = watch.build_panel(self.address, self.clock)
        self.mu = unicorn.Uc(unicorn.UC_ARCH_ARM, unicorn.UC_MODE_ARM)
        self.mu.mem_map(0x02000000, 0x400000)
        self.mu.mem_map(0x06200000, 0x20000)
        self.mu.mem_write(self.address, self.payload)
        self.graphics, self.data, self.bg = 0x02300000, 0x02300100, 0x02300200
        self.tilemap, self.system, self.save, self.encounters, self.repel = (
            0x02301000, 0x02302000, 0x02302100, 0x02302200, 0x02302300,
        )
        self.write_words(self.graphics, self.data, self.bg)
        self.write_words(self.data + 0x14, self.system)
        self.write_words(self.bg + 6 * 0x2C + 8, self.tilemap)
        self.virtual = 0
        self.mu.hook_add(unicorn.UC_HOOK_CODE, self.native_call)
        self.set_cycle(1)

    def write_words(self, address, *values):
        self.mu.mem_write(address, struct.pack(f"<{len(values)}I", *values))

    def native_call(self, mu, address, size, data):
        result = None
        if address == self.clock.address(clock.SECONDS_SINCE_MIDNIGHT):
            result = self.virtual
        elif address == watch.DIVIDE:
            numerator, divisor = mu.reg_read(arm.UC_ARM_REG_R0), mu.reg_read(arm.UC_ARM_REG_R1)
            result, remainder = divmod(numerator, divisor)
            mu.reg_write(arm.UC_ARM_REG_R1, remainder)
        elif address == watch.GET_SAVE:
            self.assertEqual(mu.reg_read(arm.UC_ARM_REG_R0), self.system)
            result = self.save
        elif address == watch.GET_ENCOUNTERS:
            self.assertEqual(mu.reg_read(arm.UC_ARM_REG_R0), self.save)
            result = self.encounters
        elif address == watch.GET_REPEL:
            self.assertEqual(mu.reg_read(arm.UC_ARM_REG_R0), self.encounters)
            result = self.repel
        elif address == watch.ORIGINAL_DRAW:
            self.assertEqual(mu.reg_read(arm.UC_ARM_REG_R0), self.graphics)
            result = 0
        if result is not None:
            mu.reg_write(arm.UC_ARM_REG_R0, result)
            mu.reg_write(arm.UC_ARM_REG_R2, 0xDEADBEEF)
            mu.reg_write(arm.UC_ARM_REG_R3, 0xDEADBEEF)
            mu.reg_write(arm.UC_ARM_REG_PC, mu.reg_read(arm.UC_ARM_REG_LR))

    def set_cycle(self, hours):
        seconds = self.clock.address(clock.SECONDS_SINCE_MIDNIGHT)
        if hours is None:
            self.mu.mem_write(seconds, bytes.fromhex("18b4"))
        else:
            self.mu.mem_write(seconds, clock.thumb_b(seconds, self.clock.address(clock.VIRTUAL_CLOCK)))
            self.mu.mem_write(self.clock.address(clock.VIRTUAL_CLOCK + 0x12), bytes([hours]))

    def call(self, name, argument):
        registers = (arm.UC_ARM_REG_R4, arm.UC_ARM_REG_R5, arm.UC_ARM_REG_R6, arm.UC_ARM_REG_R7)
        for index, register in enumerate(registers):
            self.mu.reg_write(register, 0x12340000 + index)
        self.mu.reg_write(arm.UC_ARM_REG_R0, argument)
        self.mu.reg_write(arm.UC_ARM_REG_SP, 0x023FF000)
        self.mu.reg_write(arm.UC_ARM_REG_LR, 0x023F0001)
        self.mu.emu_start(self.labels[name] | 1, 0x023F0000, count=100000)
        self.assertEqual(self.mu.reg_read(arm.UC_ARM_REG_PC), 0x023F0000)
        self.assertEqual(self.mu.reg_read(arm.UC_ARM_REG_SP), 0x023FF000)
        self.assertEqual([self.mu.reg_read(register) for register in registers], [0x12340000 + i for i in range(4)])

    def row(self, index):
        data = self.mu.mem_read(self.tilemap + index * 64 + 6, 44)
        values = struct.unpack("<22H", data)
        return "".join(chr(value - watch.FONT_TILE + 32) for value in values).rstrip()

    def test_native_clock_fields(self):
        for virtual in (0, 14399, 14400, 35999, 36000, 71999, 72000, 86399):
            self.virtual = virtual
            self.call("read_time", self.data)
            self.assertEqual(struct.unpack("<3I", self.mu.mem_read(self.data, 12)), (
                virtual // 3600, virtual // 60 % 60, virtual % 60,
            ))

    def test_native_font_and_repel_rows(self):
        self.virtual = 36000
        self.mu.mem_write(self.repel, bytes([250]))
        self.call("init_panel", self.graphics)
        self.assertEqual(bytes(self.mu.mem_read(watch.FONT_VRAM, len(watch.font_tiles()))), watch.font_tiles())
        self.assertEqual(bytes(self.mu.mem_read(self.tilemap + 18 * 64, 4)), bytes(4))
        self.assertEqual(bytes(self.mu.mem_read(self.tilemap + 18 * 64 + 52, 12)), bytes(12))
        for steps in (250, 200, 100, 99, 10, 1, 0):
            self.mu.mem_write(self.repel, bytes([steps]))
            self.call("draw_panel", self.graphics)
            self.assertEqual(self.row(4), f"REPEL {steps:03} STEPS" if steps else "REPEL OFF")
            self.assertEqual(bytes(self.mu.mem_read(self.repel, 1)), bytes([steps]))

    def test_native_countdown_and_cycle_changes(self):
        for hours in range(1, 25):
            self.set_cycle(hours)
            for elapsed in (0, 1, 599, 600, 1499, 1500, 2999, 3000, hours * 3600 - 1):
                if elapsed >= hours * 3600:
                    continue
                self.virtual = elapsed * 24 // hours
                self.call("draw_panel", self.graphics)
                name, remaining = watch.remaining_seconds(self.virtual, hours)
                expected = f"{name} IN {remaining // 3600:02}:{remaining // 60 % 60:02}:{remaining % 60:02}"
                self.assertEqual(self.row(18), expected)
        self.set_cycle(None)
        self.virtual = 35999
        self.call("draw_panel", self.graphics)
        self.assertEqual(self.row(18), "DAY IN 00:00:01")

    def test_native_weather_row(self):
        table = 0x020F09CC
        self.payload, self.labels = watch.build_panel(self.address, self.clock, table)
        self.mu.mem_write(self.address, self.payload)
        self.mu.hook_add(unicorn.UC_HOOK_CODE, self.weather_call, begin=table + watch.WEATHER_ENTRY, end=table + watch.WEATHER_ENTRY)
        self.virtual = 36000
        self.call("draw_panel", self.graphics)
        self.assertEqual(self.row(watch.WEATHER_ROW), "")
        self.mu.mem_write(table, b"NZW2")
        for code, name in {**watch.WEATHER_NAMES, 3: None, 200: None}.items():
            self.weather = code
            self.call("draw_panel", self.graphics)
            self.assertEqual(self.row(watch.WEATHER_ROW), f"WEATHER {name}" if name else "")
            self.assertEqual(self.row(18), "NIGHT IN 00:25:00")
            self.assertEqual(self.row(4), "REPEL OFF")
        self.mu.mem_write(table, b"NZWX")
        self.call("draw_panel", self.graphics)
        self.assertEqual(self.row(watch.WEATHER_ROW), "")

    def weather_call(self, mu, address, size, data):
        mu.reg_write(arm.UC_ARM_REG_R0, self.weather)
        for register in (arm.UC_ARM_REG_R1, arm.UC_ARM_REG_R2, arm.UC_ARM_REG_R3):
            mu.reg_write(register, 0xDEADBEEF)
        mu.reg_write(arm.UC_ARM_REG_PC, mu.reg_read(arm.UC_ARM_REG_LR))

    def test_weather_names_fit_the_font_and_entry(self):
        self.assertEqual(watch.WEATHER_ENTRY, weather.today_address(0))
        self.assertEqual(watch.WEATHER_MAGIC, int.from_bytes(weather.MAGIC, "little"))
        self.assertEqual(set(watch.WEATHER_NAMES), set(weather.WEATHER_CODES.values()))
        for name in ("WEATHER", *watch.WEATHER_NAMES.values()):
            self.assertTrue(all(character in watch.GLYPHS for character in name))


if __name__ == "__main__":
    unittest.main()
