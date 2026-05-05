"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  IconButton,
  Menu,
  Tooltip,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import {
  getAvailableCaptureSpriteOptions,
  searchPokemon,
  getPokemonIdFromUrl,
  getSpriteFallbackUrl,
  getSpriteUrl,
  fetchPokemon,
  type CaptureSpriteOption,
  type PokemonSearchResult,
} from "@/lib/pokemon-api";
import { Capture, PokemonApiData } from "@/lib/types";
import { TYPES, typeColors } from "@/lib/type-chart";
import { isRandomTypesMode } from "@/lib/capture-types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { useCache } from "@/context/CacheContext";

interface Props {
  runId: string;
  zoneId: string;
  zoneName: string;
  forceShiny?: boolean;
  onClose: () => void;
}

export default function AddCaptureModal({
  runId,
  zoneId,
  zoneName,
  forceShiny = false,
  onClose,
}: Props) {
  const { addCapture, runs } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [selected, setSelected] = useState<{
    name: string;
    id: number;
    names?: { fr?: string; en?: string };
  } | null>(null);
  const [pokemonData, setPokemonData] = useState<PokemonApiData | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Capture["gender"]>("unknown");
  const [isShiny, setIsShiny] = useState(forceShiny);
  const [unownLetter, setUnownLetter] = useState<string | null>(null);
  const [spriteOptions, setSpriteOptions] = useState<CaptureSpriteOption[]>([]);
  const [selectedSpriteUrl, setSelectedSpriteUrl] = useState<string | null>(
    null,
  );
  const [loadingSpriteOptions, setLoadingSpriteOptions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [typePickerAnchorEl, setTypePickerAnchorEl] =
    useState<HTMLElement | null>(null);
  const [typePickerSlot, setTypePickerSlot] = useState<0 | 1 | null>(null);
  const [customTypesDraft, setCustomTypesDraft] = useState<string[]>([]);
  const [showSecondTypeSlot, setShowSecondTypeSlot] = useState(false);

  const UNOWN_ID = 201;
  const run = runs.find((candidate) => candidate.id === runId);
  const randomTypesMode = isRandomTypesMode(run);
  const randomAbilitiesMode = Boolean(
    run?.isRandomMode && run.randomizerOptions?.randomizeAbilities,
  );
  const { abilities: abilitiesCache } = useCache();
  const firstType = customTypesDraft[0] || null;
  const secondType = customTypesDraft[1] || null;
  const hasSecondTypeSlot = showSecondTypeSlot || Boolean(secondType);
  const [customAbilityDraft, setCustomAbilityDraft] = useState<string | null>(
    null,
  );
  // Panel of up to 3 possible abilities for the selected Pokémon species
  const [abilityPanelDraft, setAbilityPanelDraft] = useState<string[]>([]);
  const [abilitySearch, setAbilitySearch] = useState("");

  useEffect(() => {
    // Reset ability draft & panel when Pokémon changes; pre-fill panel from run
    setCustomAbilityDraft(null);
    setAbilitySearch("");
    if (selected && run?.customAbilitiesByPokemonId) {
      setAbilityPanelDraft(run.customAbilitiesByPokemonId[selected.id] ?? []);
    } else {
      setAbilityPanelDraft([]);
    }

    // Load pokemon data
    if (selected) {
      fetchPokemon(selected.id)
        .then(setPokemonData)
        .catch(() => setPokemonData(null));
    } else {
      setPokemonData(null);
    }
  }, [selected, run?.customAbilitiesByPokemonId]);

  const canAddCapture = Boolean(
    selected && (!randomTypesMode || customTypesDraft.length > 0),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSpriteOptions() {
      if (!selected) {
        setSpriteOptions([]);
        setSelectedSpriteUrl(null);
        return;
      }

      setLoadingSpriteOptions(true);
      const options = await getAvailableCaptureSpriteOptions({
        pokemonId: selected.id,
        pokemonName: selected.name,
        isShiny,
      });

      if (cancelled) return;

      setSpriteOptions(options);
      setSelectedSpriteUrl((prev) => {
        const nextSelectedUrl =
          prev && options.some((option) => option.url === prev)
            ? prev
            : (options[0]?.url ?? null);

        if (selected.id === UNOWN_ID) {
          const selectedOption = options.find(
            (option) => option.url === nextSelectedUrl,
          );
          setUnownLetter(selectedOption?.unownLetter ?? null);
        }

        return nextSelectedUrl;
      });
      setLoadingSpriteOptions(false);
    }

    loadSpriteOptions();

    return () => {
      cancelled = true;
    };
  }, [selected, isShiny]);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (query.length < 2) {
        if (!cancelled) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      if (!cancelled) {
        setSearching(true);
      }

      const r = await searchPokemon(query, lang);

      if (cancelled) return;

      setResults(r);
      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query, lang]);

  async function handleSelect(item: PokemonSearchResult) {
    const id = getPokemonIdFromUrl(item.url);
    setSelected({ name: item.technicalName, id, names: item.names });
    setQuery(item.displayName);
    setResults([]);
    setSelectedSpriteUrl(null);
    setSpriteOptions([]);
    if (id !== UNOWN_ID) {
      setUnownLetter(null);
    }

    const knownTypes = run?.customTypesByPokemonId?.[id] ?? [];
    setCustomTypesDraft(knownTypes);
    setShowSecondTypeSlot(Boolean(knownTypes[1]));
  }

  function openTypePicker(slot: 0 | 1, event: React.MouseEvent<HTMLElement>) {
    setTypePickerSlot(slot);
    setTypePickerAnchorEl(event.currentTarget);
  }

  function closeTypePicker() {
    setTypePickerAnchorEl(null);
    setTypePickerSlot(null);
  }

  function setCustomType(slot: 0 | 1, typeName: string) {
    const nextTypes = [...customTypesDraft];
    nextTypes[slot] = typeName;

    if (slot === 1) {
      setShowSecondTypeSlot(true);
    }

    if (nextTypes[0] && nextTypes[1] && nextTypes[0] === nextTypes[1]) {
      nextTypes.splice(1, 1);
      setShowSecondTypeSlot(false);
    }

    setCustomTypesDraft(nextTypes.filter(Boolean));
  }

  function addSecondType() {
    setShowSecondTypeSlot(true);
  }

  function removeSecondType() {
    const nextTypes = [...customTypesDraft];
    nextTypes.splice(1, 1);
    setShowSecondTypeSlot(false);
    setCustomTypesDraft(nextTypes.filter(Boolean));
  }

  function handleAdd() {
    if (!selected || !canAddCapture) return;
    const selectedSprite =
      spriteOptions.find((option) => option.url === selectedSpriteUrl) ?? null;

    addCapture(
      runId,
      zoneId,
      {
        pokemonId: selected.id,
        pokemonName: selected.name,
        pokemonNames: selected.names,
        nickname: nickname || undefined,
        gender,
        isShiny,
        isDead: false,
        ...(customAbilityDraft ? { ability: customAbilityDraft } : {}),
        ...(randomTypesMode && customTypesDraft.length > 0
          ? { customTypes: customTypesDraft }
          : {}),
        ...(selectedSprite
          ? {
              selectedSprite: {
                url: selectedSprite.url,
                source: selectedSprite.source,
                label: selectedSprite.label,
                ...(selectedSprite.unownLetter
                  ? { unownLetter: selectedSprite.unownLetter }
                  : {}),
                ...(selectedSprite.flabebeColor
                  ? { flabebeColor: selectedSprite.flabebeColor }
                  : {}),
              },
            }
          : {}),
        ...(selected.id === UNOWN_ID
          ? {
              unownLetter:
                selectedSprite?.unownLetter ?? unownLetter ?? undefined,
            }
          : {}),
        ...(selectedSprite?.flabebeColor
          ? { flabebeColor: selectedSprite.flabebeColor }
          : {}),
      },
      // Pass the ability panel so it gets persisted on the run
      randomAbilitiesMode && abilityPanelDraft.length > 0
        ? abilityPanelDraft
        : undefined,
    );
    onClose();
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
        animation: "fadeIn 300ms ease",
        "@keyframes fadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          background: "#FEF3E2",
          borderRadius: "1.5rem",
          p: 3,
          width: "100%",
          maxWidth: "448px",
          border: "3px solid #000",
          boxShadow: "0 20px 25px rgba(0, 0, 0, 0.2)",
          animation: "slideUp 300ms ease",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#000" }}
          >
            {t(tr.addCapture.title, lang)}
          </Typography>
          <Typography sx={{ color: "#666", fontSize: "0.875rem", mt: 0.25 }}>
            📍 {zoneName}
          </Typography>
        </Box>

        {/* Pokemon search */}
        <Box sx={{ position: "relative", mb: 2 }}>
          <Typography
            component="label"
            sx={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#000",
              mb: 1.5,
            }}
          >
            {t(tr.addCapture.pokemonLabel, lang)}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              placeholder={t(tr.addCapture.searchPlaceholder, lang)}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "#fff",
                  color: "#000",
                  fontSize: "0.875rem",
                  "& fieldset": {
                    borderColor: "#000",
                  },
                  "&:hover fieldset": {
                    borderColor: "#000",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)",
                  },
                },
                "& .MuiOutlinedInput-input::placeholder": {
                  color: "#999",
                  opacity: 1,
                },
              }}
            />
            {selected && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  selectedSpriteUrl ??
                  getSpriteUrl(
                    selected.id,
                    isShiny,
                    true,
                    unownLetter ?? undefined,
                  )
                }
                alt={`${isShiny ? "Shiny " : ""}${selected.name} sprite`}
                onError={(event) => {
                  const fallbackUrl = getSpriteFallbackUrl(
                    selected.id,
                    isShiny,
                    unownLetter ?? undefined,
                  );
                  if (event.currentTarget.src !== fallbackUrl) {
                    event.currentTarget.src = fallbackUrl;
                  }
                }}
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                }}
              />
            )}
          </Box>
          {results.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "2px solid #000",
                borderRadius: "0.75rem",
                mt: 0.5,
                maxHeight: "192px",
                overflowY: "auto",
                zIndex: 10,
                boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              {results.map((r) => (
                <Box
                  key={r.url}
                  component="button"
                  onClick={() => handleSelect(r)}
                  sx={{
                    width: "100%",
                    textAlign: "left",
                    px: 1.5,
                    py: 1,
                    background: "transparent",
                    border: "none",
                    fontSize: "0.875rem",
                    textTransform: "capitalize",
                    color: "#000",
                    cursor: "pointer",
                    transition: "background-color 200ms",
                    "&:hover": {
                      background: "#f0f0f0",
                    },
                    "&:first-of-type": {
                      borderTopLeftRadius: "0.75rem",
                      borderTopRightRadius: "0.75rem",
                    },
                    "&:last-of-type": {
                      borderBottomLeftRadius: "0.75rem",
                      borderBottomRightRadius: "0.75rem",
                    },
                  }}
                >
                  {`${r.displayName} (${r.technicalName})`}
                </Box>
              ))}
            </Box>
          )}
          {searching && (
            <Typography sx={{ fontSize: "0.75rem", color: "#666", mt: 0.5 }}>
              {t(tr.addCapture.searching, lang)}
            </Typography>
          )}
        </Box>

        {/* Sprite selection */}
        {selected && (
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#000",
                mb: 1,
              }}
            >
              {t(tr.addCapture.sprite, lang)}
            </Typography>

            {loadingSpriteOptions ? (
              <Typography sx={{ fontSize: "0.75rem", color: "#666" }}>
                {t(tr.addCapture.loadingSprites, lang)}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 0.75,
                  maxHeight: "220px",
                  overflowY: "auto",
                  pr: 0.25,
                }}
              >
                {spriteOptions.map((option) => {
                  const isSelectedSprite = selectedSpriteUrl === option.url;
                  const sourceTitle =
                    option.source === "deviantart"
                      ? "DeviantArt"
                      : option.source === "animated-catalog"
                        ? "Animated"
                        : "Static";

                  return (
                    <Box
                      key={option.url}
                      component="button"
                      onClick={() => {
                        setSelectedSpriteUrl(option.url);
                        if (selected.id === UNOWN_ID) {
                          setUnownLetter(option.unownLetter ?? null);
                        }
                      }}
                      title={`${sourceTitle} • ${option.label}`}
                      sx={{
                        background: isSelectedSprite ? "#3b82f6" : "#fff",
                        border: isSelectedSprite
                          ? "2px solid #1d4ed8"
                          : "2px solid #000",
                        borderRadius: "0.5rem",
                        color: isSelectedSprite ? "#fff" : "#000",
                        cursor: "pointer",
                        p: 0.5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.25,
                        minHeight: "90px",
                        transition: "all 150ms",
                        "&:hover": {
                          background: isSelectedSprite ? "#2563eb" : "#f0f0f0",
                        },
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={option.url}
                        alt={option.label}
                        width={56}
                        height={56}
                        style={{
                          objectFit: "contain",
                          imageRendering: "pixelated",
                        }}
                        loading="lazy"
                      />
                      <Typography
                        sx={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          lineHeight: 1,
                          textAlign: "center",
                          textTransform: "uppercase",
                        }}
                      >
                        {sourceTitle}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* Randomizer type assignment */}
        {selected && randomTypesMode && (
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#000",
                mb: 1,
              }}
            >
              {t(tr.addCapture.randomTypes, lang)}
            </Typography>

            <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
              <Tooltip title={t(tr.addCapture.chooseType, lang)}>
                <Box
                  component="button"
                  onClick={(event) => openTypePicker(0, event)}
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: firstType ? "#fff" : "#000",
                    textTransform: "capitalize",
                    background: firstType
                      ? (typeColors[firstType] ?? "#888")
                      : "#fef3c7",
                    border: "2px solid #000",
                    cursor: "pointer",
                  }}
                >
                  {firstType ?? t(tr.addCapture.unknownType, lang)}
                </Box>
              </Tooltip>

              {!hasSecondTypeSlot && (
                <Tooltip title={t(tr.addCapture.addSecondType, lang)}>
                  <IconButton
                    size="small"
                    onClick={addSecondType}
                    sx={{
                      border: "2px solid #000",
                      borderRadius: "999px",
                      width: "24px",
                      height: "24px",
                      background: "#fff",
                      fontWeight: 800,
                      fontSize: "0.75rem",
                    }}
                  >
                    +
                  </IconButton>
                </Tooltip>
              )}

              {hasSecondTypeSlot && (
                <>
                  <Tooltip title={t(tr.addCapture.chooseType, lang)}>
                    <Box
                      component="button"
                      onClick={(event) => openTypePicker(1, event)}
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: secondType ? "#fff" : "#000",
                        textTransform: "capitalize",
                        background: secondType
                          ? (typeColors[secondType] ?? "#888")
                          : "#fef3c7",
                        border: "2px solid #000",
                        cursor: "pointer",
                      }}
                    >
                      {secondType ?? t(tr.addCapture.unknownType, lang)}
                    </Box>
                  </Tooltip>

                  <Tooltip title={t(tr.addCapture.removeSecondType, lang)}>
                    <IconButton
                      size="small"
                      onClick={removeSecondType}
                      sx={{
                        border: "2px solid #000",
                        borderRadius: "999px",
                        width: "24px",
                        height: "24px",
                        background: "#fff",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                      }}
                    >
                      -
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>

            {!firstType && (
              <Typography
                sx={{
                  mt: 0.75,
                  fontSize: "0.72rem",
                  color: "#b91c1c",
                  fontWeight: 600,
                }}
              >
                {t(tr.addCapture.firstTypeRequired, lang)}
              </Typography>
            )}

            <Menu
              anchorEl={typePickerAnchorEl}
              open={Boolean(typePickerAnchorEl)}
              onClose={closeTypePicker}
              keepMounted
            >
              {TYPES.map((typeName) => (
                <MenuItem
                  key={typeName}
                  onClick={() => {
                    if (typePickerSlot !== null) {
                      setCustomType(typePickerSlot, typeName);
                    }
                    closeTypePicker();
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    textTransform: "capitalize",
                  }}
                >
                  <Box
                    sx={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "999px",
                      background: typeColors[typeName] ?? "#888",
                      border: "1px solid #000",
                    }}
                  />
                  {typeName}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}

        {/* Display pokemon abilities in classic mode (clickable to select) */}
        {selected &&
          !randomAbilitiesMode &&
          pokemonData &&
          pokemonData.abilities.length > 0 &&
          abilityPanelDraft.length === 0 && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}
              >
                {pokemonData.abilities.map((abilityEntry) => {
                  const abilityName = abilityEntry.ability.name;
                  const cachedEntry = abilitiesCache.abilities.find(
                    (a) => a.name === abilityName,
                  );
                  const displayName =
                    lang === "fr"
                      ? (cachedEntry?.names?.fr ?? abilityName)
                      : (cachedEntry?.names?.en ?? abilityName);
                  const effect =
                    lang === "fr"
                      ? (cachedEntry?.effects?.fr ?? "")
                      : (cachedEntry?.effects?.en ?? "");
                  const isSelected = customAbilityDraft === abilityName;
                  return (
                    <Tooltip key={abilityName} title={effect} placement="top">
                      <Box
                        component="button"
                        onClick={() => setCustomAbilityDraft(abilityName)}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1,
                          py: 0.25,
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          background: isSelected
                            ? abilityEntry.is_hidden
                              ? "#d97706"
                              : "#0284c7"
                            : abilityEntry.is_hidden
                              ? "#fef3c7"
                              : "#e0f2fe",
                          border: `2px solid ${
                            isSelected
                              ? abilityEntry.is_hidden
                                ? "#92400e"
                                : "#0c4a6e"
                              : abilityEntry.is_hidden
                                ? "#d97706"
                                : "#0284c7"
                          }`,
                          color: isSelected
                            ? "#fff"
                            : abilityEntry.is_hidden
                              ? "#92400e"
                              : "#0c4a6e",
                          cursor: "pointer",
                          transition: "all 150ms",
                          "&:hover": {
                            background: isSelected
                              ? abilityEntry.is_hidden
                                ? "#b45309"
                                : "#1d4ed8"
                              : abilityEntry.is_hidden
                                ? "#fde68a"
                                : "#bfdbfe",
                            transform: "scale(1.05)",
                          },
                        }}
                      >
                        {displayName}
                        {abilityEntry.is_hidden && (
                          <span
                            title={
                              lang === "fr" ? "Talent caché" : "Hidden ability"
                            }
                            style={{ fontSize: "0.65rem" }}
                          >
                            ✦
                          </span>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>

              {/* Captured ability label */}
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#666",
                  mb: 0.5,
                }}
              >
                {t(tr.addCapture.capturedAbility, lang)}
              </Typography>

              {/* Captured ability chip */}
              {customAbilityDraft && (
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "#0284c7",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    ✓{" "}
                    {(() => {
                      const entry = abilitiesCache.abilities.find(
                        (a) => a.name === customAbilityDraft,
                      );
                      return lang === "fr"
                        ? (entry?.names?.fr ?? customAbilityDraft)
                        : (entry?.names?.en ?? customAbilityDraft);
                    })()}
                  </span>
                </Typography>
              )}
            </Box>
          )}

        {/* Display ability panel in classic mode (if custom panel exists) */}
        {selected && !randomAbilitiesMode && abilityPanelDraft.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}>
              {abilityPanelDraft.map((abilityName) => {
                const entry = abilitiesCache.abilities.find(
                  (a) => a.name === abilityName,
                );
                const displayName =
                  lang === "fr"
                    ? (entry?.names?.fr ?? abilityName)
                    : (entry?.names?.en ?? abilityName);
                const effect =
                  lang === "fr"
                    ? (entry?.effects?.fr ?? "")
                    : (entry?.effects?.en ?? "");
                const isSelected = customAbilityDraft === abilityName;
                return (
                  <Tooltip key={abilityName} title={effect} placement="top">
                    <Box
                      component="button"
                      onClick={() => setCustomAbilityDraft(abilityName)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background: isSelected ? "#0369a1" : "#0284c7",
                        border: `2px solid ${isSelected ? "#082f49" : "#0369a1"}`,
                        color: "#fff",
                        cursor: "pointer",
                        transition: "all 150ms",
                        "&:hover": {
                          background: "#0369a1",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      {displayName}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>

            {/* Captured ability label */}
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#666",
                mb: 0.5,
              }}
            >
              {t(tr.addCapture.capturedAbility, lang)}
            </Typography>

            {/* Captured ability chip */}
            {customAbilityDraft && (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "#0284c7",
                  fontWeight: 600,
                }}
              >
                <span style={{ textTransform: "capitalize" }}>
                  ✓{" "}
                  {(() => {
                    const entry = abilitiesCache.abilities.find(
                      (a) => a.name === customAbilityDraft,
                    );
                    return lang === "fr"
                      ? (entry?.names?.fr ?? customAbilityDraft)
                      : (entry?.names?.en ?? customAbilityDraft);
                  })()}
                </span>
              </Typography>
            )}
          </Box>
        )}

        {/* Display pokemon abilities in randomizer mode (clickable with panel add button) */}
        {/* Randomizer ability assignment */}
        {selected && randomAbilitiesMode && (
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#000",
                mb: 0.5,
              }}
            >
              {t(tr.addCapture.abilityPanel, lang)}
            </Typography>

            {/* Panel chips — always shown */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
              {abilityPanelDraft.map((abilityName) => {
                const entry = abilitiesCache.abilities.find(
                  (a) => a.name === abilityName,
                );
                const displayName =
                  lang === "fr"
                    ? (entry?.names?.fr ?? abilityName)
                    : (entry?.names?.en ?? abilityName);
                const effect =
                  lang === "fr"
                    ? (entry?.effects?.fr ?? "")
                    : (entry?.effects?.en ?? "");
                const isSelected = customAbilityDraft === abilityName;
                return (
                  <Tooltip key={abilityName} title={effect} placement="top">
                    <Box
                      component="button"
                      onClick={() => {
                        setCustomAbilityDraft(isSelected ? null : abilityName);
                        setAbilitySearch("");
                      }}
                      aria-pressed={isSelected}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: isSelected ? "#0284c7" : "#e0f2fe",
                        border: `2px solid ${isSelected ? "#0369a1" : "#0284c7"}`,
                        color: isSelected ? "#fff" : "#0c4a6e",
                        transition: "all 150ms",
                      }}
                    >
                      <span style={{ textTransform: "capitalize" }}>
                        {displayName}
                      </span>
                    </Box>
                  </Tooltip>
                );
              })}
              {abilityPanelDraft.length === 0 && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  —
                </Typography>
              )}
            </Box>

            {/* Hint text */}
            <Typography sx={{ fontSize: "0.7rem", color: "#666", mb: 0.75 }}>
              {abilityPanelDraft.length >= 3
                ? t(tr.addCapture.abilityPanelFull, lang)
                : t(tr.addCapture.abilityPanelHint, lang)}
            </Typography>

            {/* Search to add to panel (hidden when panel is full) */}
            {abilityPanelDraft.length < 3 && (
              <Box sx={{ position: "relative" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t(
                    tr.addCapture.abilitiesSearchPlaceholder,
                    lang,
                  )}
                  value={abilitySearch}
                  onChange={(e) => setAbilitySearch(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "#fff",
                      color: "#000",
                      fontSize: "0.875rem",
                      "& fieldset": { borderColor: "#000" },
                    },
                  }}
                />
                {abilitySearch.length >= 2 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "2px solid #000",
                      borderRadius: "0.75rem",
                      mt: 0.5,
                      maxHeight: "160px",
                      overflowY: "auto",
                      zIndex: 10,
                      boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
                    }}
                  >
                    {(() => {
                      const searchLower = abilitySearch.toLowerCase();
                      const filtered = abilitiesCache.abilities.filter(
                        (a) =>
                          !abilityPanelDraft.includes(a.name) &&
                          (a.name.toLowerCase().includes(searchLower) ||
                            a.names?.fr?.toLowerCase().includes(searchLower) ||
                            a.names?.en?.toLowerCase().includes(searchLower)),
                      );
                      return (
                        <>
                          {filtered.slice(0, 8).map((a) => {
                            const displayName =
                              lang === "fr"
                                ? (a.names?.fr ?? a.name)
                                : (a.names?.en ?? a.name);
                            const effect =
                              lang === "fr"
                                ? (a.effects?.fr ?? "")
                                : (a.effects?.en ?? "");
                            return (
                              <Tooltip
                                key={a.name}
                                title={effect}
                                placement="left"
                              >
                                <Box
                                  component="button"
                                  onClick={() => {
                                    // Add to panel and select as captured ability
                                    setAbilityPanelDraft((prev) =>
                                      prev.length < 3 && !prev.includes(a.name)
                                        ? [...prev, a.name]
                                        : prev,
                                    );
                                    setCustomAbilityDraft(a.name);
                                    setAbilitySearch("");
                                  }}
                                  sx={{
                                    width: "100%",
                                    textAlign: "left",
                                    px: 1.5,
                                    py: 0.75,
                                    background: "transparent",
                                    border: "none",
                                    fontSize: "0.875rem",
                                    textTransform: "capitalize",
                                    color: "#000",
                                    cursor: "pointer",
                                    "&:hover": { background: "#f0f0f0" },
                                    "&:first-of-type": {
                                      borderTopLeftRadius: "0.75rem",
                                      borderTopRightRadius: "0.75rem",
                                    },
                                    "&:last-of-type": {
                                      borderBottomLeftRadius: "0.75rem",
                                      borderBottomRightRadius: "0.75rem",
                                    },
                                  }}
                                >
                                  {displayName}
                                </Box>
                              </Tooltip>
                            );
                          })}
                          {filtered.length === 0 && (
                            <Box
                              sx={{
                                px: 1.5,
                                py: 1,
                                color: "#666",
                                fontSize: "0.875rem",
                              }}
                            >
                              {t(tr.addCapture.noAbilityResult, lang)}
                            </Box>
                          )}
                        </>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            )}

            {/* Captured ability label and chip */}
            {customAbilityDraft && (
              <Box sx={{ mt: 1.5 }}>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#666",
                    mb: 0.5,
                  }}
                >
                  {t(tr.addCapture.capturedAbility, lang)}
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background: "#0284c7",
                    border: "2px solid #0369a1",
                    color: "#fff",
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    ✓{" "}
                    {(() => {
                      const entry = abilitiesCache.abilities.find(
                        (a) => a.name === customAbilityDraft,
                      );
                      return lang === "fr"
                        ? (entry?.names?.fr ?? customAbilityDraft)
                        : (entry?.names?.en ?? customAbilityDraft);
                    })()}
                  </span>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Nickname */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            component="label"
            sx={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#000",
              mb: 1.5,
            }}
          >
            {t(tr.addCapture.nickname, lang)}
          </Typography>
          <TextField
            fullWidth
            placeholder={t(tr.addCapture.nicknamePlaceholder, lang)}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "#fff",
                color: "#000",
                fontSize: "0.875rem",
                "& fieldset": {
                  borderColor: "#000",
                },
                "&:hover fieldset": {
                  borderColor: "#000",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)",
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                color: "#999",
                opacity: 1,
              },
            }}
          />
        </Box>

        {/* Gender */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              component="label"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#000",
                mb: 1.5,
              }}
            >
              {t(tr.addCapture.gender, lang)}
            </Typography>
            <Select
              fullWidth
              value={gender}
              onChange={(e) => setGender(e.target.value as Capture["gender"])}
              sx={{
                background: "#fff",
                color: "#000",
                fontSize: "0.875rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#000",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#000",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)",
                },
                "& .MuiSvgIcon-root": {
                  color: "#000",
                },
              }}
            >
              <MenuItem value="unknown">
                {t(tr.addCapture.genderUnknown, lang)}
              </MenuItem>
              <MenuItem value="male">
                {t(tr.addCapture.genderMale, lang)}
              </MenuItem>
              <MenuItem value="female">
                {t(tr.addCapture.genderFemale, lang)}
              </MenuItem>
            </Select>
          </Box>
        </Box>

        {/* Shiny toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={isShiny}
              onChange={(e) => !forceShiny && setIsShiny(e.target.checked)}
              disabled={forceShiny}
              sx={{
                "& .MuiSwitch-switchBase": {
                  color: "#ccc",
                  "&.Mui-checked": {
                    color: "#3b82f6",
                  },
                },
                "& .MuiSwitch-track": {
                  background: "#ddd",
                },
              }}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.875rem", color: "#000" }}>
              {t(tr.addCapture.isShiny, lang)}
              {forceShiny && (
                <Typography
                  component="span"
                  sx={{ fontSize: "0.75rem", color: "#f59e0b", ml: 0.5 }}
                >
                  ✨
                </Typography>
              )}
            </Typography>
          }
          sx={{ mb: selected?.id === UNOWN_ID ? 1.5 : 2.5, ml: 0 }}
        />

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            onClick={onClose}
            sx={{
              flex: 1,
              background: "#e5e5e5",
              color: "#000",
              py: 1.5,
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "none",
              border: "2px solid #000",
              transition: "all 200ms",
              "&:hover": {
                background: "#ccc",
              },
            }}
          >
            {t(tr.addCapture.cancel, lang)}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!canAddCapture}
            sx={{
              flex: 1,
              background: "linear-gradient(to right, #3b82f6, #1d4ed8)",
              color: "#fff",
              py: 1.5,
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              textTransform: "none",
              transition: "all 200ms",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              border: "2px solid transparent",
              "&:hover": {
                boxShadow: "0 8px 12px rgba(0, 0, 0, 0.15)",
              },
              "&:disabled": {
                opacity: 0.4,
                cursor: "not-allowed",
                boxShadow: "none",
              },
            }}
          >
            {t(tr.addCapture.add, lang)}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
