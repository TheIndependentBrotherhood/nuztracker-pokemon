import struct
import sys
import unittest
from collections import Counter
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import rom_daycycle as clock
import rom_weather as weather

try:
    import unicorn
    from unicorn import arm_const as arm
except ImportError:
    unicorn = None

GET_WEATHER = 0x0203C8D0
HELPER = 0x0203C8E4
MAP_WEATHER = 0x0203C0C0
BOUNDS_CHECK = 0x0203BF70
HEADERS = 0x020ED0DC
BATTLE_SITE = 0x02056286
TABLE = 0x020F09CC
TIME = 0x021C0010
CONVERT_DATE = 0x020A0000
DIVIDE = 0x020B0000
SEED = 0x1234ABCD
# mapHeaderID -> (header weather, map type)
MAPS = {
    10: (0, 1),  # town
    11: (0, 2),  # route
    12: (0, 3),  # cave
    13: (5, 1),  # snowy town
    14: (14, 2),  # foggy route
    15: (32, 2),  # yearly: rain
    16: (33, 2),  # yearly: random
    17: (36, 1),  # yearly: snow
}


class Clock:
    time = TIME
    convert_date_to_day = CONVERT_DATE
    divide = DIVIDE

    def address(self, relative):
        return 0x02013EA0 + relative


def make_code():
    code = bytearray(0x100000)
    for index in range(len(code)):
        code[index] = index * 7 & 0xFF
    table = TABLE - 0x02000000
    code[table : table + weather.YEARLY_TABLE_SIZE] = bytes(index * 5 % 12 for index in range(weather.YEARLY_TABLE_SIZE))
    return code


def make_patch(code=None):
    patch = object.__new__(weather.WeatherPatch)
    patch.rtc = Clock()
    patch.table, patch.helper, patch.get_weather = TABLE, HELPER, GET_WEATHER
    patch.map_weather, patch.bounds_check, patch.headers = MAP_WEATHER, BOUNDS_CHECK, HEADERS
    patch.battle_site = BATTLE_SITE
    patch.code, patch.ram = bytes(code if code is not None else make_code()), 0x02000000
    patch.patched_seed, patch.originals_offset = None, 0
    return patch


class WeatherSettingsTest(unittest.TestCase):
    def test_parse(self):
        self.assertIsNone(weather.parse_random_weather(False))
        self.assertIsNone(weather.parse_random_weather(None))
        self.assertEqual(weather.parse_random_weather(True), weather.DEFAULT_WEIGHTS)
        self.assertEqual(sum(weather.DEFAULT_WEIGHTS.values()), 100)
        weights = weather.parse_random_weather({"rain": 60, "sun": 40})
        self.assertEqual(weights["rain"], 60)
        self.assertEqual(weights["clear"], 0)
        self.assertEqual(list(weights), list(weather.WEATHER_CODES))
        for value in ({}, {"rain": 99}, {"snow": 100}, {"rain": 50.0, "sun": 50}, {"rain": True}, {"rain": 101, "sun": -1}, 3, "x"):
            with self.assertRaises(ValueError):
                weather.parse_random_weather(value)

    def test_table_and_distribution(self):
        table = weather.weather_table(weather.DEFAULT_WEIGHTS)
        self.assertEqual(len(table), 100)
        self.assertEqual(table.count(weather.SUN), 10)
        counts = Counter(weather.weather_for_cycle(cycle, SEED, weather.DEFAULT_WEIGHTS) for cycle in range(100000))
        for name, weight in weather.DEFAULT_WEIGHTS.items():
            self.assertAlmostEqual(counts[name] / 1000, weight, delta=1)
        only_rain = weather.parse_random_weather({"rain": 100})
        self.assertEqual({weather.weather_for_cycle(cycle, SEED, only_rain) for cycle in range(500)}, {"rain"})

    def test_cycles_and_seeds(self):
        self.assertEqual(weather.cycle_number(0, 0, 1), 0)
        self.assertEqual(weather.cycle_number(2, 5, 1), 53)
        self.assertEqual(weather.cycle_number(2, 5, 24), 2)
        self.assertEqual(weather.cycle_number(0, -5, 24), 0)
        self.assertEqual(weather.cycle_number(-1, 0, 5), -4)
        rolls = [weather.weather_roll(cycle, SEED) for cycle in range(200)]
        self.assertNotEqual(rolls, [weather.weather_roll(cycle, SEED + 1) for cycle in range(200)])
        self.assertTrue(all(0 <= roll < 100 for roll in rolls))

    def test_build_fits_the_yearly_table(self):
        writes, labels = make_patch().build(weather.DEFAULT_WEIGHTS, SEED)
        self.assertEqual(set(writes), {GET_WEATHER, HELPER, TABLE, BATTLE_SITE})
        self.assertEqual(len(writes[GET_WEATHER]), 0x14)
        self.assertEqual(len(writes[HELPER]), weather.YEARLY_HELPER_SIZE)
        self.assertEqual(len(writes[BATTLE_SITE]), 4)
        self.assertLessEqual(len(writes[TABLE]), weather.YEARLY_TABLE_SIZE)
        header = weather.HEADER.unpack_from(writes[TABLE])
        self.assertEqual(header[:7], (weather.MAGIC, SEED, MAP_WEATHER, BOUNDS_CHECK, HEADERS, BATTLE_SITE, HELPER))
        self.assertEqual(len(writes[TABLE]), header[7] + weather.ORIGINALS_SIZE)
        self.assertEqual(clock.call_target(writes[BATTLE_SITE], 0, BATTLE_SITE), labels["battle_weather"])
        self.assertEqual(struct.unpack_from("<I", writes[GET_WEATHER], 8)[0], labels["get_weather"] | 1)


@unittest.skipUnless(unicorn, "Install unicorn to execute the native weather routines.")
class NativeWeatherTest(unittest.TestCase):
    def setUp(self):
        self.patch = make_patch()
        self.mu = unicorn.Uc(unicorn.UC_ARCH_ARM, unicorn.UC_MODE_ARM)
        self.mu.mem_map(0x02000000, 0x400000)
        self.days, self.hour = 0, 0
        for map_id, (code, map_type) in MAPS.items():
            entry = HEADERS + map_id * weather.MAP_HEADER_SIZE
            self.mu.mem_write(entry + weather.MAP_WEATHER_FIELD, bytes([code]))
            self.mu.mem_write(entry + weather.MAP_TYPE_OFFSET, struct.pack("<H", 0x3F80 | map_type))
        self.mu.hook_add(unicorn.UC_HOOK_CODE, self.native_call)
        self.install(weather.DEFAULT_WEIGHTS)
        self.set_cycle(1)

    def install(self, weights):
        self.weights = weights
        writes, self.labels = self.patch.build(weights, SEED)
        for address, data in writes.items():
            self.mu.mem_write(address, data)

    def set_cycle(self, hours):
        seconds = Clock().address(clock.SECONDS_SINCE_MIDNIGHT)
        self.cycle_hours = hours or 24
        if hours is None:
            self.mu.mem_write(seconds, bytes.fromhex("18b4"))
        else:
            self.mu.mem_write(seconds, clock.thumb_b(seconds, Clock().address(clock.VIRTUAL_CLOCK)))
            self.mu.mem_write(Clock().address(clock.VIRTUAL_CLOCK + 0x12), bytes([hours]))

    def native_call(self, mu, address, size, data):
        r0 = mu.reg_read(arm.UC_ARM_REG_R0)
        result = None
        if address == MAP_WEATHER:
            result = MAPS[r0][0]
        elif address == BOUNDS_CHECK:
            self.assertIn(r0, MAPS)
            result = r0
        elif address == CONVERT_DATE:
            self.assertEqual(r0, TIME - 0x10)
            result = self.days
        elif address == DIVIDE:
            numerator = struct.unpack("<i", struct.pack("<I", r0))[0]
            divisor = mu.reg_read(arm.UC_ARM_REG_R1)
            self.assertGreater(divisor, 0)
            quotient = abs(numerator) // divisor * (1 if numerator >= 0 else -1)
            result = quotient & 0xFFFFFFFF
            mu.reg_write(arm.UC_ARM_REG_R1, (numerator - quotient * divisor) & 0xFFFFFFFF)
        if result is not None:
            mu.reg_write(arm.UC_ARM_REG_R0, result)
            mu.reg_write(arm.UC_ARM_REG_R2, 0xDEADBEEF)
            mu.reg_write(arm.UC_ARM_REG_R3, 0xDEADBEEF)
            mu.reg_write(arm.UC_ARM_REG_PC, mu.reg_read(arm.UC_ARM_REG_LR))

    def call(self, address, *arguments):
        self.mu.mem_write(TIME, struct.pack("<I", self.hour))
        registers = (arm.UC_ARM_REG_R4, arm.UC_ARM_REG_R5, arm.UC_ARM_REG_R6, arm.UC_ARM_REG_R7)
        for index, register in enumerate(registers):
            self.mu.reg_write(register, 0x12340000 + index)
        for register, value in zip((arm.UC_ARM_REG_R0, arm.UC_ARM_REG_R1), arguments):
            self.mu.reg_write(register, value)
        self.mu.reg_write(arm.UC_ARM_REG_SP, 0x023FF000)
        self.mu.reg_write(arm.UC_ARM_REG_LR, 0x023F0001)
        self.mu.emu_start(address | 1, 0x023F0000, count=100000)
        self.assertEqual(self.mu.reg_read(arm.UC_ARM_REG_SP), 0x023FF000)
        self.assertEqual([self.mu.reg_read(register) for register in registers], [0x12340000 + i for i in range(4)])
        return self.mu.reg_read(arm.UC_ARM_REG_R0)

    def expected(self, map_id):
        code, map_type = MAPS[map_id]
        if code >= weather.YEARLY_START:
            code = weather.YEARLY_WEATHER[code - weather.YEARLY_START]
        if code:
            return code
        if map_type not in weather.RANDOM_MAP_TYPES:
            return 0
        cycle = weather.cycle_number(self.days, self.hour, self.cycle_hours)
        return weather.WEATHER_CODES[weather.weather_for_cycle(cycle, SEED, self.weights)]

    def battle(self, map_id, stored):
        state = 0x02300000
        self.mu.mem_write(state, struct.pack("<I", map_id))
        self.mu.mem_write(state + weather.STATE_WEATHER_OFFSET, struct.pack("<H", stored))
        return self.call(self.labels["battle_weather"], state)

    def test_field_and_battle_weather_follow_the_cycle(self):
        for hours in (1, 5, 24, None):
            self.set_cycle(hours)
            for self.days in (0, 1, 37):
                for self.hour in (0, 7, 23):
                    for map_id in MAPS:
                        expected = self.expected(map_id)
                        field = self.call(GET_WEATHER, 0x02310000, map_id)
                        self.assertEqual(field, 0 if expected == weather.SUN else expected, (hours, map_id))
                        battle = self.battle(map_id, field)
                        self.assertEqual(battle, weather.BATTLE_SUN if expected == weather.SUN else field)

    def test_every_weather_reaches_the_field_and_battles(self):
        for name, code in weather.WEATHER_CODES.items():
            self.install(weather.parse_random_weather({name: 100}))
            self.days, self.hour = 3, 12
            field = self.call(GET_WEATHER, 0x02310000, 11)
            self.assertEqual(field, 0 if code == weather.SUN else code)
            self.assertEqual(self.battle(11, field), weather.BATTLE_SUN if code == weather.SUN else code)
            self.assertEqual(self.call(GET_WEATHER, 0x02310000, 12), 0)
            self.assertEqual(self.battle(12, 0), 0)
            self.assertEqual(self.call(GET_WEATHER, 0x02310000, 14), 14)

    def test_stored_weather_wins_in_battle(self):
        self.install(weather.parse_random_weather({"sun": 100}))
        self.assertEqual(self.battle(11, 2), 2)
        self.assertEqual(self.battle(11, 0), weather.BATTLE_SUN)

    def test_today_entry_for_the_poketch(self):
        self.assertEqual(self.labels["today"], weather.today_address(TABLE))
        for hours in (1, 24, None):
            self.set_cycle(hours)
            for self.days, self.hour in ((0, 0), (5, 13), (40, 23)):
                cycle = weather.cycle_number(self.days, self.hour, self.cycle_hours)
                expected = weather.WEATHER_CODES[weather.weather_for_cycle(cycle, SEED, self.weights)]
                self.assertEqual(self.call(self.labels["today"]), expected)
                self.assertEqual(self.expected(11), expected)

    def test_yearly_helper(self):
        for code in (0, 2, 14, 31):
            self.assertEqual(self.call(HELPER, 0x02310000, code), code)
        for index, code in enumerate(weather.YEARLY_WEATHER):
            self.assertEqual(self.call(HELPER, 0x02310000, weather.YEARLY_START + index), code)


class PatchedRomTest(unittest.TestCase):
    @staticmethod
    def apply(code, writes):
        for address, data in writes.items():
            code[address - 0x02000000 : address - 0x02000000 + len(data)] = data

    @staticmethod
    def reader(code):
        reader = object.__new__(weather.WeatherPatch)
        reader.code, reader.ram = bytes(code), 0x02000000
        reader.arm9 = SimpleNamespace(contains_pointer=lambda value: 0x02000000 <= value < 0x02100000)
        reader.patched_seed, reader.originals_offset = None, 0
        return reader

    def test_reads_back_installed_patch(self):
        code = make_code()
        writes, _ = make_patch(code).build(weather.DEFAULT_WEIGHTS, SEED)
        self.apply(code, writes)
        reader = self.reader(code)
        self.assertTrue(reader._locate_patched())
        self.assertEqual(reader.patched_seed, SEED)
        self.assertEqual(
            (reader.table, reader.helper, reader.get_weather, reader.map_weather, reader.bounds_check, reader.headers, reader.battle_site),
            (TABLE, HELPER, GET_WEATHER, MAP_WEATHER, BOUNDS_CHECK, HEADERS, BATTLE_SITE),
        )

    def test_update_then_remove_restores_original_bytes(self):
        original = make_code()
        code = bytearray(original)
        self.apply(code, make_patch(code).build(weather.DEFAULT_WEIGHTS, SEED)[0])
        reader = self.reader(code)
        reader._locate_patched()
        reader.rtc = Clock()
        self.apply(code, reader.build(weather.parse_random_weather({"rain": 100}), SEED)[0])
        self.assertNotEqual(code, original)
        reader = self.reader(code)
        reader._locate_patched()
        self.apply(code, reader.originals())
        self.assertEqual(code, original)
        self.assertFalse(self.reader(code)._locate_patched())

    def test_nibble_packing(self):
        data = bytes(index % 16 for index in range(1830))
        self.assertEqual(weather.unpack_nibbles(weather.pack_nibbles(data), len(data)), data)
        self.assertEqual(len(weather.pack_nibbles(data)), 915)
        with self.assertRaises(RuntimeError):
            weather.pack_nibbles(bytes([16]))


if __name__ == "__main__":
    unittest.main()
