"""Random overworld weather that changes with every in-game day and carries over into battles.

Platinum's `FieldSystem_GetWeather` reads the map header weather and, for five "yearly" maps, a 366-day
table indexed by the save date. This patch replaces that table with:

- one weighted pick per in-game day: `cycle = (days * 24 + hour) / N` from the real clock, where N is the
  day/night cycle length read at runtime from the accelerated clock (24 with the normal clock), hashed
  with a per-ROM seed, so both SoulLink consoles always get the same weather;
- the pick only applies to outdoor towns and routes whose header weather is clear. Caves, buildings,
  gyms, fixed weathers (fog, Project PM effects, snowy northern maps) are unchanged;
- the five yearly maps keep a fixed weather (Route 212 South rain, northern snow, Route 213 random).

The game already turns overworld rain, snow, sandstorm and fog into battle rain, hail, sandstorm and fog.
Sun is shown as clear weather in the field and starts battles with harsh sunlight (the Sunny Day effect)
through the field battle setup, which reads the weather stored on map entry.
"""

import struct

import rom_daycycle as clock
from rom_extras import Arm9
from rom_poketch import ThumbCode

SUN = 0xFF
BATTLE_SUN = 1001
WEATHER_CODES = {
    "clear": 0,
    "cloudy": 1,
    "rain": 2,
    "sun": SUN,
    "fog": 14,
    "sandstorm": 10,
    "hail": 5,
}
DEFAULT_WEIGHTS = {"clear": 45, "cloudy": 15, "rain": 15, "sun": 10, "fog": 5, "sandstorm": 5, "hail": 5}
# Route 212 South, Route 213, Route 216, Acuity Lakefront, Snowpoint City.
YEARLY_WEATHER = bytes([2, 0, 6, 6, 5])
YEARLY_START = 32
DAYS_PER_YEAR = 366
RANDOM_MAP_TYPES = (1, 2)  # MAP_TYPE_TOWN_CITY, MAP_TYPE_OUTDOORS
MAP_HEADER_SIZE = 24
MAP_WEATHER_FIELD = 0x14
MAP_TYPE_OFFSET = 0x16
STATE_WEATHER_OFFSET = 0x66
HASH_MULTIPLIERS = (0x9E3779B1, 0x85EBCA6B)
MAGIC = b"NZW2"  # NZW2 adds the `today` entry point read by the Poketch
MAGICS = (MAGIC, b"NZWX")
TODAY_SIZE = 4  # push {r4, lr}; b pick_roll
# magic, seed, map weather getter, bounds check, map headers, battle site, helper, offset of the originals
HEADER = struct.Struct("<4sIIIIIII")
GET_WEATHER_SIZE = 0x14
BATTLE_CALL_SIZE = 4
YEARLY_TABLE_SIZE = DAYS_PER_YEAR * len(YEARLY_WEATHER)

GET_WEATHER = bytes.fromhex("10b5041c081c")  # push {r4, lr}; adds r4, r0, #0; adds r0, r1, #0
GET_WEATHER_TAIL = bytes.fromhex("011c201c")  # adds r1, r0, #0; adds r0, r4, #0
YEARLY_HELPER = bytes.fromhex("f8b50d1c071c202d01da281cf8bd")
YEARLY_HELPER_SIZE = 0x80
STATE_GET_SET_WEATHER = bytes.fromhex("66300088704700006630018070470000")
BATTLE_WEATHER_STORE = bytes.fromhex("652189006850")  # dto->fieldWeather (offset 0x194)
MAP_WEATHER_GETTER = bytes.fromhex("08b5")  # push {r3, lr}; bl MapHeader_IDBoundsCheck
# movs r1, #24; muls r1, r0; ldr r0, =sMapHeaders; ldrb r0, [r0, r1] (weather); pop {r3, pc}
MAP_WEATHER_GETTER_BODY = bytes.fromhex("182141430148405c08bd")
MAX_MASK = 0xFFFFFFFF


def parse_random_weather(value):
    """`romTweaks.randomWeather`: false, true (default weights) or weights per weather summing to 100."""
    if value is None or value is False:
        return None
    if value is True:
        return dict(DEFAULT_WEIGHTS)
    message = (
        "romTweaks.randomWeather must be true, false or an object of whole percentages summing to 100 "
        f"with keys {', '.join(WEATHER_CODES)}."
    )
    if not isinstance(value, dict) or not value or any(key not in WEATHER_CODES for key in value):
        raise ValueError(message)
    weights = {key: value.get(key, 0) for key in WEATHER_CODES}
    if any(isinstance(weight, bool) or not isinstance(weight, int) or weight < 0 for weight in weights.values()):
        raise ValueError(message)
    if sum(weights.values()) != 100:
        raise ValueError(message)
    return weights


def weather_table(weights):
    table = bytearray()
    for name, weight in weights.items():
        table.extend([WEATHER_CODES[name]] * weight)
    if len(table) != 100:
        raise ValueError("Weather weights must sum to 100.")
    return bytes(table)


def cycle_number(days, hour, hours):
    """In-game day number, as computed by the patch (signed division truncating toward zero)."""
    total = days * 24 + hour
    quotient = abs(total) // hours
    return quotient if total >= 0 else -quotient


def weather_roll(cycle, seed):
    value = (cycle ^ seed) & MAX_MASK
    value = value * HASH_MULTIPLIERS[0] & MAX_MASK
    value ^= value >> 16
    value = value * HASH_MULTIPLIERS[1] & MAX_MASK
    value ^= value >> 13
    return (value >> 8) % 100


def weather_for_cycle(cycle, seed, weights):
    """Weather name picked for an in-game day (reference of the native routine)."""
    code = weather_table(weights)[weather_roll(cycle, seed)]
    return next(name for name, value in WEATHER_CODES.items() if value == code)


def unsupported(reason):
    return RuntimeError(f"The weather routines of this ROM are not supported ({reason}).")


def today_address(table):
    """Thumb routine returning the weather code of the current in-game day (SUN for sun)."""
    return table + HEADER.size


def find_all(code, needle, step=2):
    return [index for index in range(0, len(code) - len(needle) + 1, step) if code.startswith(needle, index)]


def pack_nibbles(data):
    if any(value > 15 for value in data):
        raise unsupported("yearly weather values")
    padded = bytes(data) + bytes(len(data) % 2)
    return bytes(padded[index] | padded[index + 1] << 4 for index in range(0, len(padded), 2))


def unpack_nibbles(data, size):
    values = bytearray()
    for value in data:
        values.extend((value & 15, value >> 4))
    return bytes(values[:size])


ORIGINALS_SIZE = GET_WEATHER_SIZE + YEARLY_HELPER_SIZE + BATTLE_CALL_SIZE + (YEARLY_TABLE_SIZE + 1) // 2


class WeatherPatch:
    """Locates `FieldSystem_GetWeather`, the yearly weather table and the battle weather setup."""

    def __init__(self, rom):
        self.rom = rom
        self.arm9 = Arm9(rom)
        self.code = self.arm9.bytes()
        self.ram = self.arm9.ram
        self.rtc = clock.DayCyclePatch(rom)
        self.patched_seed = None
        self.originals_offset = 0
        if not self._locate_patched():
            self._locate_original()

    def originals(self):
        """Original bytes of every patched area: kept in the patch so it can be removed later."""
        code = self.code
        if self.patched_seed is None:
            return {
                self.get_weather: code[self.offset(self.get_weather) :][:GET_WEATHER_SIZE],
                self.helper: code[self.offset(self.helper) :][:YEARLY_HELPER_SIZE],
                self.battle_site: code[self.offset(self.battle_site) :][:BATTLE_CALL_SIZE],
                self.table: code[self.offset(self.table) :][:YEARLY_TABLE_SIZE],
            }
        if not self.originals_offset:
            raise RuntimeError("This weather patch predates removal support: patch the ROM backup instead.")
        start = self.offset(self.table) + self.originals_offset
        saved = code[start : start + ORIGINALS_SIZE]
        sizes = (GET_WEATHER_SIZE, YEARLY_HELPER_SIZE, BATTLE_CALL_SIZE)
        parts = []
        for size in sizes:
            parts.append(saved[:size])
            saved = saved[size:]
        return dict(zip(
            (self.get_weather, self.helper, self.battle_site, self.table),
            (*parts, unpack_nibbles(saved, YEARLY_TABLE_SIZE)),
        ))

    def serialize_originals(self, originals):
        return b"".join((
            originals[self.get_weather],
            originals[self.helper],
            originals[self.battle_site],
            pack_nibbles(originals[self.table]),
        ))

    def address(self, offset):
        return self.ram + offset

    def offset(self, address):
        offset = address - self.ram
        if not 0 <= offset < len(self.code):
            raise unsupported("address outside ARM9")
        return offset

    def _locate_original(self):
        code = self.code
        matches = []
        for offset in find_all(code, GET_WEATHER, 4):
            helper = offset + 0x14
            if code[offset + 0x0A : offset + 0x0E] != GET_WEATHER_TAIL or code[offset + 0x12 : helper] != b"\x10\xbd":
                continue
            if clock.call_target(code, offset + 0x0E, self.address(offset + 0x0E)) != self.address(helper):
                continue
            if code[helper : helper + len(YEARLY_HELPER)] == YEARLY_HELPER:
                matches.append(offset)
        if len(matches) != 1:
            raise unsupported("FieldSystem_GetWeather")
        self.get_weather = self.address(matches[0])
        self.helper = self.get_weather + 0x14
        self.map_weather = clock.call_target(code, matches[0] + 6, self.address(matches[0] + 6))
        self.table = struct.unpack_from("<I", code, self.offset(self.helper) + YEARLY_HELPER_SIZE - 4)[0]
        table = self.offset(self.table)
        if table % 4 or table + DAYS_PER_YEAR * len(YEARLY_WEATHER) > len(code):
            raise unsupported("yearly weather table")
        if code.count(struct.pack("<I", self.table)) != 1:
            raise unsupported("yearly weather table is shared")
        self._locate_map_header(self.map_weather)
        self.battle_site = self._battle_site(self._state_get_weather())

    def _locate_map_header(self, getter):
        code = self.code
        if getter is None:
            raise unsupported("MapHeader_GetWeatherType")
        start = self.offset(getter)
        if code[start : start + 2] != MAP_WEATHER_GETTER:
            raise unsupported("MapHeader_GetWeatherType")
        self.bounds_check = clock.call_target(code, start + 2, getter + 2)
        if code[start + 6 : start + 0x10] != MAP_WEATHER_GETTER_BODY:
            raise unsupported("MapHeader_GetWeatherType")
        # The compiler folds the weather field offset into the table literal.
        self.headers = struct.unpack_from("<I", code, start + 0x10)[0] - MAP_WEATHER_FIELD
        if self.bounds_check is None or not self.arm9.contains_pointer(self.headers):
            raise unsupported("map headers")

    def _state_get_weather(self):
        matches = find_all(self.code, STATE_GET_SET_WEATHER, 4)
        if len(matches) != 1:
            raise unsupported("FieldOverworldState_GetWeather")
        return self.address(matches[0])

    def _battle_site(self, target):
        code, sites = self.code, []
        for offset in range(0, len(code) - 10, 2):
            if code[offset + 4 : offset + 10] != BATTLE_WEATHER_STORE:
                continue
            if clock.call_target(code, offset, self.address(offset)) == target:
                sites.append(self.address(offset))
        if len(sites) != 1:
            raise unsupported("field battle weather")
        return sites[0]

    def _locate_patched(self):
        """Reads the parameters of an already installed patch (the stub jumps to its header + code)."""
        code = self.code
        # The stub jumps to get_weather: right after the header (NZWX) or after the `today` entry (NZW2).
        for offset in find_all(code, bytes.fromhex("014a1047c046c046"), 4):
            area = struct.unpack_from("<I", code, offset + 8)[0] & ~1
            for magic, table in ((MAGIC, area - HEADER.size - TODAY_SIZE), (b"NZWX", area - HEADER.size)):
                if not self.arm9.contains_pointer(table):
                    continue
                fields = HEADER.unpack_from(code, self.offset(table))
                if fields[0] != magic:
                    continue
                _, seed, self.map_weather, self.bounds_check, self.headers, self.battle_site, self.helper, saved = fields
                self.originals_offset = saved
                self.get_weather = self.address(offset)
                self.table = table
                self.patched_seed = seed
                return True
        return False

    def build(self, weights, seed):
        rtc = self.rtc
        seconds = rtc.address(clock.SECONDS_SINCE_MIDNIGHT)
        stub = int.from_bytes(clock.thumb_b(seconds, rtc.address(clock.VIRTUAL_CLOCK)), "little")
        code = ThumbCode(self.table + HEADER.size)

        code.mark("today")  # () -> weather of the current in-game day, at a fixed address for the Poketch
        code.emit(0xB510)
        code.branch("pick_roll")

        code.mark("get_weather")  # (fieldSystem, mapHeaderID)
        code.emit(0xB508, 0x1C08)  # push {r3, lr}; adds r0, r1, #0
        code.call("pick")
        code.emit(0x28FF)  # cmp r0, #SUN
        code.branch("get_done", 1)
        code.emit(0x2000)  # sun is clear in the field
        code.mark("get_done")
        code.emit(0xBD08)

        code.mark("battle_weather")  # (FieldOverworldState) -> weather stored on map entry, or sun
        code.emit(0xB510, 0x1C01, 0x3100 | STATE_WEATHER_OFFSET, 0x880C)  # r4 = state->weather
        code.emit(0x2C00)
        code.branch("battle_done", 1)
        code.emit(0x6800)  # r0 = state->player.mapHeaderID
        code.call("pick")
        code.emit(0x28FF)
        code.branch("battle_done", 1)
        code.load(4, BATTLE_SUN)
        code.mark("battle_done")
        code.emit(0x1C20, 0xBD10)

        code.mark("pick")  # (mapHeaderID) -> header weather, or the weather of the current in-game day
        code.emit(0xB510, 0x1C04)
        code.call(self.map_weather)
        code.emit(0x1C01, 0x3900 | YEARLY_START, 0x2900 | len(YEARLY_WEATHER))
        code.branch("pick_header", 2)  # bhs: not a yearly weather
        code.load(0, "yearly")
        code.emit(0x5C40)
        code.mark("pick_header")
        code.emit(0x2800)
        code.branch("pick_done", 1)
        code.emit(0x1C20)
        code.call(self.bounds_check)
        code.emit(0x2100 | MAP_HEADER_SIZE, 0x4341)
        code.load(0, self.headers)
        code.emit(0x1840, 0x8800 | (MAP_TYPE_OFFSET // 2) << 6, 0x0640, 0x0E40)  # r0 = mapType
        code.emit(0x3801, 0x2800 | (RANDOM_MAP_TYPES[1] - RANDOM_MAP_TYPES[0]))
        code.branch("pick_clear", 8)  # bhi: not a town or route
        code.mark("pick_roll")
        code.load(4, rtc.time - 0x10)
        code.emit(0x1C20)
        code.call(rtc.convert_date_to_day, arm=True)
        code.emit(0x2118, 0x4348, 0x6921, 0x1840)  # r0 = days * 24 + hour
        # Read the cycle length only if the supported accelerated-clock stub is active.
        code.load(1, seconds)
        code.emit(0x8809)
        code.load(2, stub)
        code.emit(0x4291)
        code.branch("pick_real_time", 1)
        code.load(1, rtc.address(clock.VIRTUAL_CLOCK + 0x12))
        code.emit(0x7809)
        code.branch("pick_cycle")
        code.mark("pick_real_time")
        code.emit(0x2118)
        code.mark("pick_cycle")
        code.call(rtc.divide, arm=True)
        code.load(1, seed)
        code.emit(0x4048)
        code.load(1, HASH_MULTIPLIERS[0])
        code.emit(0x4348, 0x0C01, 0x4048)
        code.load(1, HASH_MULTIPLIERS[1])
        code.emit(0x4348, 0x0B41, 0x4048, 0x0A00, 0x2164)
        code.call(rtc.divide, arm=True)
        code.load(0, "weights")
        code.emit(0x5C40, 0xBD10)
        code.mark("pick_clear")
        code.emit(0x2000)
        code.mark("pick_done")
        code.emit(0xBD10)
        code.pool()
        code.append("weights", weather_table(weights))
        code.append("yearly", YEARLY_WEATHER)
        body = code.finish()
        if code.labels["today"] != today_address(self.table) or code.labels["get_weather"] != self.table + HEADER.size + TODAY_SIZE:
            raise RuntimeError("The weather entry points moved.")

        saved = HEADER.size + len(body)
        header = HEADER.pack(
            MAGIC, seed, self.map_weather, self.bounds_check, self.headers, self.battle_site, self.helper, saved
        )
        area = header + body + self.serialize_originals(self.originals())
        if len(area) > YEARLY_TABLE_SIZE:
            raise RuntimeError("The weather routine does not fit in the yearly weather table.")

        helper = ThumbCode(self.helper)  # (fieldSystem, weather): yearly weathers for scripts and TV
        helper.emit(0x1C08, 0x3900 | YEARLY_START, 0x2900 | len(YEARLY_WEATHER))
        helper.branch("done", 2)
        helper.load(0, code.labels["yearly"])
        helper.emit(0x5C40)
        helper.mark("done")
        helper.emit(0x4770)
        helper.pool()
        helper = helper.finish()
        helper += clock.halfwords(0x46C0) * ((YEARLY_HELPER_SIZE - len(helper)) // 2)

        if self.get_weather % 4:
            raise unsupported("unaligned FieldSystem_GetWeather")
        stub_code = bytes.fromhex("014a1047c046c046") + struct.pack("<I", code.labels["get_weather"] | 1)
        stub_code += clock.halfwords(0x46C0) * ((0x14 - len(stub_code)) // 2)
        return {
            self.get_weather: stub_code,
            self.helper: helper,
            self.table: area,
            self.battle_site: clock.thumb_bl(self.battle_site, code.labels["battle_weather"]),
        }, code.labels

    def apply(self, weights, seed):
        writes, labels = self.build(weights, seed)
        if len(writes[self.helper]) != YEARLY_HELPER_SIZE:
            raise RuntimeError("Unexpected yearly weather helper size.")
        self.write(writes)
        return labels

    def write(self, writes):
        for address, data in writes.items():
            start = self.arm9.offset + self.offset(address)
            self.rom.write(start, start + len(data), data)

    def remove(self):
        originals = self.originals()
        if len(originals[self.table]) != YEARLY_TABLE_SIZE:
            raise RuntimeError("The saved yearly weather table is incomplete.")
        self.write(originals)


def describe(weights):
    return ", ".join(f"{name} {weight}%" for name, weight in weights.items() if weight)


def patch_random_weather(rom, weights, seed):
    patch = WeatherPatch(rom)
    patch.apply(weights, seed & MAX_MASK)
    previous = " (updated)" if patch.patched_seed is not None else ""
    return (
        f"Random weather{previous}: one pick per in-game day on outdoor towns and routes "
        f"({describe(weights)}); battles use it, sun acts like Sunny Day."
    )


def is_installed(rom):
    """True if the ROM carries this weather patch (unpatched ROMs are not inspected further)."""
    code = Arm9(rom).bytes()
    return any(magic in code for magic in MAGICS) and WeatherPatch(rom).patched_seed is not None


def remove_random_weather(rom):
    """Restores the original weather routines. Returns None if the ROM has no weather patch."""
    patch = WeatherPatch(rom)
    if patch.patched_seed is None:
        return None
    patch.remove()
    return "Random weather removed: original map weathers restored."
