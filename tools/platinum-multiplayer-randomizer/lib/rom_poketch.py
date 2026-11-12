"""Native digital-watch panel for the supported French Platinum Multiplayer ROM.

The watch alone reads the virtual clock. Small tilemap rows show Repel steps, the real HH:MM:SS until
the next encounter period and, when the random weather patch is installed, the weather of the current
in-game day. The native Repel counter is only read, never changed.
"""

import hashlib
import struct

import rom_daycycle as clock
from rom_extras import Arm9, overlay_span, u32

OVERLAY = 26
RAM = 0x022774A0
ORIGINAL_SIZE = 0x5E0
ORIGINAL_HASH = "be6a493a5b2eb3c1acfbb8d0225c446b2b569b4475467f630bfc0991b7f73428"
# Original bytes at every patched call site, used to rebuild an installed panel.
ORIGINAL_SITES = {
    0x84: bytes.fromhex("9cf542fc"),
    0x1EE: bytes.fromhex("9cf58dfb"),
    0x390: bytes.fromhex("00f050f8"),
    0x3D8: bytes.fromhex("00f02cf8"),
    0x200: bytes.fromhex("03d0"),
}
WEATHER_ROW = 20
WEATHER_ENTRY = 32  # rom_weather.today_address(table) - table
WEATHER_MAGIC = int.from_bytes(b"NZW2", "little")  # rom_weather.MAGIC
# Weather codes returned by the random weather patch, with their watch labels.
WEATHER_NAMES = {0: "CLEAR", 1: "CLOUDY", 2: "RAIN", 0xFF: "SUNNY", 14: "FOG", 10: "SANDSTORM", 5: "HAIL"}
MAGIC = b"NZWATCH1"
HEADER = struct.Struct("<8sI")
RTC_CALLS = (0x84, 0x1EE)
DRAW_CALLS = (0x390, 0x3D8)
UPDATE_BRANCH = 0x200
ORIGINAL_DRAW = RAM + 0x434
GET_SAVE = 0x02275824
GET_ENCOUNTERS = 0x0202ED10
GET_REPEL = 0x0202EEA8
DIVIDE = 0x020E8F40
FONT_TILE = 512
FONT_VRAM = 0x06200000 + FONT_TILE * 32

# Original 5x7 glyphs; one 8x8, 4-bit tile per ASCII character from space through Z.
GLYPHS = {
    "0": ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
    "1": ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    "2": ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
    "3": ("11110", "00001", "00001", "01110", "00001", "00001", "11110"),
    "4": ("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
    "5": ("11111", "10000", "10000", "11110", "00001", "00001", "11110"),
    "6": ("01110", "10000", "10000", "11110", "10001", "10001", "01110"),
    "7": ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    "8": ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    "9": ("01110", "10001", "10001", "01111", "00001", "00001", "01110"),
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "C": ("01110", "10001", "10000", "10000", "10000", "10001", "01110"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "G": ("01110", "10001", "10000", "10111", "10001", "10001", "01110"),
    "H": ("10001", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("01110", "00100", "00100", "00100", "00100", "00100", "01110"),
    "L": ("10000", "10000", "10000", "10000", "10000", "10000", "11111"),
    "M": ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": ("10001", "10001", "10001", "10001", "10001", "10001", "01110"),
    "W": ("10001", "10001", "10001", "10101", "10101", "11011", "10001"),
    "Y": ("10001", "10001", "01010", "00100", "00100", "00100", "00100"),
    ":": ("00000", "00100", "00100", "00000", "00100", "00100", "00000"),
}


def font_tiles():
    tiles = bytearray()
    for character in range(32, 91):
        rows = GLYPHS.get(chr(character), ("00000",) * 7)
        for row in (*rows, "00000"):
            pixels = [4, *(1 if pixel == "1" else 4 for pixel in row), 4, 4]
            tiles.extend(pixels[index] | pixels[index + 1] << 4 for index in range(0, 8, 2))
    return bytes(tiles)


class ThumbCode:
    """Small relocation writer for halfwords, local branches/calls and PC-relative literals."""

    def __init__(self, address):
        self.address = address
        self.data = bytearray()
        self.labels = {}
        self.fixups = []
        self.literals = {}

    def mark(self, name):
        self.labels[name] = self.address + len(self.data)

    def emit(self, *values):
        self.data.extend(clock.halfwords(*values))

    def call(self, target, arm=False):
        offset = len(self.data)
        if isinstance(target, str):
            self.fixups.append(("call", offset, target))
            self.data.extend(bytes(4))
        else:
            emit = clock.thumb_blx if arm else clock.thumb_bl
            self.data.extend(emit(self.address + offset, target))

    def branch(self, label, condition=None):
        self.fixups.append((condition, len(self.data), label))
        self.emit(0)

    def load(self, register, value):
        self.fixups.append(("load", len(self.data), (register, value)))
        self.literals.setdefault(value, None)
        self.emit(0)

    def pool(self):
        if len(self.data) % 4:
            self.emit(0x46C0)
        for value in self.literals:
            self.literals[value] = len(self.data)
            self.data.extend(bytes(4))

    def append(self, label, data):
        self.mark(label)
        self.data.extend(data)

    def finish(self):
        for kind, offset, target in self.fixups:
            address = self.address + offset
            if kind == "load":
                register, value = target
                delta = self.address + self.literals[value] - ((address + 4) & ~3)
                if delta < 0 or delta % 4 or delta > 1020:
                    raise RuntimeError("Poketch literal is outside Thumb load range.")
                data = clock.halfwords(0x4800 | register << 8 | delta // 4)
            elif kind == "call":
                data = clock.thumb_bl(address, self.labels[target])
            elif kind is None:
                data = clock.thumb_b(address, self.labels[target])
            else:
                delta = self.labels[target] - address - 4
                if delta % 2 or not -256 <= delta <= 254:
                    raise RuntimeError("Poketch conditional branch is out of range.")
                data = clock.halfwords(0xD000 | kind << 8 | (delta // 2 & 255))
            self.data[offset : offset + len(data)] = data
        for value, offset in self.literals.items():
            resolved = self.labels[value] if isinstance(value, str) else value
            struct.pack_into("<I", self.data, offset, resolved)
        return bytes(self.data)


def build_panel(address, rtc, weather_table=None):
    code = ThumbCode(address)
    seconds = rtc.address(clock.SECONDS_SINCE_MIDNIGHT)

    code.mark("read_time")
    code.emit(0xB570, 0x1C04)  # push {r4-r6, lr}; r4 = RTCTime*
    code.call(seconds)
    code.load(1, 3600)
    code.call(DIVIDE, arm=True)
    code.emit(0x6020, 0x1C08, 0x213C)  # hour; remainder -> r0, divisor 60
    code.call(DIVIDE, arm=True)
    code.emit(0x6060, 0x60A1, 0xBD70)  # minute, second; pop {r4-r6, pc}

    code.mark("init_panel")
    code.emit(0xB510, 0x1C04)  # push {r4, lr}; save graphics*
    code.load(0, "font")
    code.load(1, FONT_VRAM)
    code.load(2, len(font_tiles()) // 2)
    code.mark("copy_font")
    code.emit(0x8803, 0x800B, 0x3002, 0x3102, 0x3A01)
    code.branch("copy_font", 1)
    # Replace the decorative logo below the clock, keeping the Poketch border untouched.
    code.emit(0x6860)
    code.load(1, 6 * 0x2C + 8)
    code.emit(0x5840)
    code.load(1, 17 * 64 + 4)
    code.emit(0x1840, 0x2104)
    code.load(2, FONT_TILE)
    code.mark("clear_bottom_row")
    code.emit(0x2318)
    code.mark("clear_bottom_tile")
    code.emit(0x8002, 0x3002, 0x3B01)
    code.branch("clear_bottom_tile", 1)
    code.emit(0x3010, 0x3901)
    code.branch("clear_bottom_row", 1)
    code.emit(0x1C20)
    code.call("draw_panel")
    code.emit(0xBD10)

    code.mark("draw_panel")
    code.emit(0xB5F0, 0xB081, 0x1C04)
    code.call(ORIGINAL_DRAW)
    code.emit(0x1C25, 0x6860)
    code.load(1, 6 * 0x2C + 8)  # BgConfig's sub BG2 tilemap buffer
    code.emit(0x5844, 0x6828, 0x6940)  # r4 = tilemap; watchData -> PoketchSystem
    code.call(GET_SAVE)
    code.call(GET_ENCOUNTERS)
    code.call(GET_REPEL)
    code.emit(0x7806)  # r6 = remaining Repel steps
    code.load(0, 4 * 64 + 6)
    code.emit(0x1820)
    code.call("clear_line")
    code.load(1, "repel")
    code.call("text")
    code.emit(0x2E00)
    code.branch("repel_off", 0)
    code.emit(0x1C31, 0x2203)
    code.call("number")
    code.load(1, "steps")
    code.branch("repel_text")
    code.mark("repel_off")
    code.load(1, "off")
    code.mark("repel_text")
    code.call("text")

    if weather_table is not None:
        code.load(0, WEATHER_ROW * 64 + 6)
        code.emit(0x1820)
        code.call("clear_line")
        code.emit(0x1C05)  # r5 = weather row
        # The weather routine is only called while its patch is installed (it can be removed later).
        code.load(0, weather_table)
        code.emit(0x6800)
        code.load(1, WEATHER_MAGIC)
        code.emit(0x4288)
        code.branch("weather_done", 1)
        code.call(weather_table + WEATHER_ENTRY)
        for value in WEATHER_NAMES:
            code.load(1, f"weather_{value}")
            code.emit(0x2800 | value)
            code.branch("weather_found", 0)
        code.branch("weather_done")
        code.mark("weather_found")
        code.emit(0x1C0E, 0x1C28)
        code.load(1, "weather")
        code.call("text")
        code.emit(0x1C31)
        code.call("text")
        code.mark("weather_done")

    code.call(seconds)
    code.emit(0x1C05)  # r5 = virtual seconds
    for boundary, name in ((14400, "morning"), (36000, "day"), (72000, "night")):
        code.load(6, boundary)
        code.load(7, name)
        code.emit(0x42B0)  # cmp r0, r6
        code.branch("period_found", 3)  # blo
    code.load(6, 100800)  # after 20:00, next morning is 04:00 tomorrow
    code.load(7, "morning")
    code.mark("period_found")
    # Read the cycle parameter only if the supported accelerated-clock stub is active.
    code.load(0, seconds)
    code.emit(0x8800)
    code.load(1, int.from_bytes(clock.thumb_b(seconds, rtc.address(clock.VIRTUAL_CLOCK)), "little"))
    code.emit(0x2218, 0x4288)
    code.branch("cycle_loaded", 1)
    code.load(0, rtc.address(clock.VIRTUAL_CLOCK + 0x12))
    code.emit(0x7802)
    code.mark("cycle_loaded")
    code.emit(0x4356, 0x4355, 0x1C30, 0x2118)  # boundary*N, virtual*N
    code.call(DIVIDE, arm=True)
    code.emit(0x1C06, 0x1C28, 0x3017, 0x2118)
    code.call(DIVIDE, arm=True)
    code.emit(0x1A36)  # remaining = boundary*N/24 - ceil(virtual*N/24)
    code.load(0, 18 * 64 + 6)
    code.emit(0x1820)
    code.call("clear_line")
    code.emit(0x1C39)
    code.call("text")
    code.load(1, "in")
    code.call("text")
    code.emit(0x1C04, 0x1C30)
    code.load(1, 3600)
    code.call(DIVIDE, arm=True)
    code.emit(0x9100, 0x1C01, 0x1C20, 0x2202)
    code.call("number")
    code.load(1, "colon")
    code.call("text")
    code.emit(0x1C04, 0x9800, 0x213C)
    code.call(DIVIDE, arm=True)
    code.emit(0x1C0E, 0x1C01, 0x1C20, 0x2202)
    code.call("number")
    code.load(1, "colon")
    code.call("text")
    code.emit(0x1C31, 0x2202)
    code.call("number")
    code.emit(0xB001, 0xBDF0)

    code.mark("clear_line")
    code.emit(0x2116)
    code.load(2, FONT_TILE)
    code.mark("clear_loop")
    code.emit(0x8002, 0x3002, 0x3901)
    code.branch("clear_loop", 1)
    code.emit(0x382C, 0x4770)

    code.mark("text")
    code.load(3, FONT_TILE - 32)
    code.mark("text_loop")
    code.emit(0x780A, 0x2A00)
    code.branch("text_end", 0)
    code.emit(0x18D2, 0x8002, 0x3002, 0x3101)
    code.branch("text_loop")
    code.mark("text_end")
    code.emit(0x4770)

    code.mark("number")
    code.emit(0xB5F0, 0xB081, 0x1C04, 0x1C0D, 0x1C16, 0x0052, 0x1887)
    code.mark("number_loop")
    code.emit(0x1C28, 0x210A)
    code.call(DIVIDE, arm=True)
    code.emit(0x1C05, 0x3130)
    code.load(3, FONT_TILE - 32)
    code.emit(0x18C9, 0x3E01, 0x0072, 0x52A1, 0x2E00)
    code.branch("number_loop", 1)
    code.emit(0x1C38, 0xB001, 0xBDF0)
    code.pool()
    texts = {
        "repel": "REPEL ", "steps": " STEPS", "off": "OFF",
        "morning": "MORNING", "day": "DAY", "night": "NIGHT", "in": " IN ", "colon": ":",
    }
    if weather_table is not None:
        texts["weather"] = "WEATHER "
        texts.update({f"weather_{value}": name for value, name in WEATHER_NAMES.items()})
    for name, text in texts.items():
        code.append(name, text.encode("ascii") + b"\0")
    if len(code.data) % 2:
        code.data.append(0)
    code.append("font", font_tiles())
    return code.finish(), code.labels


def remaining_seconds(virtual_seconds, hours):
    """Reference for the native countdown; evening uses the day encounter table."""
    if not 0 <= virtual_seconds < 86400 or not 1 <= hours <= 24:
        raise ValueError("Expected a time within one day and a cycle of 1-24 hours.")
    for boundary, name in ((14400, "MORNING"), (36000, "DAY"), (72000, "NIGHT"), (100800, "MORNING")):
        if virtual_seconds < boundary:
            return name, boundary * hours // 24 - (virtual_seconds * hours + 23) // 24
    raise ValueError("Virtual time must be within one day.")


def weather_table_address(rom):
    """Address of the yearly weather table hosting the random weather patch, if the ROM supports it."""
    import rom_weather  # rom_weather imports this module

    try:
        return rom_weather.WeatherPatch(rom).table
    except RuntimeError:
        return None


def patch_poketch_panel(rom):
    rtc = clock.DayCyclePatch(rom)
    start, end = overlay_span(rom, OVERLAY)
    image = bytes(rom.data[start:end])
    installed = len(image) >= ORIGINAL_SIZE + HEADER.size and image[ORIGINAL_SIZE : ORIGINAL_SIZE + 8] == MAGIC
    current_size = len(image)
    if installed:
        # Rebuild: restore the original call sites, then install the current panel in the same place.
        if end != u32(rom.data, 0x80):
            raise RuntimeError("The installed Poketch panel is not at the end of the ROM: use the original ROM.")
        original = bytearray(image[:ORIGINAL_SIZE])
        for offset, data in ORIGINAL_SITES.items():
            original[offset : offset + len(data)] = data
        image = bytes(original)
    if len(image) != ORIGINAL_SIZE or hashlib.sha256(image).hexdigest() != ORIGINAL_HASH:
        raise RuntimeError("The digital watch does not match the supported Platinum Multiplayer version.")
    arm9 = Arm9(rom).bytes()
    guards = {
        GET_REPEL: bytes.fromhex("014940187047c0464f010000"),
        GET_ENCOUNTERS: bytes.fromhex("014b19211847c046bd520202"),
    }
    for address, expected in guards.items():
        offset = address - rtc.arm9.ram
        if arm9[offset : offset + len(expected)] != expected:
            raise RuntimeError("Unsupported native Repel counter routine.")
    if rtc.divide != DIVIDE:
        raise RuntimeError("Unsupported clock division routine.")
    table, table_size = u32(rom.data, 0x50), u32(rom.data, 0x54)
    systems = [entry for entry in range(table, table + table_size, 32) if u32(rom.data, entry) == 25]
    if len(systems) != 1 or u32(rom.data, systems[0] + 4) != 0x02274FC0:
        raise RuntimeError("Unsupported Poketch system memory layout.")
    system_start, system_end = overlay_span(rom, 25)
    getter = GET_SAVE - 0x02274FC0
    if system_start + getter + 4 > system_end or rom.data[system_start + getter : system_start + getter + 4] != bytes.fromhex("406d7047"):
        raise RuntimeError("Unsupported Poketch save data getter.")
    payload, labels = build_panel(RAM + ORIGINAL_SIZE + HEADER.size, rtc, weather_table_address(rom))
    patched = bytearray(image + HEADER.pack(MAGIC, len(payload)) + payload)
    for offset in RTC_CALLS:
        patched[offset : offset + 4] = clock.thumb_bl(RAM + offset, labels["read_time"])
    for offset, label in zip(DRAW_CALLS, ("init_panel", "draw_panel")):
        patched[offset : offset + 4] = clock.thumb_bl(RAM + offset, labels[label])
    patched[UPDATE_BRANCH : UPDATE_BRANCH + 2] = clock.halfwords(0x46C0)

    entries = [entry for entry in range(table, table + table_size, 32) if u32(rom.data, entry) == OVERLAY]
    if len(entries) != 1:
        raise RuntimeError("Expected one digital-watch overlay entry.")
    entry = entries[0]
    if (u32(rom.data, entry + 4), u32(rom.data, entry + 8), u32(rom.data, entry + 12)) != (RAM, current_size, 0):
        raise RuntimeError("Unsupported digital-watch memory layout.")
    for other in range(table, table + table_size, 32):
        if other == entry:
            continue
        lo = u32(rom.data, other + 4)
        hi = lo + u32(rom.data, other + 8) + u32(rom.data, other + 12)
        if lo < RAM + len(patched) and hi > RAM and not (lo < RAM + ORIGINAL_SIZE and hi > RAM):
            raise RuntimeError("Expanded Poketch panel would overlap another overlay.")
    fat, fat_size = u32(rom.data, 0x48), u32(rom.data, 0x4C)
    used = start if installed else u32(rom.data, 0x80)
    last_file = max(u32(rom.data, offset + 4) for offset in range(fat, fat + fat_size, 8))
    target = (used + 0x1FF) & ~0x1FF
    if installed and target != start:
        raise RuntimeError("Unexpected installed Poketch panel position.")
    if (used < last_file and not installed) or target + len(patched) > len(rom.data):
        raise RuntimeError("Not enough unused ROM space for the Poketch panel.")
    free_from = end if installed else target
    if any(value != 0xFF for value in rom.data[max(free_from, target) : target + len(patched)]):
        raise RuntimeError("Poketch destination is not unused ROM padding.")
    file_entry = fat + u32(rom.data, entry + 24) * 8
    if installed:
        rom.write(start, end, b"\xff" * (end - start))
    rom.write(target, target + len(patched), patched)
    rom.write(file_entry, file_entry + 8, struct.pack("<II", target, target + len(patched)))
    rom.write(entry + 8, entry + 12, struct.pack("<I", len(patched)))
    rom.write(0x80, 0x84, struct.pack("<I", target + len(patched)))
    weather = " and today's weather" if weather_table_address(rom) is not None else ""
    return (
        f"Poketch digital watch{' (updated)' if installed else ''}: cycle time, Repel steps, "
        f"real time until the next encounter period{weather}."
    )
