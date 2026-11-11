import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import rom_evolutions
import rom_learnsets

NARC_OFFSET = 0x4000
FAT_OFFSET = 0x3000


def evolution_record(*entries):
    data = bytearray(rom_evolutions.EVOLUTION_RECORD_SIZE)
    for slot, entry in enumerate(entries):
        struct.pack_into("<HHH", data, slot * rom_evolutions.EVOLUTION_ENTRY_SIZE, *entry)
    return bytes(data)


def narc(files):
    names = b"BTNF" + struct.pack("<IIHH", 16, 4, 0, 1)
    shell = b"NARC" + struct.pack("<HHIHH", 0xFFFE, 0x0100, 0, 16, 3) + b"BTAF" + struct.pack("<IHH", 12, 0, 0)
    return rom_learnsets.build_narc(shell + names, files)


def narc_members(data):
    count = struct.unpack_from("<H", data, 24)[0]
    btnf = 16 + struct.unpack_from("<I", data, 20)[0]
    gmif = btnf + struct.unpack_from("<I", data, btnf + 4)[0] + 8
    spans = [struct.unpack_from("<II", data, 28 + index * 8) for index in range(count)]
    return [data[gmif + start : gmif + end] for start, end in spans]


class FakeArchive:
    def __init__(self, files):
        self.files = list(files)
        self.num_files = len(self.files)

    def get(self, index):
        return self.files[index]


ARM9_OFFSET, ARM9_RAM, ARM9_SIZE = 0x200, 0x02000000, 0x1000
ROUTINE, LOADER, FORM_INDEX, READ_MEMBER, GET_VALUE, CALLER = 0x200, 0x600, 0x700, 0x800, 0x900, 0xA00
ANCHOR = ROUTINE - rom_learnsets.ROUTINE_OFFSET
SETUP = ANCHOR + rom_learnsets.SETUP_OFFSET


def fake_arm9(heap=0x20):
    """Minimal ARM9 with the Move Reminder routine pieces the patch checks and rewrites."""
    code = bytearray(ARM9_SIZE)
    bl = rom_learnsets.thumb_bl

    def put(offset, data):
        code[offset : offset + len(data)] = data

    put(ROUTINE, rom_learnsets.ROUTINE_PROLOGUE)
    put(SETUP, rom_learnsets.original_setup(ARM9_RAM + SETUP, ARM9_RAM + GET_VALUE))
    put(ANCHOR, rom_learnsets.MOVE_REMINDER_ALLOC)
    put(ANCHOR + 0x14, rom_learnsets.halfwords(0x9804, rom_learnsets.LOAD_FORM, 0x9A02))
    put(ANCHOR + rom_learnsets.LOADER_CALL_OFFSET, bl(ARM9_RAM + ANCHOR + 0x1A, ARM9_RAM + LOADER))
    put(ANCHOR + rom_learnsets.SCAN_LIMIT_OFFSET, struct.pack("<H", rom_learnsets.SCAN_LIMIT))
    put(LOADER, rom_learnsets.halfwords(0xB510, 0x1C14) + bl(ARM9_RAM + LOADER + 4, ARM9_RAM + FORM_INDEX))
    put(LOADER + 8, rom_learnsets.halfwords(0x1C02, 0x1C20, 0x2121))
    put(LOADER + 14, bl(ARM9_RAM + LOADER + 14, ARM9_RAM + READ_MEMBER) + rom_learnsets.halfwords(0xBD10))
    put(CALLER, rom_learnsets.halfwords(0x2100 | heap) + bl(ARM9_RAM + CALLER + 2, ARM9_RAM + ROUTINE))
    return code


class FakeRom:
    def __init__(self, supported=True, free=0x10000, heap=0x20):
        self.data = bytearray(0x10000 + free)
        struct.pack_into("<III", self.data, 0x20, ARM9_OFFSET, 0, ARM9_RAM)
        struct.pack_into("<I", self.data, 0x2C, ARM9_SIZE)
        if supported:
            self.data[ARM9_OFFSET : ARM9_OFFSET + ARM9_SIZE] = fake_arm9(heap)
        struct.pack_into("<II", self.data, 0x48, FAT_OFFSET, 16)
        struct.pack_into("<II", self.data, FAT_OFFSET, 0x1200, 0x1300)
        self.data[0x10000:] = b"\xff" * free

    def arm9(self, offset, size):
        return bytes(self.data[ARM9_OFFSET + offset : ARM9_OFFSET + offset + size])

    def put_file(self, data):
        self.data[NARC_OFFSET : NARC_OFFSET + len(data)] = data
        struct.pack_into("<II", self.data, FAT_OFFSET + 8, NARC_OFFSET, NARC_OFFSET + len(data))
        struct.pack_into("<I", self.data, 0x80, 0x10000)

    def span(self):
        return struct.unpack_from("<II", self.data, FAT_OFFSET + 8)

    def write(self, start, end, value):
        if start < 0 or end > len(self.data) or end - start != len(value):
            raise ValueError("Invalid ROM write.")
        self.data[start:end] = value


class FakeProjectPm:
    def __init__(self, rom, learnsets):
        evolutions = [evolution_record() for _ in range(509)]
        # Random line 10 -> 20 -> 30 (levels 16 and 32), plus 40 -> 30 with a stone.
        evolutions[10] = evolution_record((4, 16, 20))
        evolutions[20] = evolution_record((4, 32, 30))
        evolutions[40] = evolution_record((7, 80, 30))
        self.evolutions = FakeArchive(evolutions)
        files = [rom_learnsets.encode_learnset([(1, 1)]) for _ in range(509)]
        for species, entries in learnsets.items():
            files[species] = rom_learnsets.encode_learnset(entries)
        rom.put_file(narc(files))

    def _open_narc(self, rom, path, log):
        if path == rom_evolutions.EVOLUTION_ARCHIVE:
            return (0, 0), self.evolutions
        start, end = rom.span()
        return (start, end), FakeArchive(narc_members(bytes(rom.data[start:end])))


def members(rom):
    start, end = rom.span()
    return narc_members(bytes(rom.data[start:end]))


def learnset(rom, member):
    return rom_learnsets.parse_learnset(members(rom)[member])


LINE = {10: [(1, 100), (20, 101)], 20: [(1, 200), (5, 100)], 30: [(1, 300)], 40: [(9, 400)]}


def run(rom):
    return rom_learnsets.inherit_learnsets(FakeProjectPm(rom, LINE), rom, lambda *_: None)


class MoveReminderLearnsetTests(unittest.TestCase):
    def test_encoding_round_trips_and_stays_aligned(self):
        entries = [(1, 33), (7, 45), (100, 467)]
        data = rom_learnsets.encode_learnset(entries)
        self.assertEqual(len(data) % 4, 0)
        self.assertEqual(rom_learnsets.parse_learnset(data), entries)
        with self.assertRaisesRegex(RuntimeError, "terminator"):
            rom_learnsets.parse_learnset(data[:6])

    def test_narc_rebuild_keeps_members(self):
        files = [b"\x01\x02\xff\xff", b"\xff\xff", b""]
        data = narc(files)
        self.assertEqual(narc_members(data), files)
        self.assertEqual(rom_learnsets.build_narc(data, files), data)

    def test_level_up_learnsets_stay_unchanged_and_the_reminder_gets_every_ancestor_move(self):
        rom = FakeRom()
        pm = FakeProjectPm(rom, LINE)
        before = members(rom)
        report = rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
        after = members(rom)
        self.assertEqual(after[:509], before)
        self.assertEqual(learnset(rom, 509 + 10), LINE[10])
        self.assertEqual(learnset(rom, 509 + 20), [(1, 200), (5, 100), (20, 101)])
        self.assertEqual(learnset(rom, 509 + 30), [(1, 300), (1, 100), (1, 200), (9, 400), (20, 101)])
        self.assertEqual(after[509 + 494], before[494])
        self.assertIn("2 species can relearn all 5", report)

    def test_the_move_reminder_reads_the_reminder_lists_with_larger_buffers(self):
        rom = FakeRom()
        run(rom)
        address = ARM9_RAM + SETUP
        setup = rom_learnsets.patched_setup(address, ARM9_RAM + GET_VALUE, ARM9_RAM + FORM_INDEX, 509)
        self.assertEqual(rom.arm9(SETUP, rom_learnsets.SETUP_SIZE), setup)
        self.assertEqual(rom.arm9(ANCHOR, 16), rom_learnsets.PATCHED_REMINDER_ALLOC)
        self.assertEqual(rom.arm9(ANCHOR + 0x16, 2), struct.pack("<H", rom_learnsets.FORM_ZERO))
        self.assertEqual(rom.arm9(ANCHOR + 0x9C, 2), struct.pack("<H", rom_learnsets.PATCHED_SCAN_LIMIT))
        self.assertEqual(rom.arm9(LOADER, 20)[:4], rom_learnsets.halfwords(0xB510, 0x1C14))

    def test_running_twice_changes_nothing(self):
        rom = FakeRom()
        pm = FakeProjectPm(rom, LINE)
        rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
        once = bytes(rom.data)
        rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
        self.assertEqual(bytes(rom.data), once)

    def test_the_reminder_lists_move_to_unused_rom_padding(self):
        rom = FakeRom()
        before = rom.span()
        run(rom)
        start, end = rom.span()
        self.assertEqual(start, 0x10000)
        self.assertGreater(end - start, before[1] - before[0])
        self.assertEqual(struct.unpack_from("<I", rom.data, 0x80)[0], end)

    def test_without_unused_padding_the_rom_is_left_unchanged(self):
        rom = FakeRom(free=0x10)
        pm = FakeProjectPm(rom, LINE)
        original = bytes(rom.data)
        with self.assertRaisesRegex(RuntimeError, "unused ROM padding"):
            rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
        self.assertEqual(bytes(rom.data), original)

    def test_no_move_is_ever_dropped(self):
        rom = FakeRom()
        pm = FakeProjectPm(rom, {10: [(1, move) for move in range(1, 201)], 20: [(1, move) for move in range(201, 261)]})
        original = bytes(rom.data)
        with self.assertRaisesRegex(RuntimeError, "no move is dropped"):
            rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
        self.assertEqual(bytes(rom.data), original)
        self.assertLessEqual(len(rom_learnsets.encode_learnset([(1, 1)] * rom_learnsets.REMINDER_CAPACITY)), 512)

    def test_unsupported_routines_are_refused(self):
        for rom in (FakeRom(supported=False), FakeRom(heap=0x0B)):
            pm = FakeProjectPm(rom, LINE)
            original = bytes(rom.data)
            with self.assertRaisesRegex(RuntimeError, "not supported"):
                rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
            self.assertEqual(bytes(rom.data), original)

    def test_nothing_is_written_without_new_moves(self):
        rom = FakeRom()
        pm = FakeProjectPm(rom, {10: [(1, 100)], 20: [(1, 100)], 30: [(1, 100)], 40: [(1, 100)]})
        original = bytes(rom.data)
        rom_learnsets.inherit_learnsets(pm, rom, lambda *_: None)
        self.assertEqual(bytes(rom.data), original)


if __name__ == "__main__":
    unittest.main()
