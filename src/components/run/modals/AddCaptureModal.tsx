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
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import {
  getAvailableCaptureSpriteOptions,
  getCaptureSpriteOptionMeta,
  searchPokemon,
  getPokemonIdFromUrl,
  getSpriteFallbackUrl,
  getSpriteUrl,
  type CaptureSpriteOption,
  type PokemonSearchResult,
} from "@/lib/pokemon-api";
import { Capture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

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
  const { addCapture } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [selected, setSelected] = useState<{
    name: string;
    id: number;
    names?: { fr?: string; en?: string };
  } | null>(null);
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState(5);
  const [gender, setGender] = useState<Capture["gender"]>("unknown");
  const [isShiny, setIsShiny] = useState(forceShiny);
  const [unownLetter, setUnownLetter] = useState<string | null>(null);
  const [spriteOptions, setSpriteOptions] = useState<CaptureSpriteOption[]>([]);
  const [selectedSpriteUrl, setSelectedSpriteUrl] = useState<string | null>(
    null,
  );
  const [loadingSpriteOptions, setLoadingSpriteOptions] = useState(false);
  const [searching, setSearching] = useState(false);

  const UNOWN_ID = 201;

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
        if (prev && options.some((option) => option.url === prev)) return prev;
        return options[0]?.url ?? null;
      });
      setLoadingSpriteOptions(false);
    }

    loadSpriteOptions();

    return () => {
      cancelled = true;
    };
  }, [selected, isShiny]);

  useEffect(() => {
    if (!selected || selected.id !== UNOWN_ID) return;
    const chosen = spriteOptions.find(
      (option) => option.url === selectedSpriteUrl,
    );
    setUnownLetter(chosen?.unownLetter ?? null);
  }, [selected, spriteOptions, selectedSpriteUrl]);

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
    setSelected({ name: item.name, id, names: item.names });
    setQuery(item.displayName);
    setResults([]);
    setSelectedSpriteUrl(null);
    setSpriteOptions([]);
    if (id !== UNOWN_ID) {
      setUnownLetter(null);
    }
  }

  function handleAdd() {
    if (!selected) return;
    const selectedSprite =
      spriteOptions.find((option) => option.url === selectedSpriteUrl) ?? null;

    addCapture(runId, zoneId, {
      pokemonId: selected.id,
      pokemonName: selected.name,
      pokemonNames: selected.names,
      nickname: nickname || undefined,
      level,
      gender,
      isShiny,
      isDead: false,
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
    });
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
                  {r.displayName}
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
                  const meta = getCaptureSpriteOptionMeta(option);

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
                      title={`${meta.label} • ${meta.sourceLabel}`}
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
                        alt={meta.label}
                        width={44}
                        height={44}
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
                        {meta.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.58rem",
                          lineHeight: 1,
                          textAlign: "center",
                          opacity: isSelectedSprite ? 0.9 : 0.75,
                        }}
                      >
                        {meta.sourceLabel}
                      </Typography>
                    </Box>
                  );
                })}
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

        {/* Level & Gender */}
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
              {t(tr.addCapture.level, lang)}
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={level}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setLevel(isNaN(val) ? 1 : Math.min(100, Math.max(1, val)));
              }}
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
              }}
            />
          </Box>
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
            disabled={!selected}
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
