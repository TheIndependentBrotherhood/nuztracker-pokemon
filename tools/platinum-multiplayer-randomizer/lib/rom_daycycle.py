"""Accelerated day/night cycle: one in-game day lasts a chosen number of real hours.

Only the time of day is accelerated. Platinum's RTC module gets a virtual clock computed from the real date
and time: `virtual seconds = ((day * 24 + hour) mod N hours + minutes and seconds) * 24 / N`, so the cycle
never jumps at midnight and two consoles set to the same real time are always in the same period.

- `GetTimeOfDay` / `TimeOfDayForHour` (wild encounters, evolutions, music, battle backgrounds, scripts and
  Pokédex areas) and `GetSecondsSinceMidnight` (field lighting) use the virtual clock;
- dates, timestamps and elapsed minutes (berries, daily events, Poketch clocks) keep the real time.

`TimeElapsed` is rewritten without its debug assertion to make room for the virtual clock routine.
"""

import struct

from rom_extras import Arm9

TIME_OF_DAY_TABLE = bytes([4] * 4 + [0] * 6 + [1] * 7 + [2] * 3 + [3] * 4)
MAX_TIMESTAMP = 3155759999
SECONDS_PER_DAY = 86400
REAL_TIME = "real"
CYCLE_HOURS = range(1, 25)

# Offsets from `TimeOfDayForHour`, the function reading TIME_OF_DAY_TABLE.
SECONDS_SINCE_MIDNIGHT = -0xAC
SECONDS_SINCE_MIDNIGHT_SIZE = 0x20
DAY_NUMBER_DIVISION = -0x4E
GET_TIME_OF_DAY = -0x14
TABLE_LITERAL = 0x14
TIME_ELAPSED = 0x18
TIME_ELAPSED_END = 0x90
VIRTUAL_CLOCK = 0x40
GET_CURRENT_DATE_TIME = -0x128
ASSERT_CALL = 0x0A

ORIGINAL = {
    SECONDS_SINCE_MIDNIGHT: bytes.fromhex("18b4074c3c206168a3680a1c4243e1202168000148431018181818bc7047c046"),
    DAY_NUMBER_DIVISION - 4: bytes.fromhex("201c6421"),
    GET_TIME_OF_DAY: bytes.fromhex("00b583b000a8fff78bff009800f002f803b000bd"),
    0: bytes.fromhex("10b5041c01d4182c01db"),
    0x0E: bytes.fromhex("0148005d10bd"),
    TIME_ELAPSED: bytes.fromhex("f0b589b01e1c"),
    TIME_ELAPSED_END - 4: struct.pack("<I", MAX_TIMESTAMP),
}
DATE_TIME_CALLER = bytes.fromhex("201d")  # `adds r0, r4, #4` before RTC_ConvertDateToDay


def halfwords(*values):
    return struct.pack(f"<{len(values)}H", *values)


def thumb_bl(source, target):
    offset = target - (source + 4)
    if offset % 2 or not -0x400000 <= offset < 0x400000:
        raise RuntimeError("Thumb call target out of range.")
    return halfwords(0xF000 | (offset >> 12) & 0x7FF, 0xF800 | (offset >> 1) & 0x7FF)


def thumb_blx(source, target):
    """Thumb call to an ARM routine (`blx #imm`, relative to the word-aligned PC)."""
    offset = target - ((source + 4) & ~3)
    if offset % 4 or not -0x400000 <= offset < 0x400000:
        raise RuntimeError("ARM call target out of range.")
    return halfwords(0xF000 | (offset >> 12) & 0x7FF, 0xE800 | (offset >> 1) & 0x7FF)


def thumb_b(source, target):
    offset = target - (source + 4)
    if offset % 2 or not -0x800 <= offset < 0x800:
        raise RuntimeError("Thumb branch target out of range.")
    return halfwords(0xE000 | (offset >> 1) & 0x7FF)


def call_target(code, offset, address):
    """Target of a Thumb `bl` / `blx` at `offset`, or None."""
    if offset < 0 or offset + 4 > len(code):
        return None
    high, low = struct.unpack_from("<HH", code, offset)
    if high >> 11 != 0x1E or low >> 11 not in (0x1D, 0x1F):
        return None
    value = (high & 0x7FF) << 12 | (low & 0x7FF) << 1
    target = address + 4 + (value - (1 << 23) if value & (1 << 22) else value)
    return target & ~3 if low >> 11 == 0x1D else target


def virtual_seconds(day, hour, minute, second, hours):
    """Reference of the patched `GetSecondsSinceMidnight` (`day` from RTC_ConvertDateToDay)."""
    elapsed = (day * 24 + hour) % hours * 3600 + minute * 60 + second
    return elapsed * 24 // hours


def parse_cycle(value):
    """`dayNightCycle` setting: "real" or a number of real hours (1-24) per in-game day."""
    if value is None or value == REAL_TIME:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value not in CYCLE_HOURS:
        raise ValueError(f'romTweaks.dayNightCycle must be "{REAL_TIME}" or a number of hours from 1 to 24.')
    return value


def unsupported():
    return RuntimeError("The clock routines of this ROM are not supported.")


class DayCyclePatch:
    """Locates Platinum's RTC module (original or already patched) and writes the virtual clock."""

    def __init__(self, rom):
        self.rom = rom
        self.arm9 = Arm9(rom)
        code = self.arm9.bytes()
        ram = self.arm9.ram
        tables = [index for index in range(len(code)) if code.startswith(TIME_OF_DAY_TABLE, index)]
        if len(tables) != 1:
            raise unsupported()
        table = struct.pack("<I", ram + tables[0])
        literals = [offset for offset in range(0, len(code) - 3, 4) if code[offset : offset + 4] == table]
        if len(literals) != 1:
            raise unsupported()
        self.table_literal = literals[0]
        self.base = literals[0] - TABLE_LITERAL
        self.code = code
        self.date_time = ram + self.base + GET_CURRENT_DATE_TIME
        self.patched_hours = self._patched_hours()
        if self.patched_hours is None:
            self._check_original()
        self.convert_date_to_day = self._convert_date_to_day()

    def offset(self, relative):
        return self.base + relative

    def address(self, relative):
        return self.arm9.ram + self.base + relative

    def _check_original(self):
        code = self.code
        for relative, expected in ORIGINAL.items():
            start = self.offset(relative)
            if code[start : start + len(expected)] != expected:
                raise unsupported()
        assert_call = self.offset(ASSERT_CALL)
        if call_target(code, assert_call, self.address(ASSERT_CALL)) is None:
            raise unsupported()
        time_literal = struct.unpack_from("<I", code, self.offset(SECONDS_SINCE_MIDNIGHT + 0x20))[0]
        if not 0x02000000 <= time_literal < 0x02400000:
            raise unsupported()
        self.time = time_literal
        self.divide = call_target(code, self.offset(DAY_NUMBER_DIVISION), self.address(DAY_NUMBER_DIVISION))
        if self.divide is None:
            raise unsupported()

    def _patched_hours(self):
        """Cycle length of an already patched ROM (its routines are rebuilt from their own operands)."""
        code = self.code
        clock = self.offset(VIRTUAL_CLOCK)
        date = struct.unpack_from("<I", code, clock + 0x3C)[0]
        divide = call_target(code, clock + 0x14, self.address(VIRTUAL_CLOCK + 0x14))
        convert = call_target(code, clock + 0x06, self.address(VIRTUAL_CLOCK + 0x06))
        hours = code[clock + 0x12]
        if divide is None or convert is None or hours not in CYCLE_HOURS:
            return None
        self.time, self.divide = date + 0x10, divide
        try:
            expected = self.routines(hours, convert)
        except RuntimeError:
            return None
        for relative, data in expected.items():
            start = self.offset(relative)
            if code[start : start + len(data)] != data:
                return None
        return hours

    def _convert_date_to_day(self):
        """RTC_ConvertDateToDay, called on the date read by GetCurrentDateTime (daily events, records)."""
        code, ram = self.code, self.arm9.ram
        targets = set()
        for offset in range(0, len(code) - 10, 2):
            if call_target(code, offset, ram + offset) != self.date_time:
                continue
            if code[offset + 4 : offset + 6] != DATE_TIME_CALLER:
                continue
            target = call_target(code, offset + 6, ram + offset + 6)
            if target is not None:
                targets.add(target)
        if len(targets) != 1:
            raise unsupported()
        return targets.pop()

    def routines(self, hours, convert=None):
        """Patched code, by offset from `TimeOfDayForHour`."""
        convert = self.convert_date_to_day if convert is None else convert
        at = self.address
        get_time_of_day = (
            halfwords(0xB508)  # push {r3, lr}
            + thumb_bl(at(GET_TIME_OF_DAY + 0x02), at(SECONDS_SINCE_MIDNIGHT))
            + halfwords(0x4904)  # ldr r1, =3600
            + thumb_blx(at(GET_TIME_OF_DAY + 0x08), self.divide)  # r0 = virtual hour
            + halfwords(0x4906, 0x5C08, 0xBD08, 0x46C0)  # ldr r1, =table; ldrb r0, [r1, r0]; pop {r3, pc}; nop
            # TimeOfDayForHour ignores its (real) hour: every caller passes the current one.
            + thumb_b(at(0), at(GET_TIME_OF_DAY))
            + halfwords(0x46C0)
            + struct.pack("<I", 3600)
            + halfwords(0x46C0) * 6
        )
        time_elapsed = (
            halfwords(
                0xB430,  # push {r4, r5}
                0x1C04,  # adds r4, r0, #0
                0x1C0D,  # adds r5, r1, #0
                0x1AA4,  # subs r4, r4, r2
                0x419D,  # sbcs r5, r3 (flags: since - until)
                0xDA02,  # bge wrap
                0x1A10,  # subs r0, r2, r0
                0x418B,  # sbcs r3, r1
                0xE005,  # b done
                0x4C04,  # wrap: ldr r4, =MAX_TIMESTAMP
                0x2500,  # movs r5, #0
                0x1A24,  # subs r4, r4, r0
                0x418D,  # sbcs r5, r1
                0x1910,  # adds r0, r2, r4
                0x416B,  # adcs r3, r5
                0x1C19,  # done: adds r1, r3, #0
                0xBC30,  # pop {r4, r5}
                0x4770,  # bx lr
            )
            + struct.pack("<I", MAX_TIMESTAMP)
        )
        clock = (
            halfwords(0xB510, 0x4C0E, 0x1C20)  # push {r4, lr}; ldr r4, =date; adds r0, r4, #0
            + thumb_blx(at(VIRTUAL_CLOCK + 0x06), convert)  # r0 = days since 2000
            + halfwords(0x2118, 0x4348, 0x6921, 0x1840, 0x2100 | hours)  # r0 = (days * 24 + hour), r1 = N
            + thumb_blx(at(VIRTUAL_CLOCK + 0x14), self.divide)  # r1 = elapsed hours in the cycle
            # An unread clock gives day -1: keep the remainder positive.
            + halfwords(0x2900, 0xDA00, 0x3100 | hours)  # cmp r1, #0; bge; adds r1, #N
            + halfwords(0x20E1, 0x0100, 0x4348)  # r0 = r1 * 3600
            + halfwords(0x6961, 0x223C, 0x4351, 0x1840)  # + minute * 60
            + halfwords(0x69A1, 0x1840)  # + second
            + halfwords(0x2118, 0x4348, 0x2100 | hours)  # * 24 / N
            + thumb_blx(at(VIRTUAL_CLOCK + 0x36), self.divide)
            + halfwords(0xBD10)  # pop {r4, pc}
            + struct.pack("<I", self.time - 0x10)
        )
        clock += halfwords(0x46C0) * ((TIME_ELAPSED_END - VIRTUAL_CLOCK - len(clock)) // 2)
        # The original literal (current time) stays after the stub.
        seconds = thumb_b(at(SECONDS_SINCE_MIDNIGHT), at(VIRTUAL_CLOCK)) + halfwords(0x46C0) * 15
        return {
            SECONDS_SINCE_MIDNIGHT: seconds,
            GET_TIME_OF_DAY: get_time_of_day,
            TIME_ELAPSED: time_elapsed,
            VIRTUAL_CLOCK: clock,
        }

    def apply(self, hours):
        routines = self.routines(hours)
        if len(routines[GET_TIME_OF_DAY]) != TABLE_LITERAL - GET_TIME_OF_DAY:
            raise RuntimeError("Unexpected time of day routine size.")
        if len(routines[TIME_ELAPSED]) != VIRTUAL_CLOCK - TIME_ELAPSED:
            raise RuntimeError("Unexpected TimeElapsed routine size.")
        for relative, data in routines.items():
            start = self.arm9.offset + self.offset(relative)
            self.rom.write(start, start + len(data), data)


def patch_day_night_cycle(rom, hours):
    patch = DayCyclePatch(rom)
    patch.apply(hours)
    previous = f" (was {patch.patched_hours} h)" if patch.patched_hours else ""
    return f"Day/night cycle: one in-game day lasts {hours} real hour{'s' if hours > 1 else ''}{previous}."
