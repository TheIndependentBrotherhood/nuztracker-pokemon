"""Randomize Platinum Multiplayer evolution targets without changing their conditions."""

import struct
from collections import defaultdict

from rom_extras import Arm9

EVOLUTION_ARCHIVE = "poketool/personal/evo.narc"
SPECIES_COUNT = 493
EVOLUTION_SLOTS = 7
EVOLUTION_ENTRY_SIZE = 6
EVOLUTION_RECORD_SIZE = 44
MAX_EVOLUTION_METHOD = 27
EXTRA_EVOLUTION_SOURCE = 290
EXTRA_EVOLUTION_TARGET = 292
EXTRA_EVOLUTION_METHOD = 14
PRIMARY_EXTRA_METHOD = 13
EXTRA_EVOLUTION_CODE = bytes.fromhex("492080000090281c0521")


def read_evolution_records(archive, species):
    if archive.num_files <= SPECIES_COUNT:
        raise RuntimeError("The evolution archive does not contain every supported species.")
    records, paths = {}, {}
    for index in range(archive.num_files):
        data = archive.get(index)
        if len(data) != EVOLUTION_RECORD_SIZE:
            raise RuntimeError("The evolution archive has an unsupported record size.")
        entries = []
        for slot in range(EVOLUTION_SLOTS):
            offset = slot * EVOLUTION_ENTRY_SIZE
            method, param, target = struct.unpack_from("<HHH", data, offset)
            if not method:
                if param or target:
                    raise RuntimeError("An empty evolution slot contains unexpected data.")
                continue
            if index not in species or method > MAX_EVOLUTION_METHOD or target not in species:
                raise RuntimeError("The evolution archive contains an unsupported species or method.")
            entries.append((offset, method, param, target))
        if index in species:
            records[index] = data
            if entries:
                paths[index] = entries
    return records, paths


def extra_evolution_offset(rom, paths):
    primary = [
        (source, param, target)
        for source, entries in paths.items()
        for _, method, param, target in entries
        if method == PRIMARY_EXTRA_METHOD
    ]
    bonus = [
        (source, param, target)
        for source, entries in paths.items()
        for _, method, param, target in entries
        if method == EXTRA_EVOLUTION_METHOD
    ]
    if not primary and not bonus:
        return None
    if (
        len(primary) != 1
        or len(bonus) != 1
        or primary[0][0] != EXTRA_EVOLUTION_SOURCE
        or bonus[0][0] != EXTRA_EVOLUTION_SOURCE
        or primary[0][1] != bonus[0][1]
        or bonus[0][2] != EXTRA_EVOLUTION_TARGET
        or primary[0][2] == bonus[0][2]
    ):
        raise RuntimeError("The special extra-evolution data has an unsupported layout.")
    arm9 = Arm9(rom)
    code = arm9.bytes()
    offset = code.find(EXTRA_EVOLUTION_CODE)
    if offset < 0 or code.find(EXTRA_EVOLUTION_CODE, offset + 1) >= 0:
        raise RuntimeError("The special extra-evolution code was not found uniquely.")
    return arm9.offset + offset


def evolution_targets(paths, species, rng):
    reverse_edges = defaultdict(set)
    order = sorted(paths)
    rng.shuffle(order)
    targets = {}
    for source in order:
        blocked = {source}
        pending = [source]
        while pending:
            current = pending.pop()
            for ancestor in reverse_edges[current]:
                if ancestor not in blocked:
                    blocked.add(ancestor)
                    pending.append(ancestor)
        used = set()
        for original in dict.fromkeys(entry[3] for entry in paths[source]):
            choices = [
                candidate
                for candidate in species
                if candidate not in blocked and candidate not in used and candidate != original
            ]
            if not choices:
                raise RuntimeError("No compatible target remains for an evolution branch.")
            target = rng.choice(choices)
            targets[source, original] = target
            used.add(target)
            reverse_edges[target].add(source)
    return targets


def extra_evolution_instruction(target):
    if type(target) is not int or not 1 <= target <= SPECIES_COUNT:
        raise ValueError("The extra-evolution target is not a supported species.")
    low = min(target, 255)
    return bytes((low, 0x20, target - low, 0x30))


def randomize_evolutions(pm, rom, rng, log):
    species = sorted(pm.rand_load_pokemon_db(rom))
    if species != list(range(1, SPECIES_COUNT + 1)):
        raise RuntimeError("The ROM does not contain the supported Platinum species set.")
    span, archive = pm._open_narc(rom, EVOLUTION_ARCHIVE, log)
    records, paths = read_evolution_records(archive, set(species))
    if not paths:
        raise RuntimeError("The evolution archive contains no evolution paths.")
    bonus_offset = extra_evolution_offset(rom, paths)
    targets = evolution_targets(paths, species, rng)

    updated = {}
    for source, entries in paths.items():
        record = bytearray(records[source])
        for offset, _, _, original in entries:
            struct.pack_into("<H", record, offset + 4, targets[source, original])
        updated[source] = bytes(record)

    bonus_patch = None
    if bonus_offset is not None:
        target = targets[EXTRA_EVOLUTION_SOURCE, EXTRA_EVOLUTION_TARGET]
        bonus_patch = extra_evolution_instruction(target)

    for source, record in updated.items():
        archive.put(source, record)
    if not pm._save_narc(rom, span, archive, EVOLUTION_ARCHIVE, log):
        raise RuntimeError("Could not save the randomized evolution archive.")
    if bonus_patch is not None:
        # The extra evolution's species is hard-coded separately from the evolution archive.
        rom.write(bonus_offset, bonus_offset + len(bonus_patch), bonus_patch)
    return (
        f"Random evolutions: {len(paths)} species, {sum(len(entries) for entries in paths.values())} paths; "
        "conditions preserved and targets hidden."
    )
