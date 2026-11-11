"""Rewrite in-game texts so gym signs and trainer speeches give the (themed) gym / Elite Four types.

Messages are edited as Gen 4 character codes, so every control code (line breaks, player name, ...)
is kept as is. Only the ROM's own words are used: type names come from the type name bank, and the
sign label is "Type: <name>".
"""

import collections
import re
import struct
import unicodedata

import rom_extras
import rom_learnsets

MESSAGE_ARCHIVE = "msgdata/pl_msg.narc"
TYPE_NAME_BANK = 624
TYPE_COUNT = 18
NEWLINE = 0xE000
PAGE_BREAKS = (0x25BC, 0x25BD)
PLACEHOLDER = 0xFFFE
END = 0xFFFF
COMPRESSED = 0xF100
SIGN_LABEL = "Type: "
TYPE_WORDS = {"TYPE", "TYPES"}

PUNCTUATION = {
    0x1A8: "$", 0x1AB: "!", 0x1AC: "?", 0x1AD: ",", 0x1AE: ".", 0x1AF: "\u2026", 0x1B1: "/", 0x1B2: "\u2018",
    0x1B3: "'", 0x1B9: "(", 0x1BA: ")", 0x1BB: "\u2642", 0x1BC: "\u2640", 0x1BD: "+", 0x1BE: "-", 0x1BF: "*",
    0x1C0: "#", 0x1C1: "=", 0x1C2: "&", 0x1C3: "~", 0x1C4: ":", 0x1C5: ";", 0x1DE: " ",
}
# Codes without a character map to private-use characters, so text <-> codes is lossless.
PRIVATE = 0xF0000
NEWLINE_CHAR = chr(PRIVATE + NEWLINE)
PAGE_BREAK_CHARS = {chr(PRIVATE + code) for code in PAGE_BREAKS}
WORD = re.compile(r"[^\W\d_]+")
WORD_GAP = re.compile(rf"[ \-{NEWLINE_CHAR}]+")


def code_char(code):
    if 0x121 <= code <= 0x12A:
        return chr(code - 0x121 + 48)
    if 0x12B <= code <= 0x144:
        return chr(code - 0x12B + 65)
    if 0x145 <= code <= 0x15E:
        return chr(code - 0x145 + 97)
    if 0x15F <= code <= 0x19E:
        return chr(code - 0x15F + 0xC0)
    return PUNCTUATION.get(code) or chr(PRIVATE + code)


CHAR_CODES = {code_char(code): code for code in range(0x10000)}


def to_text(codes):
    return "".join(code_char(code) for code in codes)


def to_codes(text):
    try:
        return [CHAR_CODES[char] for char in text]
    except KeyError as error:
        raise RuntimeError(f"Character {error} cannot be written in a Gen 4 message.") from None


def fold(word):
    return "".join(char for char in unicodedata.normalize("NFD", word) if not unicodedata.combining(char)).upper()


def read_bank(bank):
    """Decrypted words of every message (still compressed when the game stored them so)."""
    count, key = struct.unpack_from("<HH", bank, 0)
    messages = []
    for index in range(count):
        local = (key * 0x2FD * (index + 1)) & 0xFFFF
        mask = (local << 16) | local
        offset, length = (value ^ mask for value in struct.unpack_from("<II", bank, 4 + index * 8))
        if offset + length * 2 > len(bank):
            raise RuntimeError("Unexpected message bank layout.")
        seed = (0x91BD3 * (index + 1)) & 0xFFFF
        words = []
        for (word,) in struct.iter_unpack("<H", bank[offset : offset + length * 2]):
            words.append(word ^ seed)
            seed = (seed + 0x493D) & 0xFFFF
        messages.append(words)
    return key, messages


def write_bank(key, messages):
    table, data = bytearray(), bytearray()
    start = 4 + 8 * len(messages)
    for index, words in enumerate(messages):
        local = (key * 0x2FD * (index + 1)) & 0xFFFF
        mask = (local << 16) | local
        table += struct.pack("<II", (start + len(data)) ^ mask, len(words) ^ mask)
        seed = (0x91BD3 * (index + 1)) & 0xFFFF
        for word in words:
            data += struct.pack("<H", word ^ seed)
            seed = (seed + 0x493D) & 0xFFFF
    return struct.pack("<HH", len(messages), key) + table + data


def message_codes(words):
    """Character codes of a message, ending with END."""
    if not words or words[0] != COMPRESSED:
        return list(words) if words and words[-1] == END else [*words, END]
    codes, bits, available = [], 0, 0
    for word in words[1:]:
        bits |= word << available
        available += 16
        while available >= 9:
            code = bits & 0x1FF
            bits >>= 9
            available -= 9
            if code == 0x1FF:
                return [*codes, END]
            codes.append(code)
    return [*codes, END]


def separators(codes):
    return [index for index, code in enumerate(codes) if code == NEWLINE or code in PAGE_BREAKS]


def sign_header(codes):
    """The "<Gym name>" / "<Leader>: <name>" lines shared by a gym's statues and its city sign.

    Returns the two lines (whatever separates them) and the index of the separator after them.
    """
    breaks = separators(codes)
    if len(breaks) < 2:
        return None, None
    first, second = codes[: breaks[0]], codes[breaks[0] + 1 : breaks[1]]
    if not first or any(code >= 0x8000 for code in first + second) or CHAR_CODES[":"] not in second:
        return None, None
    return (tuple(first), tuple(second)), breaks[1]


def type_word_spans(text, folded_type):
    """Spans of the type name written right before or after the word "type" ("de type Roche", "Rock-type")."""
    words = list(WORD.finditer(text))
    spans = []
    for position, word in enumerate(words):
        if fold(word.group()) != folded_type:
            continue
        for neighbor in (position - 1, position + 1):
            if not 0 <= neighbor < len(words) or fold(words[neighbor].group()) not in TYPE_WORDS:
                continue
            left, right = sorted((word, words[neighbor]), key=lambda match: match.start())
            if WORD_GAP.fullmatch(text[left.end() : right.start()]):
                spans.append(word.span())
                break
    return spans


def replace_type(text, folded_type, name, type_words=()):
    """Write `name` for the type; with `type_words`, drop the pages after the first mention when they
    talk about other types (a gym guide's weakness advice would be wrong for the new type)."""
    spans = type_word_spans(text, folded_type)
    for start, end in reversed(spans):
        word = text[start:end]
        text = text[:start] + (name.upper() if word.isupper() else name) + text[end:]
    if spans and type_words and fold(name) != folded_type:
        shift = sum(len(name) - (end - start) for start, end in spans[:1])
        cut = next(
            (index for index in range(spans[0][1] + shift, len(text)) if text[index] in PAGE_BREAK_CHARS),
            None,
        )
        if cut is not None and any(
            word.group()[:1].isupper() and fold(word.group()) in type_words for word in WORD.finditer(text, cut)
        ):
            text = text[:cut] + chr(PRIVATE + END)
    return text


class MessageBanks:
    def __init__(self, pm, rom, log):
        self.rom = rom
        self.span, self.archive = pm._open_narc(rom, MESSAGE_ARCHIVE, log)
        self.original = bytes(rom.data[self.span[0] : self.span[1]])
        self.loaded = {}
        self.changed = set()

    def messages(self, bank):
        if bank not in self.loaded:
            self.loaded[bank] = read_bank(bytes(self.archive.get(bank)))
        return self.loaded[bank][1]

    def codes(self, bank, index):
        return message_codes(self.messages(bank)[index])

    def set_codes(self, bank, index, codes):
        if codes != self.codes(bank, index):
            self.messages(bank)[index] = codes
            self.changed.add(bank)

    def save(self):
        if not self.changed:
            return
        files = [bytes(self.archive.get(index)) for index in range(self.archive.num_files)]
        for bank in self.changed:
            files[bank] = write_bank(self.loaded[bank][0], self.loaded[bank][1])
        rom_learnsets.write_rom_file(self.rom, self.span, rom_learnsets.build_narc(self.original, files))


def type_names(banks):
    names = [to_text(banks.codes(TYPE_NAME_BANK, index)[:-1]) for index in range(len(banks.messages(TYPE_NAME_BANK)))]
    if len(names) != TYPE_COUNT or fold(names[0]) != "NORMAL":
        raise RuntimeError("The type name message bank was not found.")
    return names


def type_spellings(banks, names):
    """How the game's texts write each type name in a sentence (e.g. "Électrik" for ELECTRIK)."""
    folded = {fold(name): index for index, name in enumerate(names)}
    seen = collections.defaultdict(collections.Counter)
    for bank in range(banks.archive.num_files):
        try:
            messages = banks.messages(bank)
        except (RuntimeError, struct.error):
            continue
        for words in messages:
            text = to_text(message_codes(words))
            for key, index in folded.items():
                for start, end in type_word_spans(text, key):
                    if not text[start:end].isupper():
                        seen[index][text[start:end]] += 1
    return [
        seen[index].most_common(1)[0][0] if seen[index] else name[:1] + name[1:].lower()
        for index, name in enumerate(names)
    ]


def give_type_hints(pm, rom, themes, log):
    """Gym city signs show "Type: <type>"; gym and Elite Four speeches name the themed type."""
    if not themes:
        return "Gym type hints: no themed gym or Elite Four member."
    _, zone_events = pm._open_narc(rom, "fielddata/eventdata/zone_event.narc", log)
    _, scripts = pm._open_narc(rom, "fielddata/script/scr_seq.narc", log)
    map_banks = rom_extras.map_text_banks(rom, zone_events, scripts)
    banks = MessageBanks(pm, rom, log)
    names = type_names(banks)
    spellings = type_spellings(banks, names)
    type_words = {fold(name) for name in names} | {fold(name) for name in spellings}
    signs = speeches = 0
    sign_lines, gym_banks = {}, set()
    for theme in themes:
        group = {map_banks[map_id] for map_id in theme.maps}
        # Banks also used by other maps (shared texts) are left alone.
        own = sorted(
            bank
            for bank in group
            if all(map_id in theme.maps for map_id, used in enumerate(map_banks) if used == bank)
        )
        for bank in own:
            for index in range(len(banks.messages(bank))):
                codes = banks.codes(bank, index)
                header, _ = sign_header(codes)
                if theme.is_gym and header and PLACEHOLDER in codes:
                    sign_lines[header] = to_codes(SIGN_LABEL + spellings[theme.type_id])
                text = to_text(codes)
                updated = replace_type(text, fold(names[theme.original_type]), spellings[theme.type_id], type_words)
                if updated != text:
                    banks.set_codes(bank, index, to_codes(updated))
                    speeches += 1
        if theme.is_gym:
            gym_banks |= group
    for bank in range(banks.archive.num_files):
        if bank in gym_banks or not sign_lines:
            continue
        try:
            messages = banks.messages(bank)
        except (RuntimeError, struct.error):
            continue
        for index in range(len(messages)):
            codes = banks.codes(bank, index)
            header, split = sign_header(codes)
            if header in sign_lines and PLACEHOLDER not in codes:
                # Keep the gym name and leader lines, replace the subtitle by the type.
                banks.set_codes(bank, index, [*codes[: split + 1], *sign_lines[header], END])
                signs += 1
    banks.save()
    return f"Gym type hints: {signs} gym signs show their type, {speeches} gym / Elite Four messages name it."
