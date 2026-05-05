"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { Capture, PokemonApiData } from "@/lib/types";
import {
  fetchPokemon,
  getAvailableCaptureSpriteOptions,
  getCaptureSpriteOptionMeta,
  getCaptureSpriteFallbackUrl,
  getCaptureSpriteUrl,
  type CaptureSpriteOption,
} from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";
import { TYPES } from "@/lib/type-chart";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import {
  useCaptureDisplayLabel,
  useCaptureDisplayName,
} from "@/lib/pokemon-display";
import { useRunStore } from "@/store/runStore";
import { useCache } from "@/context/CacheContext";

interface Props {
  capture: Capture;
  runId?: string;
  onClose: () => void;
}

function StatBar({
  name,
  value,
  max = 255,
  speedLabel,
}: {
  name: string;
  value: number;
  max?: number;
  speedLabel: string;
}) {
  const statLabels: Record<string, string> = {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    "special-attack": "SpA",
    "special-defense": "SpD",
    speed: speedLabel,
  };

  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#3b82f6" : "#ef4444";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography
        component="div"
        sx={{
          fontSize: "0.75rem",
          color: "#666",
          width: "32px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {statLabels[name] ?? name}
      </Typography>
      <Box
        sx={{
          flex: 1,
          background: "#e5e5e5",
          borderRadius: "999px",
          height: "6px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "999px",
            transition: "width 500ms ease",
            background: color,
            width: `${pct}%`,
          }}
        />
      </Box>
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: "#666",
          width: "28px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function PokemonDetailModal({
  capture,
  runId,
  onClose,
}: Props) {
  const UNOWN_ID = 201;
  const [data, setData] = useState<PokemonApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSpriteOptions, setLoadingSpriteOptions] = useState(false);
  const [spriteOptions, setSpriteOptions] = useState<CaptureSpriteOption[]>([]);
  const [selectedSpriteUrl, setSelectedSpriteUrl] = useState<string | null>(
    capture.selectedSprite?.url ?? null,
  );
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [customTypesDraft, setCustomTypesDraft] = useState<string[] | null>(
    null,
  );
  const [showSecondTypeSlot, setShowSecondTypeSlot] = useState(false);
  const [typePickerAnchorEl, setTypePickerAnchorEl] =
    useState<HTMLElement | null>(null);
  const [typePickerSlot, setTypePickerSlot] = useState<0 | 1 | null>(null);
  const [abilityDraft, setAbilityDraft] = useState<string | null>(
    capture.ability ?? null,
  );
  const [abilitySearch, setAbilitySearch] = useState("");
  const { lang } = useLanguage();
  const { runs, updateRun } = useRunStore();
  const { abilities: abilitiesCache } = useCache();
  const tr = translations;
  const pokemonDisplayName = useCaptureDisplayName(capture, lang);
  const pokemonDisplayLabel = useCaptureDisplayLabel(capture, lang);
  const baseStatTotal = data
    ? data.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
    : 0;
  const runToUpdate = runId ? runs.find((r) => r.id === runId) : null;
  const currentNickname = capture.nickname ?? "";
  const runCustomTypes =
    runToUpdate?.customTypesByPokemonId?.[capture.pokemonId];
  const isRandomTypeMode = Boolean(
    runToUpdate?.isRandomMode && runToUpdate.randomizerOptions?.randomizeTypes,
  );
  const isRandomAbilitiesMode = Boolean(
    runToUpdate?.isRandomMode &&
      runToUpdate.randomizerOptions?.randomizeAbilities,
  );
  const persistedCustomTypes = capture.customTypes ?? runCustomTypes ?? [];
  const activeCustomTypes = customTypesDraft ?? persistedCustomTypes;
  const hasSecondTypeSlot = showSecondTypeSlot || Boolean(activeCustomTypes[1]);
  const firstType = activeCustomTypes[0] || null;
  const secondType = activeCustomTypes[1] || null;
  const activeAbility = abilityDraft;

  useEffect(() => {
    fetchPokemon(capture.pokemonId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [capture.pokemonId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSpriteOptions() {
      setLoadingSpriteOptions(true);
      const options = await getAvailableCaptureSpriteOptions({
        pokemonId: capture.pokemonId,
        pokemonName: capture.pokemonName,
        isShiny: capture.isShiny,
      });

      if (cancelled) return;

      setSpriteOptions(options);
      setSelectedSpriteUrl((prev) => {
        if (prev && options.some((option) => option.url === prev)) return prev;
        if (
          capture.selectedSprite?.url &&
          options.some((option) => option.url === capture.selectedSprite?.url)
        ) {
          return capture.selectedSprite.url;
        }
        return options[0]?.url ?? null;
      });
      setLoadingSpriteOptions(false);
    }

    loadSpriteOptions();

    return () => {
      cancelled = true;
    };
  }, [
    capture.isShiny,
    capture.pokemonId,
    capture.pokemonName,
    capture.selectedSprite?.url,
  ]);

  const genderSymbol =
    capture.gender === "male" ? "♂" : capture.gender === "female" ? "♀" : null;
  const genderColor = capture.gender === "male" ? "#60a5fa" : "#ec4899";

  function updateCaptureInRun(updater: (target: Capture) => Capture) {
    if (!runToUpdate) return;

    const updatedRun = {
      ...runToUpdate,
      team: runToUpdate.team.map((teamCapture) =>
        teamCapture.id === capture.id ? updater(teamCapture) : teamCapture,
      ),
      zones: runToUpdate.zones.map((zone) => ({
        ...zone,
        captures: zone.captures.map((zoneCapture) =>
          zoneCapture.id === capture.id ? updater(zoneCapture) : zoneCapture,
        ),
      })),
    };

    updateRun(updatedRun);
  }

  function handleSaveNickname() {
    if (!runToUpdate) return;

    const normalizedNickname = nicknameDraft.trim();
    const nextNickname =
      normalizedNickname.length > 0 ? normalizedNickname : undefined;

    if (nextNickname === capture.nickname) {
      setIsEditingNickname(false);
      return;
    }

    updateCaptureInRun((target) => ({ ...target, nickname: nextNickname }));
    setIsEditingNickname(false);
  }

  function handleSelectSprite(url: string) {
    setSelectedSpriteUrl(url);
    if (!runToUpdate) return;

    const selectedOption = spriteOptions.find((option) => option.url === url);
    if (!selectedOption) return;

    updateCaptureInRun((target) => ({
      ...target,
      selectedSprite: {
        url: selectedOption.url,
        source: selectedOption.source,
        label: selectedOption.label,
        ...(selectedOption.unownLetter
          ? { unownLetter: selectedOption.unownLetter }
          : {}),
        ...(selectedOption.flabebeColor
          ? { flabebeColor: selectedOption.flabebeColor }
          : {}),
      },
      ...(capture.pokemonId === UNOWN_ID && selectedOption.unownLetter
        ? { unownLetter: selectedOption.unownLetter }
        : {}),
      ...(selectedOption.flabebeColor
        ? { flabebeColor: selectedOption.flabebeColor }
        : {}),
    }));
  }

  function openTypePicker(slot: 0 | 1, event: React.MouseEvent<HTMLElement>) {
    setTypePickerSlot(slot);
    setTypePickerAnchorEl(event.currentTarget);
  }

  function closeTypePicker() {
    setTypePickerAnchorEl(null);
    setTypePickerSlot(null);
  }

  function persistCustomTypes(nextTypes: string[]) {
    const compactTypes = nextTypes.filter(Boolean);
    setCustomTypesDraft(compactTypes);

    if (!runToUpdate) return;

    const customTypesByPokemonId = {
      ...(runToUpdate.customTypesByPokemonId ?? {}),
    };
    if (compactTypes.length > 0) {
      customTypesByPokemonId[capture.pokemonId] = compactTypes;
    } else {
      delete customTypesByPokemonId[capture.pokemonId];
    }

    const nextRun = {
      ...runToUpdate,
      customTypesByPokemonId:
        Object.keys(customTypesByPokemonId).length > 0
          ? customTypesByPokemonId
          : undefined,
      team: runToUpdate.team.map((teamCapture) =>
        teamCapture.pokemonId === capture.pokemonId
          ? {
              ...teamCapture,
              customTypes: compactTypes.length > 0 ? compactTypes : undefined,
            }
          : teamCapture,
      ),
      zones: runToUpdate.zones.map((zone) => ({
        ...zone,
        captures: zone.captures.map((zoneCapture) =>
          zoneCapture.pokemonId === capture.pokemonId
            ? {
                ...zoneCapture,
                customTypes: compactTypes.length > 0 ? compactTypes : undefined,
              }
            : zoneCapture,
        ),
      })),
    };

    updateRun(nextRun);
  }

  function setCustomType(slot: 0 | 1, typeName: string) {
    if (!runToUpdate) return;

    const nextTypes = [...activeCustomTypes];
    nextTypes[slot] = typeName;
    if (slot === 1) {
      setShowSecondTypeSlot(true);
    }

    // Prevent duplicate dual typing by keeping only one copy.
    if (nextTypes[0] && nextTypes[1] && nextTypes[0] === nextTypes[1]) {
      nextTypes.splice(1, 1);
      setShowSecondTypeSlot(false);
    }

    persistCustomTypes(nextTypes);
  }

  function addSecondType() {
    if (!runToUpdate) return;
    setShowSecondTypeSlot(true);
  }

  function removeSecondType() {
    if (!runToUpdate) return;

    const nextTypes = [...activeCustomTypes];
    nextTypes.splice(1, 1);
    setShowSecondTypeSlot(false);
    persistCustomTypes(nextTypes);
  }

  function persistAbility(nextAbility: string | null) {
    setAbilityDraft(nextAbility);
    if (!runToUpdate) return;

    updateCaptureInRun((target) => ({
      ...target,
      ability: nextAbility ?? undefined,
    }));
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.8)",
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
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "slideUp 300ms ease",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <Box sx={{ textAlign: "center", py: 6, color: "#64748b" }}>
            {t(tr.pokemonDetail.loading, lang)}
          </Box>
        ) : data ? (
          <>
            {/* Header */}
            <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSpriteUrl ?? getCaptureSpriteUrl(capture, true)}
                alt={pokemonDisplayName}
                onError={(event) => {
                  const fallbackUrl = getCaptureSpriteFallbackUrl(capture);
                  if (event.currentTarget.src !== fallbackUrl) {
                    event.currentTarget.src = fallbackUrl;
                  }
                }}
                style={{
                  width: "96px",
                  height: "96px",
                  objectFit: "contain",
                  filter: "drop-shadow(0 10px 15px -3px rgba(0, 0, 0, 0.1))",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="div"
                  sx={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    textTransform: "capitalize",
                    lineHeight: 1.25,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                    color: "#000",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        minHeight: "2rem",
                        border: isEditingNickname ? "1px solid #cbd5e1" : "",
                        borderRadius: isEditingNickname ? "0.5rem" : "",
                        py: 0.5,
                        background: isEditingNickname
                          ? "rgba(255, 255, 255, 0.75)"
                          : "transparent",
                      }}
                    >
                      {isEditingNickname ? (
                        <>
                          <TextField
                            size="small"
                            fullWidth
                            autoFocus
                            value={nicknameDraft}
                            onChange={(e) => setNicknameDraft(e.target.value)}
                            placeholder={t(
                              tr.pokemonDetail.nicknamePlaceholder,
                              lang,
                            )}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                background: "#fff",
                                fontSize: "0.95rem",
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={handleSaveNickname}
                            disabled={!runToUpdate}
                            aria-label={t(tr.pokemonDetail.saveNickname, lang)}
                            title={t(tr.pokemonDetail.saveNickname, lang)}
                            sx={{
                              color: "#1d4ed8",
                            }}
                          >
                            ✓
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setNicknameDraft(currentNickname);
                              setIsEditingNickname(false);
                            }}
                            aria-label={t(
                              tr.pokemonDetail.cancelEditNickname,
                              lang,
                            )}
                            title={t(tr.pokemonDetail.cancelEditNickname, lang)}
                            sx={{
                              color: "#475569",
                            }}
                          >
                            ✕
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <Box
                            component="span"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {pokemonDisplayLabel}
                          </Box>
                          {runToUpdate && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                setNicknameDraft(currentNickname);
                                setIsEditingNickname(true);
                              }}
                              aria-label={t(
                                tr.pokemonDetail.editNickname,
                                lang,
                              )}
                              title={t(tr.pokemonDetail.editNickname, lang)}
                              sx={{
                                color: "#475569",
                              }}
                            >
                              ✎
                            </IconButton>
                          )}
                        </>
                      )}
                    </Box>
                    {capture.isShiny && (
                      <span style={{ fontSize: "1rem" }}>✨</span>
                    )}
                    {genderSymbol && (
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 400,
                          color: genderColor,
                        }}
                      >
                        {genderSymbol}
                      </span>
                    )}
                  </Box>
                </Typography>
                <Typography
                  sx={{
                    color: "#666",
                    fontSize: "0.75rem",
                    textTransform: "capitalize",
                    mt: 0.25,
                  }}
                >
                  {pokemonDisplayName} #{data.id.toString().padStart(3, "0")}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}
                >
                  {isRandomTypeMode ? (
                    <>
                      <Tooltip title={t(tr.pokemonDetail.chooseType, lang)}>
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
                            cursor: runToUpdate ? "pointer" : "default",
                          }}
                          disabled={!runToUpdate}
                        >
                          {firstType ?? t(tr.pokemonDetail.unknownType, lang)}
                        </Box>
                      </Tooltip>

                      {!hasSecondTypeSlot && (
                        <Tooltip
                          title={t(tr.pokemonDetail.addSecondType, lang)}
                        >
                          <IconButton
                            size="small"
                            onClick={addSecondType}
                            disabled={!runToUpdate}
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
                          <Tooltip title={t(tr.pokemonDetail.chooseType, lang)}>
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
                                cursor: runToUpdate ? "pointer" : "default",
                              }}
                              disabled={!runToUpdate}
                            >
                              {secondType ??
                                t(tr.pokemonDetail.unknownType, lang)}
                            </Box>
                          </Tooltip>

                          <Tooltip
                            title={t(tr.pokemonDetail.removeSecondType, lang)}
                          >
                            <IconButton
                              size="small"
                              onClick={removeSecondType}
                              disabled={!runToUpdate}
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
                    </>
                  ) : (
                    data.types.map(({ type }) => (
                      <Box
                        key={type.name}
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#fff",
                          textTransform: "capitalize",
                          background: typeColors[type.name] ?? "#888",
                          border: "2px solid #000",
                        }}
                      >
                        {type.name}
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>

            {/* Sprite selection */}
            {isRandomTypeMode && (
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: "#475569",
                  fontWeight: 600,
                  mt: -1.5,
                  mb: 1.5,
                }}
              >
                {t(tr.pokemonDetail.randomTypes, lang)}
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

            {/* Sprite selection */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#666",
                  mb: 1,
                }}
              >
                {t(tr.pokemonDetail.sprite, lang)}
              </Typography>

              {loadingSpriteOptions ? (
                <Typography sx={{ fontSize: "0.75rem", color: "#666" }}>
                  {t(tr.pokemonDetail.loadingSprites, lang)}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 0.75,
                    maxHeight: "210px",
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
                        onClick={() => handleSelectSprite(option.url)}
                        title={`${meta.sourceLabel} • ${meta.label}`}
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
                          minHeight: "88px",
                          transition: "all 150ms",
                          "&:hover": {
                            background: isSelectedSprite
                              ? "#2563eb"
                              : "#f0f0f0",
                          },
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={option.url}
                          alt={option.label}
                          width={42}
                          height={42}
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
                          {meta.sourceLabel}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.58rem",
                            lineHeight: 1,
                            textAlign: "center",
                            opacity: isSelectedSprite ? 0.9 : 0.75,
                          }}
                        >
                          {meta.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Abilities */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#666",
                  mb: 1,
                }}
              >
                {isRandomAbilitiesMode
                  ? t(tr.pokemonDetail.abilitiesRandomizer, lang)
                  : t(tr.pokemonDetail.abilitiesSection, lang)}
              </Typography>

              {isRandomAbilitiesMode ? (
                <>
                  {/* Currently selected ability chip */}
                  {activeAbility && (() => {
                    const entry = abilitiesCache.abilities.find(
                      (a) => a.name === activeAbility,
                    );
                    const displayName =
                      lang === "fr"
                        ? (entry?.names?.fr ?? activeAbility)
                        : (entry?.names?.en ?? activeAbility);
                    const effect =
                      lang === "fr"
                        ? (entry?.effects?.fr ?? "")
                        : (entry?.effects?.en ?? "");
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                        <Tooltip title={effect} placement="top">
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
                              background: "#e0f2fe",
                              border: "2px solid #0284c7",
                              color: "#0c4a6e",
                            }}
                          >
                            <span style={{ textTransform: "capitalize" }}>
                              {displayName}
                            </span>
                            {runToUpdate && (
                              <Box
                                component="button"
                                onClick={() => {
                                  persistAbility(null);
                                  setAbilitySearch("");
                                }}
                                aria-label={t(
                                  tr.pokemonDetail.removeAbility,
                                  lang,
                                )}
                                sx={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  lineHeight: 1,
                                  color: "#0c4a6e",
                                  p: 0,
                                  "&:hover": { color: "#dc2626" },
                                }}
                              >
                                ✕
                              </Box>
                            )}
                          </Box>
                        </Tooltip>
                      </Box>
                    );
                  })()}

                  {/* Search field – hidden once an ability is selected */}
                  {!activeAbility && runToUpdate && (
                    <Box sx={{ position: "relative" }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={t(
                          tr.pokemonDetail.abilitiesSearchPlaceholder,
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
                            zIndex: 20,
                            boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
                          }}
                        >
                          {(() => {
                            const filtered = abilitiesCache.abilities.filter(
                              (a) =>
                                a.name
                                  .toLowerCase()
                                  .includes(abilitySearch.toLowerCase()) ||
                                a.names?.fr
                                  ?.toLowerCase()
                                  .includes(abilitySearch.toLowerCase()) ||
                                a.names?.en
                                  ?.toLowerCase()
                                  .includes(abilitySearch.toLowerCase()),
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
                                          persistAbility(a.name);
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
                                    {t(tr.pokemonDetail.noAbilityResult, lang)}
                                  </Box>
                                )}
                              </>
                            );
                          })()}
                        </Box>
                      )}
                    </Box>
                  )}
                </>
              ) : (
                /* Non-randomizer mode: show abilities from PokeAPI (the full panel of possible abilities) */
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {data?.abilities?.map(({ ability, is_hidden }) => {
                    const entry = abilitiesCache.abilities.find(
                      (a) => a.name === ability.name,
                    );
                    const displayName =
                      lang === "fr"
                        ? (entry?.names?.fr ?? ability.name)
                        : (entry?.names?.en ?? ability.name);
                    const effect =
                      lang === "fr"
                        ? (entry?.effects?.fr ?? "")
                        : (entry?.effects?.en ?? "");
                    return (
                      <Tooltip key={ability.name} title={effect} placement="top">
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: is_hidden ? "#f3e8ff" : "#e0f2fe",
                            border: `2px solid ${is_hidden ? "#7c3aed" : "#0284c7"}`,
                            color: is_hidden ? "#4c1d95" : "#0c4a6e",
                            textTransform: "capitalize",
                            cursor: "help",
                          }}
                        >
                          {displayName}
                          {is_hidden && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                marginLeft: "4px",
                                opacity: 0.8,
                              }}
                            >
                              ({t(tr.pokemonDetail.abilitiesHidden, lang)})
                            </span>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Base Stats */}
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#666",
                  mb: 1,
                }}
              >
                {t(tr.pokemonDetail.baseStats, lang)}
              </Typography>
              {data.stats.map((s) => (
                <StatBar
                  key={s.stat.name}
                  name={s.stat.name}
                  value={s.base_stat}
                  speedLabel={t(tr.pokemonDetail.statSpeed, lang)}
                />
              ))}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 0.75,
                  pt: 0.75,
                  borderTop: "2px dashed #cbd5e1",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t(tr.pokemonDetail.baseStatTotal, lang)}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.875rem", fontWeight: 800, color: "#000" }}
                >
                  {baseStatTotal}
                </Typography>
              </Box>
            </Box>

            {/* Physical info */}
            <Grid container spacing={1}>
              <Grid size={{ xs: 6 }}>
                <Box
                  sx={{
                    background: "#f0f4f8",
                    border: "2px solid #cbd5e1",
                    borderRadius: "0.5rem",
                    p: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#666",
                      mb: 0.25,
                    }}
                  >
                    {t(tr.pokemonDetail.height, lang)}
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: "#000" }}>
                    {(data.height / 10).toFixed(1)} m
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box
                  sx={{
                    background: "#f0f4f8",
                    border: "2px solid #cbd5e1",
                    borderRadius: "0.5rem",
                    p: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#666",
                      mb: 0.25,
                    }}
                  >
                    {t(tr.pokemonDetail.weight, lang)}
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: "#000" }}>
                    {(data.weight / 10).toFixed(1)} kg
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </>
        ) : (
          <Box sx={{ textAlign: "center", py: 6, color: "#dc2626" }}>
            {t(tr.pokemonDetail.failedToLoad, lang)}
          </Box>
        )}

        <Button
          onClick={onClose}
          sx={{
            mt: 2.5,
            width: "100%",
            background: "#e5e5e5",
            color: "#000",
            py: 1.5,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "none",
            transition: "all 200ms",
            border: "2px solid #000",
            "&:hover": {
              background: "#ccc",
              color: "#000",
            },
          }}
        >
          {t(tr.pokemonDetail.close, lang)}
        </Button>
      </Box>
    </Box>
  );
}
