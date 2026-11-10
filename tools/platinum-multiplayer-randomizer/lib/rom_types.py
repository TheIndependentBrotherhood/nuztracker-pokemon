"""Evolution-line type swaps: every family replaces its types the same way in all of its members."""

import struct

from rom_evolutions import SPECIES_COUNT, read_evolution_records

PERSONAL_ARCHIVE = "poketool/personal/pl_personal.narc"
EVOLUTION_ARCHIVE = "poketool/personal/evo.narc"
PERSONAL_RECORD_SIZE = 44
TYPE_OFFSETS = (6, 7)
# Alternate form records (pret/pokeplatinum) share the types of their base species' line.
FORM_SPECIES = {
    496: 386, 497: 386, 498: 386,
    499: 413, 500: 413,
    501: 487,
    502: 492,
    503: 479, 504: 479, 505: 479, 506: 479, 507: 479,
}


def evolution_families(paths, species):
    parent = {entry: entry for entry in species}

    def root(entry):
        while parent[entry] != entry:
            parent[entry] = parent[parent[entry]]
            entry = parent[entry]
        return entry

    for source, entries in paths.items():
        for *_, target in entries:
            parent[root(target)] = root(source)
    families = {}
    for entry in species:
        families.setdefault(root(entry), []).append(entry)
    return sorted(families.values())


def read_types(archive, count):
    types = {}
    for index in range(count):
        data = archive.get(index)
        if len(data) < PERSONAL_RECORD_SIZE:
            raise RuntimeError("The personal archive has an unsupported record size.")
        types[index] = tuple(data[offset] for offset in TYPE_OFFSETS)
    return types


def family_type_maps(families, available, rng):
    """One random permutation of the ROM's types per family, so distinct types stay distinct."""
    maps = {}
    for family in families:
        shuffled = list(available)
        rng.shuffle(shuffled)
        swap = dict(zip(available, shuffled))
        for species in family:
            maps[species] = swap
    return maps


def randomize_family_types(pm, source_rom, rom, rng, log):
    """Types come from the unrandomized input ROM, so lines follow the original evolutions."""
    species = list(range(1, SPECIES_COUNT + 1))
    _, evolutions = pm._open_narc(source_rom, EVOLUTION_ARCHIVE, log)
    _, paths = read_evolution_records(evolutions, set(species))
    _, source_personal = pm._open_narc(source_rom, PERSONAL_ARCHIVE, log)
    span, personal = pm._open_narc(rom, PERSONAL_ARCHIVE, log)
    if personal.num_files != source_personal.num_files or personal.num_files <= SPECIES_COUNT:
        raise RuntimeError("The personal archive does not match the input ROM.")
    original = read_types(source_personal, personal.num_files)
    available = sorted({value for index in species for value in original[index]})
    families = evolution_families(paths, species)
    maps = family_type_maps(families, available, rng)
    for form, base in FORM_SPECIES.items():
        if form < personal.num_files:
            maps[form] = maps[base]
    for index, swap in maps.items():
        if any(value not in swap for value in original[index]):
            continue
        record = bytearray(personal.get(index))
        for offset, value in zip(TYPE_OFFSETS, original[index]):
            struct.pack_into("<B", record, offset, swap[value])
        personal.put(index, bytes(record))
    if not pm._save_narc(rom, span, personal, PERSONAL_ARCHIVE, log):
        raise RuntimeError("Could not save the randomized type data.")
    return (
        f"Evolution-line types: {len(families)} families, one type swap each "
        "(original lines, before random evolutions); swaps hidden."
    )
