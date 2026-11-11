import random
import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import randomize
import rom_extras
import rom_text

PAGE = chr(rom_text.PRIVATE + rom_text.PAGE_BREAKS[0])
LINE = rom_text.NEWLINE_CHAR
END = chr(rom_text.PRIVATE + rom_text.END)
TYPES = {"ROCHE", "FEU", "EAU", "PLANTE", "COMBAT", "NORMAL", "ACIER", "ROCK", "WATER", "GRASS"}


def compress(codes):
    words, bits, available = [rom_text.COMPRESSED], 0, 0
    for code in [*codes, 0x1FF]:
        bits |= code << available
        available += 9
        while available >= 16:
            words.append(bits & 0xFFFF)
            bits >>= 16
            available -= 16
    if available:
        words.append(bits & 0xFFFF)
    return words


class CodecTests(unittest.TestCase):
    def test_text_round_trip(self):
        text = "Arène Pokémon de Charbourg" + LINE + "Champion: Pierrick" + PAGE + "Type: Feu" + END
        codes = rom_text.to_codes(text)
        self.assertEqual(rom_text.to_text(codes), text)
        self.assertEqual(codes[-1], rom_text.END)

    def test_every_code_round_trips(self):
        codes = list(range(0x10000))
        self.assertEqual(rom_text.to_codes(rom_text.to_text(codes)), codes)

    def test_fold_drops_accents(self):
        self.assertEqual(rom_text.fold("Ténèbres"), "TENEBRES")

    def test_bank_round_trip(self):
        messages = [rom_text.to_codes("Salut!" + END), [], rom_text.to_codes("Type: Eau" + END)]
        bank = rom_text.write_bank(0x1234, messages)
        key, read = rom_text.read_bank(bank)
        self.assertEqual(key, 0x1234)
        self.assertEqual(read, messages)
        self.assertEqual(rom_text.write_bank(key, read), bank)

    def test_compressed_message(self):
        codes = rom_text.to_codes("Hello")
        self.assertEqual(rom_text.message_codes(compress(codes)), [*codes, rom_text.END])
        self.assertEqual(rom_text.message_codes(codes), [*codes, rom_text.END])


class SignTests(unittest.TestCase):
    def test_header_with_newline_or_page_break(self):
        for separator in (LINE, PAGE):
            codes = rom_text.to_codes("Arène de Rivamar" + separator + "Champion: Tanguy" + PAGE + "Etoile!" + END)
            header, split = rom_text.sign_header(codes)
            self.assertEqual(rom_text.to_text(header[0]), "Arène de Rivamar")
            self.assertEqual(rom_text.to_text(header[1]), "Champion: Tanguy")
            self.assertEqual(rom_text.to_text(codes[split:]), PAGE + "Etoile!" + END)

    def test_header_needs_a_colon_on_the_second_line(self):
        codes = rom_text.to_codes("Salut!" + LINE + "Comment ça va?" + PAGE + "Bye" + END)
        self.assertEqual(rom_text.sign_header(codes), (None, None))


class TypeMentionTests(unittest.TestCase):
    def test_spans_next_to_the_word_type(self):
        text = "des Pokémon de type Roche. La roche"
        self.assertEqual([text[start:end] for start, end in rom_text.type_word_spans(text, "ROCHE")], ["Roche"])
        text = "a Rock-type user, rock music"
        self.assertEqual([text[start:end] for start, end in rom_text.type_word_spans(text, "ROCK")], ["Rock"])
        self.assertEqual(rom_text.type_word_spans("Les types Acier", "ACIER"), [(10, 15)])

    def test_no_false_positive(self):
        self.assertEqual(rom_text.type_word_spans("Le feu brûle, quel type!", "FEU"), [])

    def test_keeps_upper_case(self):
        self.assertEqual(rom_text.replace_type("TYPE ROCHE", "ROCHE", "Feu"), "TYPE FEU")

    def test_cuts_weakness_advice_when_the_type_changes(self):
        text = "de type Roche." + PAGE + "Les Roche détestent l'Eau et le type Plante." + END
        self.assertEqual(rom_text.replace_type(text, "ROCHE", "Feu", TYPES), "de type Feu." + END)

    def test_keeps_pages_without_other_types(self):
        text = "de type Feu." + PAGE + "Montre-moi si la flamme du combat brûle en toi!" + END
        self.assertEqual(
            rom_text.replace_type(text, "FEU", "Plante", TYPES),
            "de type Plante." + PAGE + "Montre-moi si la flamme du combat brûle en toi!" + END,
        )

    def test_keeps_text_when_the_type_is_unchanged(self):
        text = "de type Roche." + PAGE + "Utilise le type Eau!" + END
        self.assertEqual(rom_text.replace_type(text, "ROCHE", "Roche", TYPES), text)


class OptionTests(unittest.TestCase):
    def test_repair_party_clears_misplaced_writes_and_themes_species(self):
        db = {1: {"type1": 5, "type2": 5, "bst": 300}, 2: {"type1": 9, "type2": 9, "bst": 300}, 3: {"type1": 5, "type2": 0, "bst": 310}}
        size, stride, file_stride = 3, 16, 28
        body = bytearray(size * file_stride)
        for slot, species in enumerate((1, 2, 2)):
            struct.pack_into("<HH", body, slot * stride + 2, 15, species)
            body[slot * stride + 10] = 0x19
        for offset in rom_extras.legacy_theme_offsets(size, stride, file_stride):
            struct.pack_into("<H", body, offset, 1)
        fixed, replaced = rom_extras.repair_party(bytes(body), size, stride, 5, db, random.Random(1), [1, 2, 3])
        self.assertEqual(replaced, 2)
        for slot in range(size):
            entry = fixed[slot * stride : (slot + 1) * stride]
            self.assertIn(rom_extras.u16(entry, 4), (1, 3))
            self.assertEqual(rom_extras.u16(entry, 2), 15)
            self.assertEqual((entry[0], entry[8], entry[12], entry[10]), (0, 0, 0, 0x19))

    def test_repair_party_keeps_complete_teams(self):
        db = {1: {"type1": 5, "type2": 5, "bst": 300}}
        body = bytearray(32)
        struct.pack_into("<H", body, 4, 1)
        struct.pack_into("<H", body, 20, 1)
        self.assertEqual(rom_extras.repair_party(bytes(body), 2, 16, 5, db, random.Random(1), [1]), (bytes(body), 0))

    def test_shared_type(self):
        db = {1: {"type1": 5, "type2": 5}, 2: {"type1": 5, "type2": 9}, 3: {"type1": 9, "type2": 5}}
        self.assertEqual(rom_extras.shared_type(db, [1, 2, 3]), 5)
        self.assertIsNone(rom_extras.shared_type(db, [2, 3]))
        self.assertIsNone(rom_extras.shared_type(db, [1, 4]))

    def test_gym_type_hints_must_be_boolean(self):
        self.assertFalse(randomize.bool_option({}, "gymTypeHints"))
        self.assertTrue(randomize.bool_option({"gymTypeHints": True}, "gymTypeHints"))
        with self.assertRaises(ValueError):
            randomize.bool_option({"gymTypeHints": "yes"}, "gymTypeHints")


if __name__ == "__main__":
    unittest.main()
