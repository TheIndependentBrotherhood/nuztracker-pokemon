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

export default function PokemonDetailModal({ capture, runId, onClose }: Props) {
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
  const [panelSearch, setPanelSearch] = useState("");
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
  // Synthetic id used by PokedexView — there is no real capture to update.
  const isPokedexCapture = capture.id.startsWith("pokedex-");
  // The ability panel for this Pokémon species (from the run, not the capture)
  const abilityPanel: string[] =
    runToUpdate?.customAbilitiesByPokemonId?.[capture.pokemonId] ?? [];

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
    // Pokédex entries use a synthetic id — there is no real capture to update.
    if (!runToUpdate || isPokedexCapture) return;

    updateCaptureInRun((target) => ({
      ...target,
      ability: nextAbility ?? undefined,
    }));
  }

  function persistAbilityPanel(nextPanel: string[]) {
    if (!runToUpdate) return;

    const nextCustomAbilitiesByPokemonId = {
      ...(runToUpdate.customAbilitiesByPokemonId ?? {}),
    };
    if (nextPanel.length > 0) {
      nextCustomAbilitiesByPokemonId[capture.pokemonId] = nextPanel;
    } else {
      delete nextCustomAbilitiesByPokemonId[capture.pokemonId];
    }

    // If an ability was removed from the panel, clear it from all captures
    // of this species that were using it — so no capture ends up with an
    // impossible ability value (mirrors what persistCustomTypes does for types).
    const clearAbilityIfRemoved = (c: Capture) => {
      if (c.pokemonId !== capture.pokemonId) return c;
      if (c.ability && !nextPanel.includes(c.ability)) {
        const { ability: _, ...rest } = c;
        return rest as Capture;
      }
      return c;
    };

    updateRun({
      ...runToUpdate,
      customAbilitiesByPokemonId:
        Object.keys(nextCustomAbilitiesByPokemonId).length > 0
          ? nextCustomAbilitiesByPokemonId
          : undefined,
      team: runToUpdate.team.map(clearAbilityIfRemoved),
      zones: runToUpdate.zones.map((zone) => ({
        ...zone,
        captures: zone.captures.map(clearAbilityIfRemoved),
      })),
    });

    // Also update local draft if the currently-shown capture's ability was removed
    if (abilityDraft && !nextPanel.includes(abilityDraft)) {
      setAbilityDraft(null);
    }
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
                          {meta.sourceLabel}
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
                {t(tr.pokemonDetail.abilityPanel, lang)}
              </Typography>

              {isRandomAbilitiesMode ? (
                <>
                  {/* ── Ability panel (per species) ────────────────────── */}
                  <Typography
                    sx={{ fontSize: "0.7rem", color: "#666", mb: 0.75 }}
                  >
                    {t(tr.pokemonDetail.abilityPanelHint, lang)}{" "}
                    <strong>({abilityPanel.length}/3)</strong>
                  </Typography>

                  {/* Panel chips with remove button */}
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}
                  >
                    {abilityPanel.map((abilityName) => {
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
                      const isCapture = activeAbility === abilityName;
                      return (
                        <Tooltip
                          key={abilityName}
                          title={effect}
                          placement="top"
                        >
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
                              background: isCapture ? "#0284c7" : "#e0f2fe",
                              border: `2px solid ${isCapture ? "#0369a1" : "#0284c7"}`,
                              color: isCapture ? "#fff" : "#0c4a6e",
                            }}
                          >
                            <Box
                              component="button"
                              onClick={() => {
                                if (runToUpdate) {
                                  persistAbility(
                                    isCapture ? null : abilityName,
                                  );
                                }
                              }}
                              disabled={!runToUpdate}
                              title={
                                isCapture
                                  ? t(tr.pokemonDetail.removeAbility, lang)
                                  : displayName
                              }
                              sx={{
                                background: "none",
                                border: "none",
                                cursor: runToUpdate ? "pointer" : "default",
                                textTransform: "capitalize",
                                fontSize: "0.75rem",
                                color: "inherit",
                                p: 0,
                              }}
                            >
                              {displayName}
                            </Box>
                            {runToUpdate && (
                              <Box
                                component="button"
                                onClick={() => {
                                  const next = abilityPanel.filter(
                                    (n) => n !== abilityName,
                                  );
                                  persistAbilityPanel(next);
                                  // If this was the captured ability, clear it
                                  if (isCapture) persistAbility(null);
                                }}
                                aria-label={t(
                                  tr.pokemonDetail.removeFromPanel,
                                  lang,
                                )}
                                sx={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "0.7rem",
                                  lineHeight: 1,
                                  color: "inherit",
                                  p: 0,
                                  opacity: 0.7,
                                  "&:hover": { opacity: 1, color: "#dc2626" },
                                }}
                              >
                                ✕
                              </Box>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                    {abilityPanel.length === 0 && (
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

                  {/* Search to add to panel (hidden when panel is full) */}
                  {abilityPanel.length < 3 && runToUpdate && (
                    <Box sx={{ position: "relative", mb: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={t(
                          tr.pokemonDetail.abilitiesSearchPlaceholder,
                          lang,
                        )}
                        value={panelSearch}
                        onChange={(e) => setPanelSearch(e.target.value)}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            background: "#fff",
                            color: "#000",
                            fontSize: "0.875rem",
                            "& fieldset": { borderColor: "#000" },
                          },
                        }}
                      />
                      {panelSearch.length >= 2 && (
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
                            const searchLower = panelSearch.toLowerCase();
                            const filtered = abilitiesCache.abilities.filter(
                              (a) =>
                                !abilityPanel.includes(a.name) &&
                                (a.name.toLowerCase().includes(searchLower) ||
                                  a.names?.fr
                                    ?.toLowerCase()
                                    .includes(searchLower) ||
                                  a.names?.en
                                    ?.toLowerCase()
                                    .includes(searchLower)),
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
                                          if (abilityPanel.length >= 3) return;
                                          const next = [
                                            ...abilityPanel,
                                            a.name,
                                          ];
                                          persistAbilityPanel(next);
                                          setPanelSearch("");
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

                  {/* ── Captured ability (selected from panel) ─────────── */}
                  {/* Only shown for real captures (not for Pokédex entries which have no saved ability) */}
                  {!isPokedexCapture && (
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
                      {t(tr.pokemonDetail.capturedAbility, lang)}
                    </Typography>
                  )}

                  {/* Currently selected ability chip */}
                  {!isPokedexCapture &&
                    activeAbility &&
                    (() => {
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
                              background: "#0284c7",
                              border: "2px solid #0369a1",
                              color: "#fff",
                            }}
                          >
                            <span style={{ textTransform: "capitalize" }}>
                              ✓ {displayName}
                            </span>
                          </Box>
                        </Tooltip>
                      );
                    })()}

                  {/* Display default abilities in classic mode (clickable) */}
                  {!isPokedexCapture &&
                    !isRandomAbilitiesMode &&
                    abilityPanel.length === 0 &&
                    data &&
                    data.abilities.length > 0 && (
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
                          {t(tr.pokemonDetail.possibleAbilities, lang)}
                        </Typography>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {data.abilities.map((abilityEntry) => {
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
                            const isSelected = activeAbility === abilityName;
                            return (
                              <Tooltip
                                key={abilityName}
                                title={effect}
                                placement="top"
                              >
                                <Box
                                  component="button"
                                  onClick={() => persistAbility(abilityName)}
                                  disabled={!runToUpdate}
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
                                    cursor: runToUpdate ? "pointer" : "default",
                                    transition: "all 150ms",
                                    "&:hover": runToUpdate
                                      ? {
                                          background: isSelected
                                            ? abilityEntry.is_hidden
                                              ? "#b45309"
                                              : "#1d4ed8"
                                            : abilityEntry.is_hidden
                                              ? "#fde68a"
                                              : "#bfdbfe",
                                          transform: "scale(1.05)",
                                        }
                                      : {},
                                  }}
                                >
                                  {displayName}
                                  {abilityEntry.is_hidden && (
                                    <span
                                      title={
                                        lang === "fr"
                                          ? "Talent caché"
                                          : "Hidden ability"
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
                      </Box>
                    )}

                  {/* Display ability panel in classic mode (if custom panel exists) */}
                  {!isPokedexCapture &&
                    !isRandomAbilitiesMode &&
                    abilityPanel.length > 0 && (
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
                          {t(tr.pokemonDetail.abilityPanel, lang)}
                        </Typography>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {abilityPanel.map((abilityName) => {
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
                            const isSelected = activeAbility === abilityName;
                            return (
                              <Tooltip
                                key={abilityName}
                                title={effect}
                                placement="top"
                              >
                                <Box
                                  component="button"
                                  onClick={() => persistAbility(abilityName)}
                                  disabled={!runToUpdate}
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
                                      ? "#0369a1"
                                      : "#0284c7",
                                    border: `2px solid ${isSelected ? "#082f49" : "#0369a1"}`,
                                    color: "#fff",
                                    cursor: runToUpdate ? "pointer" : "default",
                                    transition: "all 150ms",
                                    "&:hover": runToUpdate
                                      ? {
                                          background: "#0369a1",
                                          transform: "scale(1.05)",
                                        }
                                      : {},
                                  }}
                                >
                                  {displayName}
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      </Box>
                    )}

                  {/* If no captured ability: pick from free search (randomizer mode only) */}
                  {!isPokedexCapture && !activeAbility && runToUpdate && (
                    <Box sx={{ position: "relative", mt: 1.5 }}>
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
                            const searchLower = abilitySearch.toLowerCase();
                            const filtered = abilitiesCache.abilities.filter(
                              (a) =>
                                a.name.toLowerCase().includes(searchLower) ||
                                a.names?.fr
                                  ?.toLowerCase()
                                  .includes(searchLower) ||
                                a.names?.en
                                  ?.toLowerCase()
                                  .includes(searchLower),
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
                /* Non-randomizer mode: show abilities from PokeAPI */
                <>
                  {/* Display default abilities in classic mode (clickable) */}
                  {!isPokedexCapture &&
                    abilityPanel.length === 0 &&
                    data &&
                    data.abilities.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {data.abilities.map((abilityEntry) => {
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
                            const isSelected = activeAbility === abilityName;
                            return (
                              <Tooltip
                                key={abilityName}
                                title={effect}
                                placement="top"
                              >
                                <Box
                                  component="button"
                                  onClick={() => persistAbility(abilityName)}
                                  disabled={!runToUpdate}
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
                                    cursor: runToUpdate ? "pointer" : "default",
                                    transition: "all 150ms",
                                    "&:hover": runToUpdate
                                      ? {
                                          background: isSelected
                                            ? abilityEntry.is_hidden
                                              ? "#b45309"
                                              : "#1d4ed8"
                                            : abilityEntry.is_hidden
                                              ? "#fde68a"
                                              : "#bfdbfe",
                                          transform: "scale(1.05)",
                                        }
                                      : {},
                                  }}
                                >
                                  {displayName}
                                  {abilityEntry.is_hidden && (
                                    <span
                                      title={
                                        lang === "fr"
                                          ? "Talent caché"
                                          : "Hidden ability"
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
                      </Box>
                    )}

                  {/* Display ability panel in classic mode (if custom panel exists) */}
                  {!isPokedexCapture &&
                    abilityPanel.length > 0 &&
                    data &&
                    data.abilities.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {abilityPanel.map((abilityName) => {
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
                            const isSelected = activeAbility === abilityName;
                            return (
                              <Tooltip
                                key={abilityName}
                                title={effect}
                                placement="top"
                              >
                                <Box
                                  component="button"
                                  onClick={() => persistAbility(abilityName)}
                                  disabled={!runToUpdate}
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
                                      ? "#0369a1"
                                      : "#0284c7",
                                    border: `2px solid ${isSelected ? "#082f49" : "#0369a1"}`,
                                    color: "#fff",
                                    cursor: runToUpdate ? "pointer" : "default",
                                    transition: "all 150ms",
                                    "&:hover": runToUpdate
                                      ? {
                                          background: "#0369a1",
                                          transform: "scale(1.05)",
                                        }
                                      : {},
                                  }}
                                >
                                  {displayName}
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      </Box>
                    )}

                  {/* ── Captured ability (label + chip) ─────────────────── */}
                  {!isPokedexCapture && (
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
                      {t(tr.pokemonDetail.capturedAbility, lang)}
                    </Typography>
                  )}

                  {/* Currently selected ability chip */}
                  {!isPokedexCapture &&
                    activeAbility &&
                    (() => {
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
                              background: "#0284c7",
                              border: "2px solid #0369a1",
                              color: "#fff",
                            }}
                          >
                            <span style={{ textTransform: "capitalize" }}>
                              ✓ {displayName}
                            </span>
                          </Box>
                        </Tooltip>
                      );
                    })()}
                </>
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
