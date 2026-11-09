-- FireRed English 1.0 only. Addresses are verified against the BPRE symbol map.
-- This connector never writes to emulated memory, ROMs or game saves.
local mode = ...
local bridgeUrl = "__BRIDGE_URL__"
local bridgeToken = "__BRIDGE_TOKEN__"
local domain = "System Bus"
local addresses = {
    partyCount = 0x02024029,
    party = 0x02024284,
    main = 0x030030F0,
    save1 = 0x03005008,
    save2 = 0x0300500C,
    battleFlags = 0x02022B4C,
    battlersCount = 0x02023BCC,
    battleMons = 0x02023BE4,
    battleResults = 0x03004F90,
    moveNames = 0x08247094,
    moves = 0x08250C04,
    abilityNames = 0x0824FC40,
    nationalDex = 0x08251FEE,
    speciesInfo = 0x08254784,
    levelUpLearnsets = 0x0825D7B4,
    items = 0x083DB028,
}
local typeNames = {
    [0] = "normal", "fighting", "flying", "poison", "ground", "rock",
    "bug", "ghost", "steel", "unknown", "fire", "water", "grass",
    "electric", "psychic", "ice", "dragon", "dark",
}
local natures = {
    "hardy", "lonely", "brave", "adamant", "naughty", "bold", "docile",
    "relaxed", "impish", "lax", "timid", "hasty", "serious", "jolly",
    "naive", "modest", "mild", "quiet", "bashful", "rash", "calm",
    "gentle", "sassy", "careful", "quirky",
}
local arrayTag = {}
local function array(value) return setmetatable(value or {}, arrayTag) end
local function read8(address) return memory.read_u8(address, domain) end
local function read16(address) return memory.read_u16_le(address, domain) end
local function read32(address) return memory.read_u32_le(address, domain) end
local function hex(value) return string.format("%04x%04x", math.floor(value / 65536), value % 65536) end

local function textAt(address, length)
    local result = {}
    local complete = true
    local punctuation = {
        [0x00] = " ", [0xAB] = "!", [0xAC] = "?", [0xAD] = ".",
        [0xAE] = "-", [0xAF] = ".", [0xB0] = "...",
        [0xB1] = '"', [0xB2] = '"', [0xB3] = "'", [0xB4] = "'",
        [0xB8] = ",", [0xBA] = "/", [0xF0] = ":",
    }
    for offset = 0, length - 1 do
        local byte = read8(address + offset)
        if byte == 0xFF then break end
        if byte >= 0xBB and byte <= 0xD4 then
            result[#result + 1] = string.char(65 + byte - 0xBB)
        elseif byte >= 0xD5 and byte <= 0xEE then
            result[#result + 1] = string.char(97 + byte - 0xD5)
        elseif byte >= 0xA1 and byte <= 0xAA then
            result[#result + 1] = string.char(48 + byte - 0xA1)
        else
            if not punctuation[byte] then complete = false end
            result[#result + 1] = punctuation[byte] or "?"
        end
    end
    return table.concat(result), complete
end

local function nationalId(species)
    if species < 1 or species > 411 then error("Unsupported internal species ID: " .. species) end
    local id = read16(addresses.nationalDex + (species - 1) * 2)
    if id < 1 or id > 386 then error("Invalid National Dex table. This ROM layout is not supported.") end
    return id
end

local function readMove(id, pp, ppUps)
    if id < 1 or id > 354 then error("Unsupported move ID: " .. id) end
    local address = addresses.moves + id * 12
    local basePp = read8(address + 4)
    return {
        id = id, name = textAt(addresses.moveNames + id * 13, 13), pp = pp,
        maxPp = basePp > 0 and math.max(pp, math.floor(basePp * (5 + ppUps) / 5)) or nil,
        power = read8(address + 1), type = typeNames[read8(address + 2)],
        accuracy = read8(address + 3),
    }
end

-- Level-up entries pack the level in the top 7 bits and the move in the low 9 bits.
-- They are read from the ROM, so randomized learnsets are reported as the game uses them.
local learnsetCache = {}
local function learnLevels(species)
    if learnsetCache[species] ~= nil then return learnsetCache[species] or nil end
    local result = false
    local pointer = read32(addresses.levelUpLearnsets + species * 4)
    if pointer >= 0x08000000 and pointer < 0x0A000000 then
        local levels = array()
        for offset = 0, 126, 2 do
            local entry = read16(pointer + offset)
            if entry == 0xFFFF then result = levels break end
            local level = math.floor(entry / 512)
            if entry % 512 == 0 or level > 100 then break end
            levels[#levels + 1] = level
        end
    end
    learnsetCache[species] = result
    return result or nil
end

local function readPokemon(address)
    local personality = read32(address)
    local trainer = read32(address + 4)
    local key = bit.bxor(personality, trainer)
    local words = {}
    local checksum = 0
    for index = 0, 11 do
        local value = bit.bxor(read32(address + 32 + index * 4), key)
        words[index + 1] = value
        checksum = (checksum + value % 65536 + math.floor(value / 65536)) % 65536
    end
    if checksum ~= read16(address + 28) then error("A Pokémon checksum is invalid; this frame was not sent.") end

    local order, positions = { 0, 1, 2, 3 }, {}
    local permutation = personality % 24
    local divisors = { 6, 2, 1, 1 }
    for slot = 0, 3 do
        local choice = math.floor(permutation / divisors[slot + 1])
        permutation = permutation % divisors[slot + 1]
        positions[table.remove(order, choice + 1)] = slot * 12
    end
    local function value32(block, offset)
        return words[(positions[block] + offset) / 4 + 1]
    end
    local function value16(block, offset)
        local position = positions[block] + offset
        return math.floor(words[math.floor(position / 4) + 1] / 2 ^ ((position % 4) * 8)) % 65536
    end
    local function value8(block, offset)
        local position = positions[block] + offset
        return math.floor(words[math.floor(position / 4) + 1] / 2 ^ ((position % 4) * 8)) % 256
    end
    local ivFlags = value32(3, 4)
    -- Unhatched species, moves, ability and shininess are deliberately not transmitted.
    if bit.band(ivFlags, 0x40000000) ~= 0 then return nil end
    local species = value16(0, 0)
    local info = addresses.speciesInfo + species * 28
    local abilitySlot = math.floor(ivFlags / 2147483648)
    local abilityId = read8(info + 22 + abilitySlot)
    local genderRatio = read8(info + 16)
    local gender = "unknown"
    if genderRatio ~= 255 then gender = personality % 256 < genderRatio and "female" or "male" end
    local shinyValue = bit.bxor(bit.bxor(personality % 65536, math.floor(personality / 65536)),
        bit.bxor(trainer % 65536, math.floor(trainer / 65536)))
    local status = read32(address + 80)
    local statusName = "healthy"
    if bit.band(status, 7) ~= 0 then statusName = "sleep"
    elseif bit.band(status, 0x80) ~= 0 then statusName = "toxic"
    elseif bit.band(status, 0x08) ~= 0 then statusName = "poison"
    elseif bit.band(status, 0x10) ~= 0 then statusName = "burn"
    elseif bit.band(status, 0x20) ~= 0 then statusName = "freeze"
    elseif bit.band(status, 0x40) ~= 0 then statusName = "paralysis" end
    local types = array({ typeNames[read8(info + 6)] })
    local secondType = typeNames[read8(info + 7)]
    if secondType and secondType ~= types[1] then types[#types + 1] = secondType end
    local moves = array()
    local ppBonuses = value8(0, 8)
    for slot = 0, 3 do
        local moveId = value16(1, slot * 2)
        if moveId ~= 0 then
            moves[#moves + 1] = readMove(moveId, value8(1, 8 + slot), math.floor(ppBonuses / 4 ^ slot) % 4)
        end
    end
    local ability
    if abilityId > 0 and abilityId <= 77 then
        ability = textAt(addresses.abilityNames + abilityId * 13, 13):lower():gsub(" ", "-")
        ability = ({ lightningrod = "lightning-rod", compoundeyes = "compound-eyes" })[ability] or ability
    end
    local itemId = value16(0, 2)
    local nickname, readableNickname = textAt(address + 8, 10)
    return {
        identity = hex(personality) .. "-" .. hex(trainer), pokemonId = nationalId(species),
        nickname = readableNickname and nickname or nil, level = read8(address + 84),
        hp = read16(address + 86), maxHp = read16(address + 88), status = statusName,
        isEgg = false, isShiny = shinyValue < 8, gender = gender,
        nature = natures[personality % 25 + 1], ability = ability, types = types,
        abilityId = abilityId > 0 and abilityId <= 77 and abilityId or nil,
        heldItem = itemId > 0 and itemId <= 374 and textAt(addresses.items + itemId * 44, 14) or nil,
        heldItemId = itemId > 0 and itemId <= 374 and itemId or nil,
        experience = value32(0, 4),
        stats = {
            attack = read16(address + 90), defense = read16(address + 92), speed = read16(address + 94),
            ["special-attack"] = read16(address + 96), ["special-defense"] = read16(address + 98),
        },
        moves = moves,
        learnLevels = learnLevels(species),
    }
end

local function json(value)
    local kind = type(value)
    if value == nil then return "null" end
    if kind == "boolean" or kind == "number" then return tostring(value) end
    if kind == "string" then
        return '"' .. value:gsub('[%z\1-\31\\"]', function(character)
            if character == '"' or character == "\\" then return "\\" .. character end
            return string.format("\\u%04x", string.byte(character))
        end) .. '"'
    end
    if kind ~= "table" then error("Unsupported JSON value: " .. kind) end
    local values = {}
    if getmetatable(value) == arrayTag then
        for _, entry in ipairs(value) do values[#values + 1] = json(entry) end
        return "[" .. table.concat(values, ",") .. "]"
    end
    for key, entry in pairs(value) do values[#values + 1] = json(tostring(key)) .. ":" .. json(entry) end
    return "{" .. table.concat(values, ",") .. "}"
end

local sessionId = tostring(os.time()) .. "-" .. tostring(math.random(1, 1000000000))
local romHash
local sequence, battleCounter, observationCounter = 0, 0, 0
local wasInBattle, enemyMoveWritten, stateLoaded = false, false, false
local pendingObservations = array()
local warnings = array()

local function sample()
    if read8(0x080000AC) ~= 66 or read8(0x080000AD) ~= 80 or
        read8(0x080000AE) ~= 82 or read8(0x080000AF) ~= 69 or read8(0x080000BC) ~= 0 then
        error("Only FireRed English revision 1.0 (BPRE) is supported. No data was sent.")
    end
    local count = read8(addresses.partyCount)
    local save1, save2 = read32(addresses.save1), read32(addresses.save2)
    if count == 0 then return nil end
    if count > 6 or save1 < 0x02000000 or save1 > 0x0203F000 or save2 < 0x02000000 or save2 > 0x0203F000 then
        error("The game is not in a readable state. No data was sent.")
    end
    if not romHash then romHash = gameinfo.getromhash() end
    local party = array()
    for slot = 0, count - 1 do
        local pokemon = readPokemon(addresses.party + slot * 100)
        if pokemon then party[#party + 1] = pokemon end
    end
    local inBattle = bit.band(read8(addresses.main + 0x439), 2) ~= 0
    if inBattle and not wasInBattle then battleCounter = battleCounter + 1 end
    wasInBattle = inBattle
    local battle
    if inBattle then
        local flags = read32(addresses.battleFlags)
        local battlers = read8(addresses.battlersCount)
        local opponents = array()
        for slot = 1, math.min(battlers - 1, 3), 2 do
            local address = addresses.battleMons + slot * 88
            local species = read16(address)
            local level = read8(address + 42)
            if species > 0 and species <= 411 and level > 0 and level <= 100 then
                opponents[#opponents + 1] = {
                    identity = hex(read32(address + 72)) .. "-" .. tostring(slot),
                    pokemonId = nationalId(species), level = level,
                    learnLevels = learnLevels(species),
                }
            end
        end
        battle = {
            id = sessionId .. "-battle-" .. battleCounter,
            kind = bit.band(flags, 8) ~= 0 and "trainer" or "wild", opponents = opponents,
        }
        local activeIdentity = hex(read32(addresses.battleMons + 72)) .. "-" .. hex(read32(addresses.battleMons + 84))
        for _, pokemon in ipairs(party) do
            if pokemon.identity == activeIdentity then battle.activePlayerIdentity = activeIdentity end
        end
        -- The results field is written when an opponent announces an attack, not when its hidden moveset is loaded.
        if enemyMoveWritten and battlers == 2 and #opponents == 1 then
            local moveId = read16(addresses.battleResults + 0x24)
            if moveId > 0 and moveId <= 354 then
                observationCounter = observationCounter + 1
                pendingObservations[#pendingObservations + 1] = {
                    id = sessionId .. "-observation-" .. observationCounter,
                    encounterId = battle.id, pokemonId = opponents[1].pokemonId,
                    kind = "move", value = readMove(moveId, 0).name, moveId = moveId,
                }
            end
        end
    end
    enemyMoveWritten = false
    local observations = array()
    for index = 1, math.min(#pendingObservations, 1000) do observations[index] = pendingObservations[index] end
    local frameWarnings = array()
    for _, warning in ipairs(warnings) do frameWarnings[#frameWarnings + 1] = warning end
    if inBattle and read8(addresses.battlersCount) > 2 then
        frameWarnings[#frameWarnings + 1] = "Enemy move observations are limited to single battles in this connector."
    end
    return {
        protocolVersion = 1, connector = "bizhawk-firered-bpre0",
        sessionId = sessionId, sequence = sequence, frame = emu.framecount(),
        game = { gameCode = "BPRE", revision = 0, language = "en", romHash = romHash, trainerId = hex(read32(save2 + 10)) },
        party = party, location = { id = tostring(read8(save1 + 4)) .. "-" .. tostring(read8(save1 + 5)) },
        battle = battle, observations = observations, stateLoaded = stateLoaded, warnings = frameWarnings,
    }
end

if mode == "test" then
    return {
        readPokemon = readPokemon, sample = sample, json = json, array = array,
        markEnemyMove = function() enemyMoveWritten = true end,
        markStateLoaded = function() stateLoaded = true end,
    }
end

if bridgeUrl == "__BRIDGE_URL__" or bridgeToken == "__BRIDGE_TOKEN__" then
    error("Save a configured connector from NuzTracker's Connections panel first.")
end
if emu.getsystemid() ~= "GBA" then error("Load FireRed English 1.0 in a GBA core first.") end
comm.httpSetTimeout(500)
local hookOk, hookError = pcall(function()
    local hook = event.onmemorywrite(function() enemyMoveWritten = true end,
        addresses.battleResults + 0x24, "NuzTracker opponent move", domain)
    if not hook or hook == "" then error("The core did not register the memory callback.") end
end)
if not hookOk then
    local warning = "Enemy move tracking is unavailable on this core: " .. tostring(hookError)
    warnings[#warnings + 1] = warning
    console.log(warning)
end
event.onloadstate(function()
    stateLoaded = true
    wasInBattle = false
    enemyMoveWritten = false
end, "NuzTracker state reconciliation")

local previousParty, lastError, lastSentFrame = "", "", -30
local nextHttpAttempt = 0
console.log("NuzTracker read-only connector started. Keep the desktop application open.")
while true do
    local ok, result = pcall(function()
        local frame = sample()
        if not frame then return end
        local partyState = json(frame.party)
        local currentFrame = emu.framecount()
        if partyState ~= previousParty or #frame.observations > 0 or stateLoaded or
            currentFrame < lastSentFrame or currentFrame - lastSentFrame >= 30 then
            if os.time() < nextHttpAttempt then return end
            sequence = sequence + 1
            frame.sequence = sequence
            local sent, response = pcall(comm.httpPost, bridgeUrl, json({ token = bridgeToken, frame = frame }))
            if not sent or not response or not response:match('"ok"%s*:%s*true') then
                nextHttpAttempt = os.time() + 2
                error("NuzTracker did not save this update: " .. tostring(response))
            end
            for _ = 1, #frame.observations do table.remove(pendingObservations, 1) end
            previousParty = partyState
            stateLoaded = false
            lastSentFrame = currentFrame
        end
    end)
    if not ok and tostring(result) ~= lastError then
        lastError = tostring(result)
        console.log(lastError)
    elseif ok then lastError = "" end
    emu.frameadvance()
end
