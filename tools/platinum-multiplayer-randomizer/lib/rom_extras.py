"""NuzTracker extras applied on top of a Project PM randomized Platinum Multiplayer ROM."""

import hashlib
import random
import re
import struct
from dataclasses import dataclass

TYPE_NAMES = [
    "Normal", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost", "Steel",
    "Fairy", "Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon", "Dark",
]

ITEM_NAME_BANK = 392
ITEM_SCRIPT_FILE = 404
ITEM_SCRIPT_SKIP = {25, 238, 321, 325, 326}
SCRIPT_LIST_TERMINATOR = 0xFD13
SCRIPT_SET_VAR = 0x28
ITEM_VARIABLE = 0x8008
SCRIPT_START_TRAINER_BATTLE = 0xE5
TRAINER_SCRIPT_BASE = 2999

MASTER_BALL = 1
MAIL = set(range(137, 149))
STONES = [80, 81, 82, 83, 84, 85, 107, 108, 109, 490]
TMS = list(range(328, 420))
HELD_ITEMS = list(range(213, 328))
SHOP_POOL = [
    *range(2, 17),
    *range(17, 50),
    *range(51, 55),
    *range(55, 63),
    *range(76, 80),
    *range(470, 488),
]
FIELD_POOL = [
    *range(2, 63),
    *range(76, 93),
    *range(107, 111),
    *range(149, 213),
    *HELD_ITEMS,
    *range(470, 488),
    490,
]
REPLACEABLE_ITEMS = set(FIELD_POOL) | {MASTER_BALL, *range(63, 76), *range(93, 107)}

CITY_MARTS = (
    (9, "Jubilife"),
    (10, "Oreburgh"),
    (11, "Floaroma"),
    (12, "Eterna"),
    (14, "Hearthome"),
    (15, "Solaceon"),
    (16, "Pastoria"),
    (23, "Celestic"),
    (24, "Snowpoint"),
    (25, "Canalave"),
    (26, "Sunyshore"),
    (27, "Pokemon League"),
)
MART_COUNT = 29
MART_ANCHORS = {
    13: (36, 34, 35, 37),
    17: (17, 26, 25, 24, 28, 18, 22, 19, 20, 21, 27),
    19: tuple(range(470, 488)),
    28: (159, 160, 161, 162, 163),
}
SHOP_OVERLAY_ID = 7
SHOP_OVERLAY_RAM = 0x0226AA80
SHOP_OVERLAY_SIZE = 0x5F40
SHOP_OVERLAY_BSS = 0x20
SHOP_OVERLAY_SHA256 = "5dee9a6506d12f161778682f4bb8cca5c70b43347961c665fe326332f1b5b078"
SHOP_STOCK_MAGIC = b"NZMART01"
SHOP_STOCK_HEADER = struct.Struct("<8sIIHH")
MIN_SHOP_STOCK = 8
MAX_SHOP_STOCK = 32

MAP_HEADER_SIZE = 24
GYMS = [
    ("Oreburgh Gym", [47]),
    ("Eterna Gym", [67]),
    ("Hearthome Gym", [88, 89, 90, 91]),
    ("Veilstone Gym", [133]),
    ("Pastoria Gym", [122]),
    ("Canalave Gym", [35]),
    ("Snowpoint Gym", [167]),
    ("Sunyshore Gym", [154, 155, 156]),
]
ELITE_FOUR = [
    ("Aaron's room", [177]),
    ("Bertha's room", [179]),
    ("Flint's room", [181]),
    ("Lucian's room", [183]),
]
# Trainer class -> vanilla specialty type.
BOSS_CLASS_TYPES = {
    62: 5, 74: 12, 77: 7, 76: 1, 75: 11, 64: 8, 78: 15, 79: 13,
    65: 6, 66: 4, 67: 10, 68: 14,
}


def u16(data, offset):
    return struct.unpack_from("<H", data, offset)[0]


def u32(data, offset):
    return struct.unpack_from("<I", data, offset)[0]


class Arm9:
    def __init__(self, rom):
        self.rom = rom
        self.offset = u32(rom.data, 0x20)
        self.ram = u32(rom.data, 0x28)
        self.size = u32(rom.data, 0x2C)

    def bytes(self):
        return bytes(self.rom.data[self.offset : self.offset + self.size])

    def to_rom(self, pointer):
        return pointer - self.ram + self.offset

    def contains_pointer(self, pointer):
        return self.ram <= pointer < self.ram + self.size


def read_message(bank, index):
    count = u16(bank, 0)
    if index >= count:
        return None
    key = (u16(bank, 2) * 0x2FD * (index + 1)) & 0xFFFF
    mask = (key << 16) | key
    offset = u32(bank, 4 + index * 8) ^ mask
    length = u32(bank, 8 + index * 8) ^ mask
    if length > 4096 or offset + length * 2 > len(bank):
        return None
    seed = (0x91BD3 * (index + 1)) & 0xFFFF
    words = []
    for cursor in range(length):
        words.append(u16(bank, offset + cursor * 2) ^ seed)
        seed = (seed + 0x493D) & 0xFFFF
    if words and words[0] == 0xF100:
        characters, bits, available = [], 0, 0
        for word in words[1:]:
            bits |= word << available
            available += 16
            while available >= 9:
                code = bits & 0x1FF
                bits >>= 9
                available -= 9
                if code == 0x1FF:
                    break
                characters.append(code)
        words = characters
    text = []
    punctuation = {
        0x1A8: "$", 0x1AB: "!", 0x1AC: "?", 0x1AD: ",", 0x1AE: ".", 0x1AF: "\u2026", 0x1B1: "/", 0x1B2: "'",
        0x1B3: "'", 0x1B9: "(", 0x1BA: ")", 0x1BB: "\u2642", 0x1BC: "\u2640", 0x1BD: "+", 0x1BE: "-", 0x1BF: "*",
        0x1C0: "#", 0x1C1: "=", 0x1C2: "&", 0x1C3: "~", 0x1C4: ":", 0x1C5: ";", 0x1DE: " ",
    }
    for code in words:
        if code == 0xFFFF:
            break
        if 0x121 <= code <= 0x12A:
            text.append(chr(code - 0x121 + 48))
        elif 0x12B <= code <= 0x144:
            text.append(chr(code - 0x12B + 65))
        elif 0x145 <= code <= 0x15E:
            text.append(chr(code - 0x145 + 97))
        elif 0x15F <= code <= 0x19E:
            text.append(chr(code - 0x15F + 0xC0))
        elif code in punctuation:
            text.append(punctuation[code])
        else:
            text.append("?")
    return "".join(text).strip() or None


class ItemCatalog:
    def __init__(self, pm, rom, log):
        _, messages = pm._open_narc(rom, "msgdata/pl_msg.narc", log)
        _, item_data = pm._open_narc(rom, "itemtool/itemdata/pl_item_data.narc", log)
        bank = messages.get(ITEM_NAME_BANK)
        self.names = {}
        self.prices = {}
        for item in range(1, u16(bank, 0)):
            self.names[item] = read_message(bank, item) or f"#{item}"
            data_index = item if item < 113 else item - 22
            if data_index < item_data.num_files:
                self.prices[item] = u16(item_data.get(data_index), 0)

    def name(self, item):
        return self.names.get(item, f"#{item}")

    def is_real(self, item):
        return item in self.names and "???" not in self.names[item]

    def sellable(self, item):
        return self.is_real(item) and self.prices.get(item, 0) > 0


TM_MODES = {"keep", "random"}
TM_SET = frozenset(TMS)
GIFT_ITEM_SETVAR = re.compile(rb"\x28\x00\x04\x80")
SAVE_BLOCK_SIZE = 0xCF2C
SAVE_BACKUP_OFFSET = 0x40000
SAVE_TM_POCKET = 0x98C
SAVE_TM_SLOTS = 100


def field_pool(items, tm_mode):
    pool = FIELD_POOL + TMS if tm_mode == "random" else FIELD_POOL
    return [item for item in pool if items.is_real(item)]


class FieldTms:
    """TMs still free for field items.

    Platinum Multiplayer stores an obtained TM as 99 copies (reusable TMs), so the bag refuses a TM the
    player already owns: each TM may be placed once, never on top of a TM an NPC gives.
    """

    def __init__(self, items, unavailable=()):
        blocked = set(unavailable)
        self.free = {tm for tm in TMS if items.is_real(tm) and tm not in blocked}

    def take(self, rng):
        if not self.free:
            return None
        tm = rng.choice(sorted(self.free))
        self.free.discard(tm)
        return tm

    def claim(self, tm):
        self.free.discard(tm)


def replacement_for(item, rng, pool, tm_mode, tms):
    if item in TM_SET and tm_mode != "random":
        # Keep mode pools hold no TM: once every TM is placed, the slot gets another item.
        return tms.take(rng) or rng.choice(pool)
    if item in TM_SET or item in REPLACEABLE_ITEMS:
        replacement = rng.choice([choice for choice in pool if choice not in TM_SET or choice in tms.free])
        tms.claim(replacement)
        return replacement
    return item


def tm_note(tm_mode):
    note = "TMs mixed with other items" if tm_mode == "random" else "TMs stay TMs"
    return f"{note}, each TM placed once"


def gift_tms(pm, rom, log):
    """TMs NPC scripts hand out: they load the item into 0x8004 before the shared give-item script."""
    _, narc = pm._open_narc(rom, "fielddata/script/scr_seq.narc", log)
    found = set()
    for index in range(narc.num_files):
        if index == ITEM_SCRIPT_FILE:
            continue
        data = narc.get(index)
        for match in GIFT_ITEM_SETVAR.finditer(data):
            if match.start() + 6 <= len(data) and u16(data, match.start() + 4) in TM_SET:
                found.add(u16(data, match.start() + 4))
    return found


def owned_tms_from_save(save):
    """TMs in the TM pocket of the most recent block of a Platinum save file."""
    blocks = []
    for base in (0, SAVE_BACKUP_OFFSET):
        footer = base + SAVE_BLOCK_SIZE - 0x14
        if footer + 12 > len(save) or u32(save, footer + 8) != SAVE_BLOCK_SIZE:
            continue
        blocks.append((u32(save, footer), base))
    if not blocks:
        raise ValueError("This file is not a Platinum save.")
    _, base = max(blocks)
    owned = set()
    for slot in range(SAVE_TM_SLOTS):
        item, quantity = struct.unpack_from("<HH", save, base + SAVE_TM_POCKET + slot * 4)
        if item in TM_SET and quantity:
            owned.add(item)
    return owned


def item_ball_scripts(data):
    """Offsets of the item ball scripts, at the 'setvar 0x8008, item' command."""
    cursor, index = 0, 0
    while u16(data, cursor) != SCRIPT_LIST_TERMINATOR:
        script = u32(data, cursor) + cursor + 4
        cursor += 4
        index += 1
        if index - 1 in ITEM_SCRIPT_SKIP:
            continue
        if u16(data, script) == SCRIPT_SET_VAR and u16(data, script + 2) == ITEM_VARIABLE:
            yield script


def randomize_field_items(pm, rom, rng, items, log, tm_mode="keep", tms=None):
    tms = tms or FieldTms(items)
    path = "fielddata/script/scr_seq.narc"
    span, narc = pm._open_narc(rom, path, log)
    data = bytearray(narc.get(ITEM_SCRIPT_FILE))
    pool = field_pool(items, tm_mode)
    found, changed = 0, 0
    for script in item_ball_scripts(data):
        found += 1
        item = u16(data, script + 4)
        replacement = replacement_for(item, rng, pool, tm_mode, tms)
        if replacement != item:
            struct.pack_into("<H", data, script + 4, replacement)
            changed += 1
    if found < 200:
        raise RuntimeError(f"Only {found} item ball scripts were found: unexpected ROM layout.")
    narc.put(ITEM_SCRIPT_FILE, bytes(data))
    if not pm._save_narc(rom, span, narc, path, log):
        raise RuntimeError("Could not save the item ball scripts.")
    return f"Item balls: {changed}/{found} randomized ({tm_note(tm_mode)}, HMs and key items untouched)."


HIDDEN_ENTRY = re.compile(rb"(?s)..[\x01-\xff].\x00\x00\x00\x00..[\x01-\xff].\x00\x00\x01\x00")


def find_hidden_items(arm9):
    code = arm9.bytes()
    for match in HIDDEN_ENTRY.finditer(code):
        start = match.start()
        count = 0
        scripts = set()
        while start + count * 8 + 8 <= len(code):
            entry = start + count * 8
            script = u16(code, entry + 6)
            if code[entry + 2] == 0 or u16(code, entry + 4) != 0 or script >= 1024 or script in scripts:
                break
            if not 0 < u16(code, entry) < 600:
                break
            scripts.add(script)
            count += 1
        if count >= 200:
            return arm9.offset + start, count
    raise RuntimeError("The hidden item table was not found.")


def randomize_hidden_items(rom, rng, items, tm_mode="keep", tms=None):
    tms = tms or FieldTms(items)
    start, count = find_hidden_items(Arm9(rom))
    pool = field_pool(items, tm_mode)
    changed = 0
    for index in range(count):
        entry = start + index * 8
        item = u16(rom.data, entry)
        replacement = replacement_for(item, rng, pool, tm_mode, tms)
        if replacement != item:
            rom.write(entry, entry + 2, struct.pack("<H", replacement))
            changed += 1
    return f"Hidden items: {changed}/{count} randomized ({tm_note(tm_mode)})."


def plan_tm_dedupe(placed, reserved, items, rng):
    """New items for field TMs that would not fit in the bag.

    `placed` lists the field items in order; a TM is replaced when it is reserved (NPC gift or already
    owned by a player) or when an earlier slot holds it. Replacements are unused TMs, then other field items.
    """
    tms = FieldTms(items, set(reserved) | set(placed))
    others = field_pool(items, "keep")
    kept, plan = set(), {}
    for slot, item in enumerate(placed):
        if item not in TM_SET:
            continue
        if item in reserved or item in kept:
            plan[slot] = tms.take(rng) or rng.choice(others)
        else:
            kept.add(item)
    return plan


def dedupe_field_tms(pm, rom, rng, items, log, owned=()):
    """Fix an already randomized ROM: every field TM becomes unique and distinct from NPC and owned TMs."""
    path = "fielddata/script/scr_seq.narc"
    span, narc = pm._open_narc(rom, path, log)
    data = bytearray(narc.get(ITEM_SCRIPT_FILE))
    balls = list(item_ball_scripts(data))
    start, count = find_hidden_items(Arm9(rom))
    hidden = [start + index * 8 for index in range(count)]
    placed = [u16(data, script + 4) for script in balls] + [u16(rom.data, entry) for entry in hidden]
    gifts = gift_tms(pm, rom, log)
    plan = plan_tm_dedupe(placed, gifts | set(owned), items, rng)
    for slot, replacement in plan.items():
        if slot < len(balls):
            struct.pack_into("<H", data, balls[slot] + 4, replacement)
        else:
            entry = hidden[slot - len(balls)]
            rom.write(entry, entry + 2, struct.pack("<H", replacement))
    narc.put(ITEM_SCRIPT_FILE, bytes(data))
    if not pm._save_narc(rom, span, narc, path, log):
        raise RuntimeError("Could not save the item ball scripts.")
    return (
        f"Field TMs: {len(plan)} duplicate(s) replaced out of {sum(item in TM_SET for item in placed)} "
        f"({len(gifts)} NPC TMs and {len(set(owned))} owned TMs avoided)."
    )


def read_item_list(rom, offset, limit=40, end=None):
    result = []
    end = len(rom.data) if end is None else min(end, len(rom.data))
    while len(result) <= limit and 0 <= offset and offset + len(result) * 2 + 2 <= end:
        item = u16(rom.data, offset + len(result) * 2)
        if item == 0xFFFF:
            return result
        if len(result) == limit or not 0 < item < 600:
            return None
        result.append(item)
    return None


class ShopOverlay:
    def __init__(self, rom):
        data = rom.data
        self.rom = rom
        self.fat, fat_size = u32(data, 0x48), u32(data, 0x4C)
        self.table, self.table_size = u32(data, 0x50), u32(data, 0x54)
        if (
            fat_size % 8
            or self.table_size % 32
            or self.fat + fat_size > len(data)
            or self.table + self.table_size > len(data)
        ):
            raise RuntimeError("Invalid NDS file or overlay table.")
        entries = [
            entry
            for entry in range(self.table, self.table + self.table_size, 32)
            if u32(data, entry) == SHOP_OVERLAY_ID
        ]
        if len(entries) != 1:
            raise RuntimeError(f"Expected one shop overlay, found {len(entries)}.")
        self.entry = entries[0]
        self.ram = u32(data, self.entry + 4)
        self.size = u32(data, self.entry + 8)
        self.bss = u32(data, self.entry + 12)
        file_id = u32(data, self.entry + 24)
        if file_id >= fat_size // 8 or data[self.entry + 31] & 1:
            raise RuntimeError("The shop overlay is compressed or has an invalid file ID.")
        self.file_entry = self.fat + file_id * 8
        self.start, self.end = u32(data, self.file_entry), u32(data, self.file_entry + 4)
        if self.start > self.end or self.end > len(data) or self.end - self.start != self.size:
            raise RuntimeError("The shop overlay has an unexpected file size.")
        if self.ram != SHOP_OVERLAY_RAM or self.bss != SHOP_OVERLAY_BSS:
            raise RuntimeError("The shop overlay has an unsupported memory layout.")
        self.metadata = self._read_metadata()
        original_size = self.metadata[0] if self.metadata else self.size
        if original_size != SHOP_OVERLAY_SIZE:
            raise RuntimeError("The shop overlay has an unsupported original size.")
        original = bytes(data[self.start : self.start + original_size])
        if hashlib.sha256(original).hexdigest() != SHOP_OVERLAY_SHA256:
            raise RuntimeError("The shop overlay does not match the supported Platinum Multiplayer version.")

    def _read_metadata(self):
        image = bytes(self.rom.data[self.start : self.end])
        marker = image.find(SHOP_STOCK_MAGIC)
        if marker < 0:
            return None
        if image.find(SHOP_STOCK_MAGIC, marker + 1) >= 0 or marker + SHOP_STOCK_HEADER.size > len(image):
            raise RuntimeError("Invalid expanded shop stock metadata.")
        _, original_size, original_bss, count, stock_size = SHOP_STOCK_HEADER.unpack_from(image, marker)
        expected_size = marker + SHOP_STOCK_HEADER.size + count * (stock_size + 1) * 2
        if (
            marker != original_size + original_bss
            or original_bss != self.bss
            or count != len(CITY_MARTS)
            or not MIN_SHOP_STOCK <= stock_size <= MAX_SHOP_STOCK
            or expected_size != len(image)
            or any(image[original_size:marker])
        ):
            raise RuntimeError("Invalid expanded shop stock layout.")
        return original_size, marker, stock_size

    def stock_offset(self, pointer, city_index):
        if not self.metadata or city_index is None:
            return None
        _, marker, stock_size = self.metadata
        relative = marker + SHOP_STOCK_HEADER.size + city_index * (stock_size + 1) * 2
        if pointer != self.ram + relative:
            return None
        return self.start + relative


def find_mart_table(arm9, rom):
    code = arm9.bytes()
    overlay = ShopOverlay(rom)
    city_indices = {index: position for position, (index, _) in enumerate(CITY_MARTS)}
    anchor_index = 13
    anchor = struct.pack("<" + "H" * (len(MART_ANCHORS[anchor_index]) + 1), *MART_ANCHORS[anchor_index], 0xFFFF)
    candidates = []
    stock_position = code.find(anchor)
    while stock_position >= 0:
        pointer = struct.pack("<I", arm9.ram + stock_position)
        reference = code.find(pointer)
        while reference >= 0:
            start = reference - anchor_index * 4
            if start >= 0 and start % 4 == 0 and start + MART_COUNT * 4 <= len(code):
                lists = []
                for index in range(MART_COUNT):
                    address = u32(code, start + index * 4)
                    if arm9.contains_pointer(address) and not address & 1:
                        offset, end, expanded = arm9.to_rom(address), arm9.offset + arm9.size, False
                    else:
                        offset = overlay.stock_offset(address, city_indices.get(index))
                        end = overlay.end
                        expanded = True
                    if offset is None:
                        break
                    stock = read_item_list(rom, offset, end=end)
                    if (
                        not stock
                        or (expanded and len(stock) != overlay.metadata[2])
                        or (index in MART_ANCHORS and tuple(stock) != MART_ANCHORS[index])
                    ):
                        break
                    lists.append((arm9.offset + start + index * 4, offset, stock))
                if len(lists) == MART_COUNT:
                    candidates.append(lists)
            reference = code.find(pointer, reference + 1)
        stock_position = code.find(anchor, stock_position + 1)
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one supported Poke Mart stock table, found {len(candidates)}.")
    return candidates[0]


def validate_shop_stock_size(stock_size):
    if type(stock_size) is not int or not MIN_SHOP_STOCK <= stock_size <= MAX_SHOP_STOCK:
        raise ValueError(f"extras.specialtyClerkStockSize must be an integer from {MIN_SHOP_STOCK} to {MAX_SHOP_STOCK}.")


def shop_item_pool(items, include_held_items):
    unavailable_stones = [item for item in STONES if not items.sellable(item)]
    if unavailable_stones:
        raise RuntimeError(f"Evolution stones are missing or cannot be sold: {unavailable_stones}.")
    pool = [item for item in SHOP_POOL if items.sellable(item)]
    if include_held_items:
        pool += [item for item in HELD_ITEMS if items.sellable(item)]
    return list(dict.fromkeys(pool + STONES))


def extend_shop_stocks(stocks, stock_size, pool, rng):
    validate_shop_stock_size(stock_size)
    result = []
    for stock in stocks:
        if len(stock) > stock_size:
            raise ValueError("The requested shop stock size would remove existing items.")
        next_stock = list(stock)
        if not any(item in STONES for item in next_stock):
            if len(next_stock) == stock_size:
                raise ValueError("Cannot guarantee an evolution stone without removing an existing item.")
            stones = [item for item in STONES if item in pool]
            if not stones:
                raise RuntimeError("No sellable evolution stones are available.")
            next_stock.append(rng.choice(stones))
        candidates = [item for item in pool if item not in next_stock]
        additional = stock_size - len(next_stock)
        if len(candidates) < additional:
            raise RuntimeError("Not enough distinct sellable items to expand the specialty shops.")
        result.append(next_stock + rng.sample(candidates, additional))
    return result


def write_expanded_shop_stocks(rom, lists, stocks, stock_size):
    validate_shop_stock_size(stock_size)
    if len(stocks) != len(CITY_MARTS) or any(len(stock) != stock_size for stock in stocks):
        raise ValueError("Each specialty shop must have the requested number of items.")
    overlay = ShopOverlay(rom)
    original_size = overlay.metadata[0] if overlay.metadata else overlay.size
    original = bytes(rom.data[overlay.start : overlay.start + original_size])
    header = SHOP_STOCK_HEADER.pack(SHOP_STOCK_MAGIC, original_size, overlay.bss, len(stocks), stock_size)
    payload = b"".join(struct.pack("<" + "H" * (stock_size + 1), *stock, 0xFFFF) for stock in stocks)
    # The loader clears BSS after the image; zero-fill the original BSS at its linked addresses.
    image = original + bytes(overlay.bss) + header + payload
    old_end = overlay.ram + original_size + overlay.bss
    new_end = overlay.ram + len(image) + overlay.bss
    if new_end > 0x02400000:
        raise RuntimeError("Expanded shop overlay exceeds Nintendo DS main memory.")
    for entry in range(overlay.table, overlay.table + overlay.table_size, 32):
        if entry == overlay.entry:
            continue
        start = u32(rom.data, entry + 4)
        end = start + u32(rom.data, entry + 8) + u32(rom.data, entry + 12)
        if start < new_end and end > overlay.ram and not (start < old_end and end > overlay.ram):
            raise RuntimeError("Expanded shop overlay would overlap another overlay.")

    if overlay.metadata and len(image) <= overlay.end - overlay.start:
        start = overlay.start
    else:
        fat_size = u32(rom.data, 0x4C)
        last_file = max(u32(rom.data, offset + 4) for offset in range(overlay.fat, overlay.fat + fat_size, 8))
        used = u32(rom.data, 0x80)
        if used < last_file or used > len(rom.data):
            raise RuntimeError("Unexpected NDS used-ROM size.")
        start = (used + 0x1FF) & ~0x1FF
        end = start + len(image)
        if end > len(rom.data) or any(byte != 0xFF for byte in rom.data[start:end]):
            raise RuntimeError("Not enough unused ROM padding for the expanded shop overlay.")

    rom.write(start, start + len(image), image)
    rom.write(overlay.file_entry, overlay.file_entry + 8, struct.pack("<II", start, start + len(image)))
    rom.write(overlay.entry + 8, overlay.entry + 12, struct.pack("<I", len(image)))
    used = max(u32(rom.data, 0x80), start + len(image))
    rom.write(0x80, 0x84, struct.pack("<I", used))
    first_stock = overlay.ram + original_size + overlay.bss + SHOP_STOCK_HEADER.size
    for position, (index, _) in enumerate(CITY_MARTS):
        pointer_offset = lists[index][0]
        pointer = first_stock + position * (stock_size + 1) * 2
        rom.write(pointer_offset, pointer_offset + 4, struct.pack("<I", pointer))


def format_shop_report(items, before, after):
    lines = []
    for (_, name), old_stock, new_stock in zip(CITY_MARTS, before, after):
        lines.append(
            f"  {name}: {', '.join(items.name(item) for item in old_stock)}"
            f"\n    -> {', '.join(items.name(item) for item in new_stock)}"
        )
    return "\n".join(lines)


def randomize_marts(rom, rng, items, include_held_items, stock_size=None):
    lists = find_mart_table(Arm9(rom), rom)
    pool = shop_item_pool(items, include_held_items)
    before = [lists[index][2] for index, _ in CITY_MARTS]
    if len(before) < len(STONES):
        raise RuntimeError("Not enough specialty clerks to place every evolution stone.")
    stones = rng.sample(STONES, len(STONES))
    after = []
    for stock in before:
        guaranteed_stone = stones.pop() if stones else rng.choice(STONES)
        guaranteed_slot = next((index for index, item in enumerate(stock) if item in MAIL), 0)
        used, replacement_stock = set(), []
        for index in range(len(stock)):
            if index == guaranteed_slot:
                replacement = guaranteed_stone
            else:
                candidates = [candidate for candidate in pool if candidate not in used and candidate != guaranteed_stone]
                if not candidates:
                    raise RuntimeError("Not enough distinct sellable items to randomize the specialty shops.")
                replacement = rng.choice(candidates)
            used.add(replacement)
            replacement_stock.append(replacement)
        after.append(replacement_stock)
    if stock_size is not None:
        after = extend_shop_stocks(after, stock_size, pool, rng)
        write_expanded_shop_stocks(rom, lists, after, stock_size)
    else:
        for (index, _), stock in zip(CITY_MARTS, after):
            offset = lists[index][1]
            rom.write(offset, offset + len(stock) * 2, struct.pack("<" + "H" * len(stock), *stock))
    return (
        f"Specialty clerks: {len(CITY_MARTS)} Poke Marts, at least one evolution stone each; "
        "every evolution stone sold at least once.\n"
        + format_shop_report(items, before, after)
    )


def expand_existing_marts(rom, rng, items, include_held_items, stock_size):
    validate_shop_stock_size(stock_size)
    lists = find_mart_table(Arm9(rom), rom)
    before = [lists[index][2] for index, _ in CITY_MARTS]
    if not set(STONES).issubset(item for stock in before for item in stock):
        raise RuntimeError("Existing specialty stocks do not contain every evolution stone.")
    pool = shop_item_pool(items, include_held_items)
    after = extend_shop_stocks(before, stock_size, pool, rng)
    write_expanded_shop_stocks(rom, lists, after, stock_size)
    return (
        f"Specialty clerks: {len(CITY_MARTS)} Poke Marts expanded to {stock_size} items; "
        "existing stock preserved and at least one evolution stone in each shop.\n"
        + format_shop_report(items, before, after)
    )


def rerandomize_existing_marts(rom, rng, items, include_held_items, stock_size):
    validate_shop_stock_size(stock_size)
    lists = find_mart_table(Arm9(rom), rom)
    before = [lists[index][2] for index, _ in CITY_MARTS]
    pool = shop_item_pool(items, include_held_items)
    guaranteed = []
    for stock in before:
        stone = next((item for item in stock if item in STONES), None)
        guaranteed.append([stone if stone is not None else rng.choice(STONES)])
    if not set(STONES).issubset(stock[0] for stock in guaranteed):
        raise RuntimeError("Existing guaranteed stones do not cover every evolution stone.")
    after = extend_shop_stocks(guaranteed, stock_size, pool, rng)
    write_expanded_shop_stocks(rom, lists, after, stock_size)
    return (
        f"Specialty clerks: {len(CITY_MARTS)} Poke Marts with {stock_size} items each; "
        "one evolution stone guaranteed and remaining items randomized.\n"
        + format_shop_report(items, before, after)
    )


def find_map_headers(rom, zone_events, scripts):
    code, start, count = map_header_table(rom, zone_events, scripts)
    return [
        (u16(code, start + i * MAP_HEADER_SIZE + 4), u16(code, start + i * MAP_HEADER_SIZE + 16)) for i in range(count)
    ]


def map_text_banks(rom, zone_events, scripts):
    """Message bank of every map, from the map header table."""
    code, start, count = map_header_table(rom, zone_events, scripts)
    return [u16(code, start + i * MAP_HEADER_SIZE + 8) for i in range(count)]


def map_header_table(rom, zone_events, scripts):
    arm9 = Arm9(rom)
    code = arm9.bytes()
    for start in range(0, len(code) - MAP_HEADER_SIZE * 500, 4):
        count = 0
        while True:
            entry = start + count * MAP_HEADER_SIZE
            if entry + MAP_HEADER_SIZE > len(code):
                break
            if (
                u16(code, entry + 16) >= zone_events.num_files
                or u16(code, entry + 4) >= scripts.num_files
                or code[entry + 20] > 40
            ):
                break
            count += 1
        if count >= 500:
            return code, start, count
    raise RuntimeError("The map header table was not found.")


def map_trainers(zone_event, script, trainer_count):
    found = []
    cursor = 4 + u32(zone_event, 0) * 20
    for index in range(u32(zone_event, cursor)):
        obj = cursor + 4 + index * 32
        trainer_type, script_id = u16(zone_event, obj + 6), u16(zone_event, obj + 10)
        trainer = script_id - TRAINER_SCRIPT_BASE
        if trainer_type and 0 < trainer < trainer_count:
            found.append(trainer)
    for index in range(len(script) - 5):
        if script[index] == SCRIPT_START_TRAINER_BATTLE and script[index + 1] == 0:
            for trainer in struct.unpack_from("<HH", script, index + 2):
                if 0 < trainer < trainer_count:
                    found.append(trainer)
    return found


def party_stride(flags):
    # Platinum Multiplayer party entries: 16 bytes, +8 with moves (bit 0), +4 with a held item (bit 1).
    # Project PM clears these flags without shrinking the party files, so the file size is not reliable.
    return 16 + (8 if flags & 1 else 0) + (4 if flags & 2 else 0)


class TrainerTeams:
    def __init__(self, pm, rom, log):
        self.pm, self.rom, self.log = pm, rom, log
        self.data_span, self.data = pm._open_narc(rom, "poketool/trainer/trdata.narc", log)
        self.party_span, self.parties = pm._open_narc(rom, "poketool/trainer/trpoke.narc", log)

    def trainer_class(self, trainer):
        return self.data.get(trainer)[1]

    def teams(self, trainer):
        """(party file, size, entry stride) of the normal team and, when present, the hard team."""
        head = self.data.get(trainer)
        result = [(trainer, head[3], party_stride(head[0]))]
        if len(head) >= 28:
            hard_file, hard_size = u16(head, 24), head[26]
            if hard_size and hard_file < self.parties.num_files:
                result.append((hard_file, hard_size, party_stride(head[27])))
        return result

    def species(self, party_file, size, stride):
        body = self.parties.get(party_file)
        return [u16(body, slot * stride + 4) & 1023 for slot in range(size)]

    def set_species(self, party_file, size, stride, species):
        body = bytearray(self.parties.get(party_file))
        if size * stride > len(body):
            raise RuntimeError("Unexpected trainer party layout.")
        for slot, value in enumerate(species):
            struct.pack_into("<H", body, slot * stride + 4, value)
        self.parties.put(party_file, bytes(body))

    def save(self):
        if not self.pm._save_narc(self.rom, self.party_span, self.parties, "poketool/trainer/trpoke.narc", self.log):
            raise RuntimeError("Could not save the trainer parties.")


def themed_species(db, type_id, target_bst, rng, used, allowed):
    pool = [species for species in allowed if type_id in (db[species]["type1"], db[species]["type2"])]
    for tolerance in (0.1, 0.2, 0.3, 0.5, 1.0, 10.0):
        candidates = [
            species for species in pool if species not in used and abs(db[species]["bst"] - target_bst) <= target_bst * tolerance
        ]
        if len(candidates) >= 3 or tolerance == 10.0:
            break
    return rng.choice(candidates or pool)


def group_trainers(headers, zone_events, scripts, teams, maps):
    trainers = []
    for map_id in maps:
        script_file, event_file = headers[map_id]
        for trainer in map_trainers(zone_events.get(event_file), scripts.get(script_file), teams.data.num_files):
            if trainer not in trainers:
                trainers.append(trainer)
    return trainers


def shared_type(db, species_list):
    """The only type shared by every species, or None."""
    common = None
    for species in species_list:
        types = {db[species]["type1"], db[species]["type2"]} if species in db else set()
        common = types if common is None else common & types
    return next(iter(common)) if common and len(common) == 1 else None


def detect_trainer_themes(pm, rom, log):
    """Themes of an already randomized ROM: a group is themed when all its trainers' Pokémon share one type."""
    _, zone_events = pm._open_narc(rom, "fielddata/eventdata/zone_event.narc", log)
    _, scripts = pm._open_narc(rom, "fielddata/script/scr_seq.narc", log)
    headers = find_map_headers(rom, zone_events, scripts)
    teams = TrainerTeams(pm, rom, log)
    db = pm.rand_load_pokemon_db(rom)
    themes = []
    for (name, maps), is_gym in [*((group, True) for group in GYMS), *((group, False) for group in ELITE_FOUR)]:
        trainers = group_trainers(headers, zone_events, scripts, teams, maps)
        bosses = [trainer for trainer in trainers if teams.trainer_class(trainer) in BOSS_CLASS_TYPES]
        if not bosses:
            continue
        parties = [party for trainer in trainers for party in teams.teams(trainer) if party[1]]
        species = [pick for party_file, size, stride in parties for pick in teams.species(party_file, size, stride)]
        type_id = shared_type(db, species)
        if type_id is None:
            # ROMs themed before party strides were read from the trainer flags got their species written
            # at file size / party size; the themed type is the one shared at those positions.
            legacy = [
                pick
                for party_file, size, _ in parties
                for pick in teams.species(party_file, size, len(teams.parties.get(party_file)) // size)
            ]
            type_id = shared_type(db, legacy)
        if type_id is not None:
            original_type = BOSS_CLASS_TYPES[teams.trainer_class(bosses[0])]
            themes.append(TrainerTheme(name, tuple(maps), is_gym, original_type, type_id))
    return themes


def legacy_theme_offsets(size, stride, file_stride):
    """Bytes the old theming wrote in the entries the game reads, other than real species fields."""
    real = {slot * stride + 4 for slot in range(size)}
    return sorted(
        offset
        for offset in (slot * file_stride + 4 for slot in range(size))
        if offset not in real and offset + 2 <= size * stride
    )


def repair_party(body, size, stride, type_id, db, rng, allowed):
    """Clear the old theming's misplaced writes and theme every off-type species; returns (body, replaced)."""
    body = bytearray(body)
    file_stride = len(body) // size
    if file_stride != stride:
        for offset in legacy_theme_offsets(size, stride, file_stride):
            # Fields hit there (entry bytes 0, 8 and 12) are always zero in untouched parties.
            if offset % stride not in (0, 8, 12):
                raise RuntimeError("Unexpected trainer party layout.")
            struct.pack_into("<H", body, offset, 0)
    species = [u16(body, slot * stride + 4) & 1023 for slot in range(size)]
    used, replaced = set(species), 0
    for slot, current in enumerate(species):
        if current in db and type_id in (db[current]["type1"], db[current]["type2"]):
            continue
        target = db[current]["bst"] if current in db else 400
        pick = themed_species(db, type_id, target, rng, used, allowed)
        used.add(pick)
        struct.pack_into("<H", body, slot * stride + 4, pick)
        replaced += 1
    return bytes(body), replaced


def repair_trainer_themes(pm, rom, exclude_legendaries, log):
    """Finish the themed teams of a ROM themed with the old party stride. Reports counts only."""
    themes = detect_trainer_themes(pm, rom, log)
    _, zone_events = pm._open_narc(rom, "fielddata/eventdata/zone_event.narc", log)
    _, scripts = pm._open_narc(rom, "fielddata/script/scr_seq.narc", log)
    headers = find_map_headers(rom, zone_events, scripts)
    teams = TrainerTeams(pm, rom, log)
    db = pm.rand_load_pokemon_db(rom)
    legendaries = set(pm.RAND_LEGENDARIES) if exclude_legendaries else set()
    allowed = [species for species in db if species not in legendaries]
    rng = seeded("theme-repair", hashlib.sha1(bytes(rom.data[: 0x200])).hexdigest())
    parties = replaced = 0
    for theme in themes:
        for trainer in group_trainers(headers, zone_events, scripts, teams, theme.maps):
            for party_file, size, stride in teams.teams(trainer):
                if not size:
                    continue
                body = teams.parties.get(party_file)
                fixed, count = repair_party(body, size, stride, theme.type_id, db, rng, allowed)
                if fixed != bytes(body):
                    teams.parties.put(party_file, fixed)
                    parties += 1
                    replaced += count
    teams.save()
    return f"Themed teams repaired: {len(themes)} gyms / Elite Four rooms, {parties} teams, {replaced} Pokémon replaced."


def theme_trainers(pm, rom, rng, gym_mode, elite_four_mode, exclude_legendaries, log):
    _, zone_events = pm._open_narc(rom, "fielddata/eventdata/zone_event.narc", log)
    _, scripts = pm._open_narc(rom, "fielddata/script/scr_seq.narc", log)
    headers = find_map_headers(rom, zone_events, scripts)
    teams = TrainerTeams(pm, rom, log)
    db = pm.rand_load_pokemon_db(rom)
    legendaries = set(pm.RAND_LEGENDARIES) if exclude_legendaries else set()
    allowed = [species for species in db if species not in legendaries]
    available_types = sorted({db[species][key] for species in db for key in ("type1", "type2")})
    random_types = rng.sample(available_types, len(available_types))
    groups = [(name, maps, gym_mode, True) for name, maps in GYMS] + [
        (name, maps, elite_four_mode, False) for name, maps in ELITE_FOUR
    ]
    lines, themes = [], []
    for name, maps, mode, is_gym in groups:
        if mode == "off":
            continue
        trainers = group_trainers(headers, zone_events, scripts, teams, maps)
        bosses = [trainer for trainer in trainers if teams.trainer_class(trainer) in BOSS_CLASS_TYPES]
        if not bosses:
            lines.append(f"  {name}: skipped (leader not found)")
            continue
        original_type = BOSS_CLASS_TYPES[teams.trainer_class(bosses[0])]
        type_id = original_type if mode == "vanilla" else random_types.pop()
        themes.append(TrainerTheme(name, tuple(maps), is_gym, original_type, type_id))
        details = []
        for trainer in trainers:
            for party_file, size, stride in teams.teams(trainer):
                if not size:
                    continue
                current = teams.species(party_file, size, stride)
                used, themed = set(), []
                for species in current:
                    target = db[species]["bst"] if species in db else 400
                    pick = themed_species(db, type_id, target, rng, used, allowed)
                    used.add(pick)
                    themed.append(pick)
                teams.set_species(party_file, size, stride, themed)
                if trainer in bosses:
                    details.append(", ".join(pm.SPECIES_NAMES[species - 1] for species in themed))
        lines.append(f"  {name} [{TYPE_NAMES[type_id]}] {len(trainers)} trainers - leader: {' | '.join(details)}")
    teams.save()
    return "Type themed gyms / Elite Four:\n" + "\n".join(lines), themes


@dataclass(frozen=True)
class TrainerTheme:
    name: str
    maps: tuple
    is_gym: bool
    original_type: int
    type_id: int


def patch_shiny_rate(pm, rom, one_in):
    """Replaces `cmp r0,#imm; bcs` by `lsrs r0,r0,#k; bne`, shiny when the 16-bit value < 2^k."""
    shift = {128: 9, 64: 10, 32: 11, 16: 12}[one_in]
    hits = pm._shiny_hits(bytes(rom.data))
    if len(hits) != 1:
        raise RuntimeError(f"Expected one shiny check, found {len(hits)}.")
    offset = hits[0]
    if rom.data[offset + 1] != 0x28 or rom.data[offset + 3] != 0xD2:
        raise RuntimeError("Unexpected shiny check instructions.")
    instruction = 0x0800 | (shift << 6)
    rom.write(offset, offset + 4, bytes([instruction & 0xFF, instruction >> 8, rom.data[offset + 2], 0xD1]))
    return f"Shiny odds: 1 in {one_in} (code patch)."


BATTLE_OVERLAY = 16
CATCH_RATE_CHECK = re.compile(rb"(?s)\xff[\x28-\x2f]\x01\xd3[\x00-\x07]\x25.\xe0")
THUMB_NOP = b"\xc0\x46"


def overlay_span(rom, overlay_id):
    data = rom.data
    fat = u32(data, 0x48)
    table, table_size = u32(data, 0x50), u32(data, 0x54)
    for entry in range(table, table + table_size, 32):
        if u32(data, entry) == overlay_id:
            if data[entry + 31] & 1:
                raise RuntimeError(f"Overlay {overlay_id} is compressed: unexpected ROM layout.")
            file_id = u32(data, entry + 24)
            return u32(data, fat + file_id * 8), u32(data, fat + file_id * 8 + 4)
    raise RuntimeError(f"Overlay {overlay_id} was not found.")


def patch_guaranteed_catch(rom):
    """Removes the `bcc` of `if (catchRate >= 255) shakes = 4`, so every ball catches."""
    start, end = overlay_span(rom, BATTLE_OVERLAY)
    hits = [match.start() for match in CATCH_RATE_CHECK.finditer(bytes(rom.data[start:end]))]
    if len(hits) != 1:
        raise RuntimeError(f"Expected one catch rate check, found {len(hits)}.")
    offset = start + hits[0] + 2
    rom.write(offset, offset + 2, THUMB_NOP)
    return "Guaranteed catch: every Poke Ball succeeds (trainer Pokemon still cannot be caught)."


def fix_header_crc(rom):
    crc = 0xFFFF
    for byte in rom.data[:0x15E]:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    rom.write(0x15E, 0x160, struct.pack("<H", crc))


def seeded(label, seed):
    return random.Random(f"nuztracker:{label}:{seed}")
