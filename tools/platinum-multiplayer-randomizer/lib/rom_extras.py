"""NuzTracker extras applied on top of a Project PM randomized Platinum Multiplayer ROM.

Every table is located from the ROM content instead of fixed offsets, and every patch keeps
file sizes unchanged, so the NDS file system never has to be rebuilt.
"""

import random
import re
import struct

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


def field_pool(items, tm_mode):
    pool = FIELD_POOL + TMS if tm_mode == "random" else FIELD_POOL
    return [item for item in pool if items.is_real(item)]


def replacement_for(item, rng, pool, tm_mode):
    if item in TMS:
        return rng.choice(pool if tm_mode == "random" else TMS)
    if item in REPLACEABLE_ITEMS:
        return rng.choice(pool)
    return item


def tm_note(tm_mode):
    return "TMs mixed with other items" if tm_mode == "random" else "TMs stay TMs"


def randomize_field_items(pm, rom, rng, items, log, tm_mode="keep"):
    path = "fielddata/script/scr_seq.narc"
    span, narc = pm._open_narc(rom, path, log)
    data = bytearray(narc.get(ITEM_SCRIPT_FILE))
    pool = field_pool(items, tm_mode)
    cursor, index, found, changed = 0, 0, 0, 0
    while u16(data, cursor) != SCRIPT_LIST_TERMINATOR:
        script = u32(data, cursor) + cursor + 4
        cursor += 4
        index += 1
        if index - 1 in ITEM_SCRIPT_SKIP:
            continue
        if u16(data, script) != SCRIPT_SET_VAR or u16(data, script + 2) != ITEM_VARIABLE:
            continue
        found += 1
        item = u16(data, script + 4)
        replacement = replacement_for(item, rng, pool, tm_mode)
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


def randomize_hidden_items(rom, rng, items, tm_mode="keep"):
    start, count = find_hidden_items(Arm9(rom))
    pool = field_pool(items, tm_mode)
    changed = 0
    for index in range(count):
        entry = start + index * 8
        item = u16(rom.data, entry)
        replacement = replacement_for(item, rng, pool, tm_mode)
        if replacement != item:
            rom.write(entry, entry + 2, struct.pack("<H", replacement))
            changed += 1
    return f"Hidden items: {changed}/{count} randomized ({tm_note(tm_mode)})."


def read_item_list(rom, offset, limit=40):
    result = []
    while len(result) <= limit:
        item = u16(rom.data, offset + len(result) * 2)
        if item == 0xFFFF:
            return result
        if not 0 < item < 600:
            return None
        result.append(item)
    return None


def find_mart_table(arm9, rom):
    code = arm9.bytes()
    for start in range(0, len(code) - 4 * 20, 4):
        lists = []
        while start + len(lists) * 4 + 4 <= len(code):
            pointer = u32(code, start + len(lists) * 4)
            if not arm9.contains_pointer(pointer) or pointer & 1:
                break
            stock = read_item_list(rom, arm9.to_rom(pointer))
            if not stock:
                break
            lists.append((arm9.offset + start + len(lists) * 4, arm9.to_rom(pointer), stock))
        if len(lists) >= 20 and sum(1 for _, _, stock in lists if stock[0] in MAIL) >= 8:
            return lists
    raise RuntimeError("The Poke Mart stock table was not found.")


def randomize_marts(rom, rng, items, include_held_items):
    lists = find_mart_table(Arm9(rom), rom)
    pool = [item for item in SHOP_POOL if items.sellable(item)]
    if include_held_items:
        pool += [item for item in HELD_ITEMS if items.sellable(item)]
    city_marts = [
        (offset, stock)
        for _, offset, stock in lists
        if stock[0] in MAIL or (len(stock) >= 6 and all(2 <= item <= 16 for item in stock))
    ]
    mail_slots = sum(1 for _, stock in city_marts for item in stock if item in MAIL)
    if mail_slots < len(STONES):
        raise RuntimeError("Not enough specialty clerk mail slots to place every evolution stone.")
    stones = rng.sample(STONES, len(STONES))
    lines = []
    for offset, stock in city_marts:
        used, after = set(), []
        for slot, item in enumerate(stock):
            if item in MAIL:
                replacement = stones.pop() if stones else rng.choice(STONES)
            else:
                candidates = [candidate for candidate in pool if candidate not in used]
                replacement = rng.choice(candidates)
            used.add(replacement)
            after.append(replacement)
            rom.write(offset + slot * 2, offset + slot * 2 + 2, struct.pack("<H", replacement))
        lines.append(
            f"  {', '.join(items.name(item) for item in stock)}\n    -> {', '.join(items.name(item) for item in after)}"
        )
    return f"Specialty clerks: {len(city_marts)} Poke Marts, every evolution stone sold at least once.\n" + "\n".join(
        lines
    )


def find_map_headers(rom, zone_events, scripts):
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
            return [
                (u16(code, start + i * MAP_HEADER_SIZE + 4), u16(code, start + i * MAP_HEADER_SIZE + 16))
                for i in range(count)
            ]
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


class TrainerTeams:
    def __init__(self, pm, rom, log):
        self.pm, self.rom, self.log = pm, rom, log
        self.data_span, self.data = pm._open_narc(rom, "poketool/trainer/trdata.narc", log)
        self.party_span, self.parties = pm._open_narc(rom, "poketool/trainer/trpoke.narc", log)

    def trainer_class(self, trainer):
        return self.data.get(trainer)[1]

    def teams(self, trainer):
        head = self.data.get(trainer)
        result = [(trainer, head[3])]
        hard_file, hard_size = u16(head, 24), head[26]
        if len(head) >= 28 and hard_size and hard_file < self.parties.num_files:
            result.append((hard_file, hard_size))
        return result

    def species(self, party_file, size):
        body = self.parties.get(party_file)
        stride = len(body) // size if size else 0
        return [u16(body, slot * stride + 4) & 1023 for slot in range(size)], stride

    def set_species(self, party_file, size, species):
        body = bytearray(self.parties.get(party_file))
        stride = len(body) // size
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
    groups = [(name, maps, gym_mode) for name, maps in GYMS] + [(name, maps, elite_four_mode) for name, maps in ELITE_FOUR]
    lines = []
    for name, maps, mode in groups:
        if mode == "off":
            continue
        trainers = []
        for map_id in maps:
            script_file, event_file = headers[map_id]
            for trainer in map_trainers(zone_events.get(event_file), scripts.get(script_file), teams.data.num_files):
                if trainer not in trainers:
                    trainers.append(trainer)
        bosses = [trainer for trainer in trainers if teams.trainer_class(trainer) in BOSS_CLASS_TYPES]
        if not bosses:
            lines.append(f"  {name}: skipped (leader not found)")
            continue
        type_id = BOSS_CLASS_TYPES[teams.trainer_class(bosses[0])] if mode == "vanilla" else random_types.pop()
        details = []
        for trainer in trainers:
            for party_file, size in teams.teams(trainer):
                if not size:
                    continue
                current, _ = teams.species(party_file, size)
                used, themed = set(), []
                for species in current:
                    target = db[species]["bst"] if species in db else 400
                    pick = themed_species(db, type_id, target, rng, used, allowed)
                    used.add(pick)
                    themed.append(pick)
                teams.set_species(party_file, size, themed)
                if trainer in bosses:
                    details.append(", ".join(pm.SPECIES_NAMES[species - 1] for species in themed))
        lines.append(f"  {name} [{TYPE_NAMES[type_id]}] {len(trainers)} trainers - leader: {' | '.join(details)}")
    teams.save()
    return "Type themed gyms / Elite Four:\n" + "\n".join(lines)


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
