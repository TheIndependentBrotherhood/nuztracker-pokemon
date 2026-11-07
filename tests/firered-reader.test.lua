local bytes = {}
local function signed(value)
    if value >= 2147483648.0 then return value - 4294967296.0 end
    return value
end
local function unsigned(value)
    if value < 0 then return value + 4294967296.0 end
    return value
end
bit = {
    bxor = function(first, second) return unsigned(signed(first) ~ signed(second)) end,
    band = function(first, second) return unsigned(signed(first) & signed(second)) end,
}
local function write8(address, value) bytes[address] = value % 256 end
local function write16(address, value)
    write8(address, value)
    write8(address + 1, math.floor(value / 256))
end
local function write32(address, value)
    for offset = 0, 3 do write8(address + offset, math.floor(value / 2 ^ (offset * 8))) end
end
memory = {
    read_u8 = function(address) return bytes[address] or 0 end,
    read_u16_le = function(address) return (bytes[address] or 0) + (bytes[address + 1] or 0) * 256 end,
    read_u32_le = function(address)
        local value = 0.0
        for offset = 0, 3 do value = value + (bytes[address + offset] or 0) * 2 ^ (offset * 8) end
        return value
    end,
}
emu = { framecount = function() return 120 end }
gameinfo = { getromhash = function() return "synthetic-rom" end }

local reader = assert(loadfile("connectors/bizhawk-firered.lua"))("test")
local base = 0x02024284
local permutations = {}
for first = 0, 3 do
    for second = 0, 3 do
        for third = 0, 3 do
            for fourth = 0, 3 do
                if first ~= second and first ~= third and first ~= fourth and
                    second ~= third and second ~= fourth and third ~= fourth then
                    permutations[#permutations + 1] = { first, second, third, fourth }
                end
            end
        end
    end
end

local function preparePokemon(permutation, egg)
    local personality = 2147483648.0 + ((permutation - 2147483648.0) % 24)
    local trainer = 305419896
    write32(base, personality)
    write32(base + 4, trainer)
    write8(base + 8, 0xBB)
    write8(base + 9, 0xFF)
    local growth = { 1, 125, 0 }
    local attacks = { 33, 0, 35 }
    local effort = { 0, 0, 0 }
    local misc = { 0, egg and 0x40000000 or 0, 0 }
    local blocks = { growth, attacks, effort, misc }
    local checksum = 0
    local key = bit.bxor(personality, trainer)
    for slot, block in ipairs(permutations[permutation + 1]) do
        for word, value in ipairs(blocks[block + 1]) do
            checksum = (checksum + value % 65536 + math.floor(value / 65536)) % 65536
            write32(base + 32 + (slot - 1) * 12 + (word - 1) * 4, bit.bxor(value, key))
        end
    end
    write16(base + 28, checksum)
    write32(base + 80, 0)
    write8(base + 84, 5)
    write16(base + 86, 17)
    write16(base + 88, 20)
    for offset = 90, 98, 2 do write16(base + offset, 10) end
    write16(0x08251FEE, 1)
    write8(0x08254784 + 28 + 6, 12)
    write8(0x08254784 + 28 + 7, 3)
    write8(0x08254784 + 28 + 16, 31)
    write8(0x08254784 + 28 + 22, 0)
    local moveName = "TACKLE"
    for index = 1, #moveName do
        write8(0x08247094 + 33 * 13 + index - 1, string.byte(moveName, index) - 65 + 0xBB)
    end
    write8(0x08247094 + 33 * 13 + #moveName, 0xFF)
    write8(0x08250C04 + 33 * 12 + 1, 35)
    write8(0x08250C04 + 33 * 12 + 2, 0)
    write8(0x08250C04 + 33 * 12 + 3, 95)
end

for permutation = 0, 23 do
    preparePokemon(permutation, false)
    local pokemon = reader.readPokemon(base)
    assert(pokemon.pokemonId == 1, "Species decoding failed for permutation " .. permutation)
    assert(pokemon.hp == 17 and pokemon.maxHp == 20)
    assert(pokemon.moves[1].id == 33 and pokemon.moves[1].pp == 35)
    assert(pokemon.experience == 125)
    assert(pokemon.types[1] == "grass" and pokemon.types[2] == "poison")
end
preparePokemon(0, true)
assert(reader.readPokemon(base) == nil, "Egg contents must not be revealed")
preparePokemon(0, false)
write16(base + 28, 0)
assert(not pcall(function() reader.readPokemon(base) end), "Bad checksums must fail")
preparePokemon(0, false)
write8(0x080000AC, 66)
write8(0x080000AD, 80)
write8(0x080000AE, 82)
write8(0x080000AF, 69)
write8(0x080000BC, 0)
write8(0x02024029, 1)
write32(0x03005008, 0x02025000)
write32(0x0300500C, 0x02026000)
write32(0x02026000 + 10, 123)
local frame = reader.sample()
assert(frame.game.gameCode == "BPRE" and #frame.party == 1)
assert(reader.json(reader.array()) == "[]")
assert(reader.json({}) == "{}")
write8(0x030030F0 + 0x439, 2)
write8(0x02023BCC, 2)
write32(0x02022B4C, 8)
local opponent = 0x02023BE4 + 88
write32(0x02023BE4 + 72, memory.read_u32_le(base))
write32(0x02023BE4 + 84, memory.read_u32_le(base + 4))
write16(opponent, 1)
write8(opponent + 42, 5)
write16(0x03004F90 + 0x24, 33)
local originalRead8, originalRead16, originalRead32 = memory.read_u8, memory.read_u16_le, memory.read_u32_le
local function checkEnemyRead(address)
    assert(not (address >= 0x0202402C and address < 0x02024284), "Hidden enemy party was read")
    assert(not (address > opponent and address < opponent + 42), "Hidden enemy statistics or moves were read")
    assert(not (address > opponent + 42 and address < opponent + 72), "Hidden enemy details were read")
end
memory.read_u8 = function(address) checkEnemyRead(address); return originalRead8(address) end
memory.read_u16_le = function(address) checkEnemyRead(address); return originalRead16(address) end
memory.read_u32_le = function(address) checkEnemyRead(address); return originalRead32(address) end
assert(#reader.sample().observations == 0, "An unused opponent move must not be revealed")
reader.markEnemyMove()
frame = reader.sample()
assert(frame.battle.activePlayerIdentity == frame.party[1].identity, "Live focus must identify the active owned Pokemon")
assert(frame.observations[1].moveId == 33 and frame.observations[1].value == "TACKLE")
if arg and arg[1] == "--frame" then print("FRAME:" .. reader.json(frame)) end
write8(0x080000BC, 1)
assert(not pcall(reader.sample), "An unsupported revision must fail")
print("FireRed reader: all 24 permutations, unsigned identities, checksum, egg privacy, observed moves and ROM guards passed.")
