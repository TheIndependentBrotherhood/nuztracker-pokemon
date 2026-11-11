"""Let evolved Pokémon relearn the level-up moves of their (randomized) pre-evolutions at the Move Reminder.

Level-up learnsets are never modified: the learnset archive keeps its members and gains one
reminder-only list per member after them, and the Move Reminder routine is patched to read those lists.
"""

import struct
from collections import defaultdict

from rom_evolutions import EVOLUTION_ARCHIVE, SPECIES_COUNT, read_evolution_records
from rom_extras import Arm9

LEARNSET_ARCHIVE = "poketool/personal/wotbl.narc"
LEARNSET_SENTINEL = 0xFFFF
MOVE_BITS = 9
MOVE_MASK = (1 << MOVE_BITS) - 1
MAX_LEVEL = 100
# Platinum Multiplayer's Move Reminder routine, from its two allocations: the learnset buffer (62 bytes) and
# the relearnable move list (76 bytes). The patch sizes both as `heap ID << 4` (512 bytes, heap 0x20).
MOVE_REMINDER_ALLOC = bytes.fromhex("381c3e2178f7c4f80290381c4c2178f7")
PATCHED_REMINDER_ALLOC = bytes.fromhex("381c390178f7c4f80290381c390178f7")
# Offsets from the allocations: routine start, its species/form/level reads, `ldr r1, [sp, #0xc]` (form
# argument), the call to the learnset loader and `cmp r7, #0x1f` (learnset entries scanned).
ROUTINE_OFFSET = -0x58
ROUTINE_PROLOGUE = struct.pack("<3H", 0xB5F0, 0xB089, 0x1C0F)
SETUP_OFFSET = -0x48
SETUP_SIZE = 0x2A
FORM_ARGUMENT_OFFSET = 0x16
LOADER_CALL_OFFSET = 0x1A
SCAN_LIMIT_OFFSET = 0x9C
LOAD_FORM, FORM_ZERO = 0x9903, 0x2100
SCAN_LIMIT, PATCHED_SCAN_LIMIT = 0x2F1F, 0x2FFF
LOAD_HEAP_ID = 0x2120  # `movs r1, #0x20` before every call
MAX_MEMBER_OFFSET = 2 * 0xFF
# Learnset moves + sentinel fit the 512-byte buffer and the 255 scanned entries; the relearnable list adds
# up to 6 Platinum Multiplayer moves and must stay within 254 entries for the reminder screen (u8 count + 1).
REMINDER_CAPACITY = 248


def thumb_bl(source, target):
    offset = target - (source + 4)
    if offset % 2 or not -0x400000 <= offset < 0x400000:
        raise RuntimeError("Thumb call target out of range.")
    return struct.pack("<HH", 0xF000 | (offset >> 12) & 0x7FF, 0xF800 | (offset >> 1) & 0x7FF)


def bl_target(data, offset, address):
    if offset < 0 or offset + 4 > len(data):
        return None
    high, low = struct.unpack_from("<HH", data, offset)
    if high >> 11 != 0x1E or low >> 11 != 0x1F:
        return None
    value = (high & 0x7FF) << 12 | (low & 0x7FF) << 1
    return address + 4 + (value - (1 << 23) if value & (1 << 22) else value)


def halfwords(*values):
    return struct.pack(f"<{len(values)}H", *values)


def original_setup(address, get_value):
    """Species, form and level reads of the unpatched Move Reminder routine."""
    return (
        halfwords(0x0400, 0x0C00, 0x9004, 0x9800, 0x2170, 0x2200)  # species (u16) -> [sp,#0x10]; read form
        + thumb_bl(address + 0x0C, get_value)
        + halfwords(0x0600, 0x0E00, 0x9003, 0x9800, 0x21A1, 0x2200)  # form (u8) -> [sp,#0xc]; read level
        + thumb_bl(address + 0x1C, get_value)
        + halfwords(0x0600, 0x0E00, 0x2500, 0xAC06, 0x9001)  # level (u8) -> [sp,#4]
    )


def patched_setup(address, get_value, form_index, member_offset):
    """Same reads without the redundant truncations, storing `form index + member offset` in the species slot
    so the loader (called with form 0, which keeps any index above the forms) reads the reminder-only list."""
    first = min(member_offset, 0xFF)
    return (
        halfwords(0x9004, 0x9800, 0x2170, 0x2200)
        + thumb_bl(address + 0x08, get_value)
        + halfwords(0x1C01, 0x9804)  # form -> r1; species -> r0
        + thumb_bl(address + 0x10, form_index)
        + halfwords(0x3000 | first, 0x3000 | member_offset - first, 0x9004, 0x9800, 0x21A1, 0x2200)
        + thumb_bl(address + 0x20, get_value)
        + halfwords(0x2500, 0xAC06, 0x9001)
    )


def unsupported(what="Move Reminder routine"):
    return RuntimeError(f"The {what} of this ROM is not supported.")


class MoveReminderPatch:
    """Locates Platinum Multiplayer's Move Reminder routine and redirects it to larger, reminder-only learnsets."""

    def __init__(self, rom):
        self.rom = rom
        self.arm9 = Arm9(rom)
        code = self.arm9.bytes()
        anchors = [
            (code.find(signature), patched)
            for signature, patched in ((MOVE_REMINDER_ALLOC, False), (PATCHED_REMINDER_ALLOC, True))
            if code.count(signature) == 1
        ]
        if len(anchors) != 1 or anchors[0][0] < 0:
            raise unsupported()
        anchor, patched = anchors[0]
        self.anchor = anchor
        ram = self.arm9.ram
        routine = anchor + ROUTINE_OFFSET
        if code[routine : routine + len(ROUTINE_PROLOGUE)] != ROUTINE_PROLOGUE:
            raise unsupported()
        callers = [
            offset
            for offset in range(0, len(code) - 4, 2)
            if bl_target(code, offset, ram + offset) == ram + routine
        ]
        # The patched buffer size derives from the heap ID, so every caller must use the same heap.
        if not callers or any(struct.unpack_from("<H", code, offset - 2)[0] != LOAD_HEAP_ID for offset in callers):
            raise unsupported()
        loader = bl_target(code, anchor + LOADER_CALL_OFFSET, ram + anchor + LOADER_CALL_OFFSET)
        loader_offset = None if loader is None else loader - ram
        if loader_offset is None or not 0 <= loader_offset <= len(code) - 20:
            raise unsupported()
        self.form_index = bl_target(code, loader_offset + 4, loader + 4)
        loader_code = code[loader_offset : loader_offset + 4] + code[loader_offset + 8 : loader_offset + 14]
        if self.form_index is None or loader_code != halfwords(0xB510, 0x1C14, 0x1C02, 0x1C20, 0x2121):
            raise unsupported("learnset loader")
        self.setup = anchor + SETUP_OFFSET
        self.address = ram + self.setup
        setup = code[self.setup : self.setup + SETUP_SIZE]
        form_argument = struct.unpack_from("<H", code, anchor + FORM_ARGUMENT_OFFSET)[0]
        scan_limit = struct.unpack_from("<H", code, anchor + SCAN_LIMIT_OFFSET)[0]
        if not patched:
            self.get_value = bl_target(code, self.setup + 0x0C, self.address + 0x0C)
            if (
                self.get_value is None
                or setup != original_setup(self.address, self.get_value)
                or (form_argument, scan_limit) != (LOAD_FORM, SCAN_LIMIT)
            ):
                raise unsupported()
            self.member_offset = None
            return
        self.get_value = bl_target(code, self.setup + 0x08, self.address + 0x08)
        first, second = struct.unpack_from("<HH", code, self.setup + 0x14)
        offset = (first & 0xFF) + (second & 0xFF)
        if (
            self.get_value is None
            or setup != patched_setup(self.address, self.get_value, self.form_index, offset)
            or (form_argument, scan_limit) != (FORM_ZERO, PATCHED_SCAN_LIMIT)
        ):
            raise unsupported()
        self.member_offset = offset

    def _write(self, offset, data):
        start = self.arm9.offset + offset
        self.rom.write(start, start + len(data), data)

    def apply(self, member_offset):
        if not SPECIES_COUNT < member_offset <= MAX_MEMBER_OFFSET:
            raise RuntimeError("Unsupported learnset archive size for the Move Reminder patch.")
        if self.member_offset not in (None, member_offset):
            raise RuntimeError("The Move Reminder already reads another learnset layout.")
        self._write(self.anchor, PATCHED_REMINDER_ALLOC)
        self._write(self.setup, patched_setup(self.address, self.get_value, self.form_index, member_offset))
        self._write(self.anchor + FORM_ARGUMENT_OFFSET, struct.pack("<H", FORM_ZERO))
        self._write(self.anchor + SCAN_LIMIT_OFFSET, struct.pack("<H", PATCHED_SCAN_LIMIT))
        self.member_offset = member_offset


def parse_learnset(data):
    entries = []
    for (value,) in struct.iter_unpack("<H", data[: len(data) // 2 * 2]):
        if value == LEARNSET_SENTINEL:
            return entries
        level, move = value >> MOVE_BITS, value & MOVE_MASK
        if not move or level > MAX_LEVEL:
            raise RuntimeError("A learnset contains an unsupported entry.")
        entries.append((level, move))
    raise RuntimeError("A learnset has no terminator.")


def encode_learnset(entries):
    data = b"".join(struct.pack("<H", level << MOVE_BITS | move) for level, move in entries)
    data += struct.pack("<H", LEARNSET_SENTINEL)
    return data + bytes(-len(data) % 4)


def ancestors(paths, species):
    """Every (randomized) pre-evolution of a species, however many evolutions away."""
    parents = defaultdict(set)
    for source, entries in paths.items():
        for *_, target in entries:
            parents[target].add(source)
    found, frontier = set(), [species]
    while frontier:
        frontier = [parent for child in frontier for parent in sorted(parents[child]) if parent not in found]
        found.update(frontier)
    found.discard(species)
    return found


def reminder_learnsets(learnsets, paths):
    """Reminder-only lists: a species' own level-up moves plus every pre-evolution move it lacks, at the lowest
    level a pre-evolution learns it."""
    updated = {}
    for species, own in learnsets.items():
        known = {move for _, move in own}
        extra = {}
        for ancestor in ancestors(paths, species):
            for level, move in learnsets.get(ancestor, []):
                if move not in known:
                    extra[move] = min(level, extra.get(move, level))
        if extra:
            entries = own + sorted((level, move) for move, level in extra.items())
            updated[species] = sorted(entries, key=lambda entry: entry[0])
    return updated


def build_narc(original, files):
    """Rebuild a NARC with new members, keeping its header and name table."""
    if original[:4] != b"NARC" or original[16:20] != b"BTAF":
        raise RuntimeError("The learnset archive is not a supported NARC.")
    header_size = struct.unpack_from("<H", original, 12)[0]
    btaf_size = struct.unpack_from("<I", original, header_size + 4)[0]
    btnf = header_size + btaf_size
    if original[btnf : btnf + 4] != b"BTNF":
        raise RuntimeError("The learnset archive is not a supported NARC.")
    names = original[btnf : btnf + struct.unpack_from("<I", original, btnf + 4)[0]]
    table, data = bytearray(), bytearray()
    for member in files:
        table += struct.pack("<II", len(data), len(data) + len(member))
        data += member + bytes(-len(member) % 4)
    btaf = b"BTAF" + struct.pack("<IHH", 12 + len(table), len(files), 0) + table
    gmif = b"GMIF" + struct.pack("<I", 8 + len(data)) + data
    body = btaf + names + gmif
    return original[:8] + struct.pack("<I", header_size + len(body)) + original[12:header_size] + body


def write_rom_file(rom, span, data):
    """Replace the ROM file at `span`, moving it to the ROM's unused padding when it grew."""
    fat, fat_size = struct.unpack_from("<II", rom.data, 0x48)
    entries = [
        entry for entry in range(fat, fat + fat_size, 8) if struct.unpack_from("<II", rom.data, entry) == tuple(span)
    ]
    if len(entries) != 1:
        raise RuntimeError("The archive was not found in the ROM file table.")
    start, end = span
    if len(data) > end - start:
        used = struct.unpack_from("<I", rom.data, 0x80)[0]
        last_file = max(struct.unpack_from("<I", rom.data, entry + 4)[0] for entry in range(fat, fat + fat_size, 8))
        if used < last_file or used > len(rom.data):
            raise RuntimeError("Unexpected NDS used-ROM size.")
        start = (used + 0x1FF) & ~0x1FF
        if start + len(data) > len(rom.data) or any(byte != 0xFF for byte in rom.data[start : start + len(data)]):
            raise RuntimeError("Not enough unused ROM padding for the larger archive.")
        rom.write(0x80, 0x84, struct.pack("<I", start + len(data)))
    rom.write(start, start + len(data), data)
    rom.write(entries[0], entries[0] + 8, struct.pack("<II", start, start + len(data)))


def inherit_learnsets(pm, rom, log):
    species = set(range(1, SPECIES_COUNT + 1))
    _, evolutions = pm._open_narc(rom, EVOLUTION_ARCHIVE, log)
    _, paths = read_evolution_records(evolutions, species)
    patch = MoveReminderPatch(rom)
    span, archive = pm._open_narc(rom, LEARNSET_ARCHIVE, log)
    count = patch.member_offset or archive.num_files
    if count <= SPECIES_COUNT or archive.num_files != (2 * count if patch.member_offset else count):
        raise RuntimeError("Unexpected learnset archive layout.")
    level_up = [bytes(archive.get(index)) for index in range(count)]
    learnsets = {index: parse_learnset(level_up[index]) for index in species}
    updated = reminder_learnsets(learnsets, paths)
    largest = max((len(entries) for entries in updated.values()), default=0)
    if largest > REMINDER_CAPACITY:
        raise RuntimeError(
            f"A Move Reminder list would need {largest} moves (at most {REMINDER_CAPACITY}); no move is dropped, "
            "so use another seed."
        )
    if updated or patch.member_offset:
        reminder = [encode_learnset(updated[index]) if index in updated else level_up[index] for index in range(count)]
        # Level-up members are kept byte for byte; only the reminder-only lists after them change.
        files = level_up + reminder
        if files != [bytes(archive.get(index)) for index in range(archive.num_files)]:
            write_rom_file(rom, span, build_narc(bytes(rom.data[span[0] : span[1]]), files))
        patch.apply(count)
    added = sum(len(updated[index]) - len(learnsets[index]) for index in updated)
    return (
        f"Move Reminder: {len(updated)} species can relearn all {added} of their pre-evolution moves "
        f"(longest list {largest} moves); level-up learnsets are unchanged."
    )
