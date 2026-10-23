"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Capture, PokemonData } from "@/lib/types";
import {
  typeColors,
  getTypeTranslation,
  loadTypeData,
  TypeChartData,
} from "@/lib/type-chart";
import { getCaptureTypesForRun, isRandomTypesMode } from "@/lib/capture-types";
import { computePokedexKnowledge } from "@/lib/pokedex-progress";
import {
  addPokedexEntryToRun,
  getPokedexEntryOrigin,
  loadRegionalPokedexes,
  RegionalPokedex,
  removePokedexEntryFromRun,
  resolveRunPokedexEntries,
} from "@/lib/regional-pokedex";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextField from "@/components/ui/StyledTextField";
import AdvancedComparisonModal from "@/components/run/modals/AdvancedComparisonModal";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { useRunStore } from "@/store/runStore";
import { publicPath } from "@/lib/base-path";
import { getDefaultSprite, getPokemonById } from "@/lib/pokemon-data";

const ITEMS_PER_PAGE = 20;

type SortOption = "dex" | "name" | "bst" | "type";
type SortDir = "asc" | "desc";

interface Props {
  runId?: string;
}

export default function PokedexView({ runId }: Props) {
  const { lang } = useLanguage();
  const { runs, updateRun } = useRunStore();
  const tr = translations;
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("dex");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [pokedexEntries, setPokedexEntries] = useState<PokemonData[]>([]);
  const [pokemonData, setPokemonData] = useState<Record<number, PokemonData>>(
    {},
  );
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  const [typeData, setTypeData] = useState<TypeChartData | null>(null);
  const [regionalPokedexes, setRegionalPokedexes] = useState<Map<
    string,
    RegionalPokedex
  > | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const run = runId ? runs.find((candidate) => candidate.id === runId) : null;
  const randomTypesMode = isRandomTypesMode(run);
  const typeChartGeneration = run?.typeChartGeneration;
  const regionalPokedex = run ? regionalPokedexes?.get(run.region) : undefined;

  useEffect(() => {
    let cancelled = false;
    loadRegionalPokedexes().then((data) => {
      if (!cancelled) setRegionalPokedexes(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Entries shown for this run: regional dex + obtainable species (+ manual additions, − removals)
  const {
    entries: dexEntries,
    isRegional,
    regionalCount,
    transferCount,
  } = useMemo(
    () => resolveRunPokedexEntries(run, pokedexEntries, regionalPokedex),
    [run, pokedexEntries, regionalPokedex],
  );
  const dexEntryIds = useMemo(
    () => new Set(dexEntries.map((entry) => entry.id)),
    [dexEntries],
  );

  const addCandidates = useMemo(() => {
    const normalized = addSearch.trim().toLowerCase();
    return pokedexEntries
      .filter((entry) => !dexEntryIds.has(entry.id))
      .filter((entry) => {
        if (!normalized) return true;
        return (
          entry.technicalName.toLowerCase().includes(normalized) ||
          (entry.names?.fr?.toLowerCase() ?? "").includes(normalized) ||
          (entry.names?.en?.toLowerCase() ?? "").includes(normalized) ||
          String(entry.id).includes(normalized)
        );
      })
      .slice(0, 30);
  }, [pokedexEntries, dexEntryIds, addSearch]);

  const handleAddEntry = (entry: PokemonData) => {
    if (!run) return;
    updateRun(addPokedexEntryToRun(run, entry, regionalPokedex));
  };

  const handleRemoveEntry = (entry: PokemonData) => {
    if (!run) return;
    updateRun(removePokedexEntryFromRun(run, entry, regionalPokedex));
  };

  // Type chart is needed to count the type combinations compatible with observations
  useEffect(() => {
    if (!randomTypesMode || !typeChartGeneration) return;
    let cancelled = false;
    loadTypeData(typeChartGeneration).then((data) => {
      if (!cancelled) setTypeData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [randomTypesMode, typeChartGeneration]);

  const pokedexKnowledge = useMemo(() => {
    if (!randomTypesMode || !run || !typeData || dexEntries.length === 0) {
      return null;
    }
    return computePokedexKnowledge(
      run,
      dexEntries.map((entry) => entry.id),
      typeData,
    );
  }, [randomTypesMode, run, typeData, dexEntries]);

  // Create synthetic pokedex captures for advanced mode comparison
  const allPokedexCaptures = useMemo<Capture[]>(() => {
    return dexEntries.map((entry) => ({
      id: `pokedex-${entry.id}`,
      pokemon: entry,
      gender: "unknown",
      level: 0,
      isShiny: false,
      isDead: false,
      nickname: undefined,
      ability: undefined,
      createdAt: 0,
    }));
  }, [dexEntries]);

  useEffect(() => {
    let cancelled = false;

    const loadPokedexEntries = async () => {
      try {
        const response = await fetch(publicPath("/data/pokemon-list.json"));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as {
          pokemon?: PokemonData[];
        };

        if (!cancelled) {
          setPokedexEntries(payload.pokemon ?? []);
          setListLoading(false);
        }
      } catch (error) {
        console.error("Failed to load pokedex list:", error);
        if (!cancelled) {
          setPokedexEntries([]);
          setListLoading(false);
        }
      }
    };

    void loadPokedexEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPokemonData = async () => {
      if (pokedexEntries.length === 0) {
        if (!cancelled) {
          setPokemonData({});
        }
        return;
      }

      const dataMap: Record<number, PokemonData> = {};
      await Promise.all(
        pokedexEntries.map(async (entry) => {
          try {
            const data = await getPokemonById(entry.id);
            if (data) {
              dataMap[entry.id] = data;
            }
          } catch (error) {
            // Keep list usable even when some details fail to load
            console.error(`Failed to fetch pokemon ${entry.id}:`, error);
          }
        }),
      );

      if (!cancelled) {
        setPokemonData(dataMap);
      }
    };

    void loadPokemonData();

    return () => {
      cancelled = true;
    };
  }, [pokedexEntries]);

  const filteredAndSortedEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = dexEntries.filter((entry) => {
      if (!normalizedQuery) return true;

      const nameFr = entry.names?.fr?.toLowerCase() ?? "";
      const nameEn = entry.names?.en?.toLowerCase() ?? "";
      const technicalName = entry.technicalName.toLowerCase();
      const dexNumber = String(entry.id);

      return (
        technicalName.includes(normalizedQuery) ||
        nameFr.includes(normalizedQuery) ||
        nameEn.includes(normalizedQuery) ||
        dexNumber.includes(normalizedQuery)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;

      if (sortBy === "name") {
        const nameA =
          lang === "fr"
            ? (a.names?.fr ?? a.names?.en ?? a.technicalName)
            : (a.names?.en ?? a.technicalName);
        const nameB =
          lang === "fr"
            ? (b.names?.fr ?? b.names?.en ?? b.technicalName)
            : (b.names?.en ?? b.technicalName);
        result = nameA.localeCompare(nameB, lang);
        if (result === 0) result = a.id - b.id;
      } else if (sortBy === "bst") {
        const bstA = pokemonData[a.id]?.stats.reduce(
          (sum, stat) => sum + stat.base_stat,
          0,
        );
        const bstB = pokemonData[b.id]?.stats.reduce(
          (sum, stat) => sum + stat.base_stat,
          0,
        );

        if (bstA == null && bstB == null) result = a.id - b.id;
        else if (bstA == null) result = 1;
        else if (bstB == null) result = -1;
        else result = bstA !== bstB ? bstA - bstB : a.id - b.id;
      } else if (sortBy === "type") {
        // In random types mode, use the custom assigned types from the run
        // Otherwise use the pokedex entry types
        const typesA = randomTypesMode
          ? (run?.customTypesByPokemonId?.[a.id] ?? [])
          : a.types && a.types.length > 0
            ? a.types
            : (pokemonData[a.id]?.types ?? []);
        const typesB = randomTypesMode
          ? (run?.customTypesByPokemonId?.[b.id] ?? [])
          : b.types && b.types.length > 0
            ? b.types
            : (pokemonData[b.id]?.types ?? []);
        const typeA = typesA.length > 0 ? typesA[0] : null;
        const typeB = typesB.length > 0 ? typesB[0] : null;

        // Both have types: sort alphabetically by primary type
        if (typeA && typeB) {
          result = typeA.localeCompare(typeB);
          // If primary types are equal, sort by secondary type
          if (result === 0) {
            const secondaryTypeA = typesA.length > 1 ? typesA[1] : null;
            const secondaryTypeB = typesB.length > 1 ? typesB[1] : null;

            // Mono-types (no secondary type) come before dual-types
            if (!secondaryTypeA && secondaryTypeB) {
              result = -1;
            } else if (secondaryTypeA && !secondaryTypeB) {
              result = 1;
            } else if (secondaryTypeA && secondaryTypeB) {
              result = secondaryTypeA.localeCompare(secondaryTypeB);
            }
            // If still equal, sort by dex number
            if (result === 0) result = a.id - b.id;
          }
        }
        // A has type, B doesn't: A comes first
        else if (typeA && !typeB) {
          result = -1;
        }
        // B has type, A doesn't: B comes first
        else if (!typeA && typeB) {
          result = 1;
        }
        // Neither has types: sort by dex number
        else {
          result = a.id - b.id;
        }
      } else {
        result = a.id - b.id;
      }

      return sortDir === "desc" ? -result : result;
    });

    return sorted;
  }, [
    lang,
    dexEntries,
    pokemonData,
    randomTypesMode,
    run?.customTypesByPokemonId,
    searchQuery,
    sortBy,
    sortDir,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageEntries = filteredAndSortedEntries.slice(
    safePage * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setCurrentPage(0);
  };

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    setSortBy(event.target.value as SortOption);
    setCurrentPage(0);
  };

  const toggleSortDir = () => {
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(0);
  };

  if (listLoading) {
    return (
      <Box sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
          {t(tr.runPage.loading, lang)}
        </Typography>
      </Box>
    );
  }

  if (pokedexEntries.length === 0) {
    return (
      <Box sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
          {t(tr.runPage.pokedexEmpty, lang)}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {/* Dex header: scope + manual additions */}
        {run && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: "0.95rem" }}>
                {isRegional
                  ? t(
                      tr.runPage.pokedexRegionalTitle,
                      lang,
                    )(run.region.charAt(0).toUpperCase() + run.region.slice(1))
                  : t(tr.runPage.pokedexNationalTitle, lang)}
              </Typography>
              <Typography
                sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569" }}
              >
                {t(tr.runPage.pokedexEntryCount, lang)(dexEntries.length)}
                {isRegional &&
                  ` (${t(tr.runPage.pokedexRegionalCount, lang)(regionalCount)} · ${t(tr.runPage.pokedexTransferCount, lang)(transferCount)})`}
                {(run.pokedexAddedPokemonIds?.length ?? 0) > 0 &&
                  ` · ${t(tr.runPage.pokedexAddedCount, lang)(run.pokedexAddedPokemonIds!.length)}`}
                {(run.pokedexRemovedPokemonIds?.length ?? 0) > 0 &&
                  ` · ${t(tr.runPage.pokedexRemovedCount, lang)(run.pokedexRemovedPokemonIds!.length)}`}
              </Typography>
            </Box>
            <StyledButton
              variant="primary"
              onClick={() => setShowAddDialog(true)}
            >
              {t(tr.runPage.pokedexAddButton, lang)}
            </StyledButton>
          </Box>
        )}

        {/* Type knowledge progress (random types mode only) */}
        {pokedexKnowledge && (
          <Tooltip title={t(tr.runPage.pokedexKnowledgeHint, lang)} arrow>
            <Box
              sx={{
                p: 1.5,
                background: "linear-gradient(to right, #EFF6FF, #F3E8FF)",
                border: "2px solid #000",
                borderRadius: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  📘 {t(tr.runPage.pokedexKnowledgeTitle, lang)}
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: "0.95rem" }}>
                  {pokedexKnowledge.percent.toFixed(
                    pokedexKnowledge.percent < 10 ? 2 : 1,
                  )}
                  %
                </Typography>
              </Box>
              <Box
                sx={{
                  height: "10px",
                  background: "#fff",
                  border: "2px solid #000",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    transition: "width 700ms ease",
                    background: "linear-gradient(to right, #3b82f6, #a855f7)",
                    width: `${Math.min(100, pokedexKnowledge.percent)}%`,
                    // Keep a visible sliver for tiny percentages (1330 Pokémon dilute progress)
                    minWidth: pokedexKnowledge.percent > 0 ? "6px" : 0,
                  }}
                />
              </Box>
              <Typography
                sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#475569" }}
              >
                {t(tr.runPage.pokedexKnowledgeDetail, lang)(
                  pokedexKnowledge.known,
                  pokedexKnowledge.partial,
                  pokedexKnowledge.total,
                )}
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Search + Sort controls */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t(tr.runPage.pokedexSearchPlaceholder, lang)}
            sx={{ minWidth: "220px", flex: 1 }}
          />

          <FormControl size="small" sx={{ minWidth: "180px" }}>
            <Select value={sortBy} onChange={handleSortChange}>
              <MenuItem value="dex">
                {t(tr.runPage.pokedexSortDex, lang)}
              </MenuItem>
              <MenuItem value="name">
                {t(tr.runPage.pokedexSortName, lang)}
              </MenuItem>
              <MenuItem value="bst">
                {t(tr.runPage.pokedexSortBst, lang)}
              </MenuItem>
              <MenuItem value="type">
                {t(tr.runPage.pokedexSortType, lang)}
              </MenuItem>
            </Select>
          </FormControl>

          <Box
            component="button"
            onClick={toggleSortDir}
            title={
              sortDir === "asc"
                ? t(tr.runPage.pokedexSortAsc, lang)
                : t(tr.runPage.pokedexSortDesc, lang)
            }
            sx={{
              px: 1.5,
              py: 0.5,
              border: "2px solid #000",
              borderRadius: "0.5rem",
              background: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              flexShrink: 0,
              "&:hover": { background: "#f1f5f9" },
            }}
          >
            {sortDir === "asc"
              ? t(tr.runPage.pokedexSortAsc, lang)
              : t(tr.runPage.pokedexSortDesc, lang)}
          </Box>
        </Box>

        {/* Results list */}
        {filteredAndSortedEntries.length === 0 ? (
          <Typography sx={{ fontSize: "0.875rem", color: "#475569", p: 0.5 }}>
            {t(tr.runPage.pokedexNoSearchResult, lang)}
          </Typography>
        ) : (
          pageEntries.map((entry) => {
            const data = pokemonData[entry.id];
            const displayLabel =
              lang === "fr"
                ? (entry.names?.fr ?? entry.names?.en ?? entry.technicalName)
                : (entry.names?.en ?? entry.technicalName);
            const bst = data
              ? data.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
              : null;
            const fallbackTypes = data?.types ?? entry.types;
            const rowCapture: Capture = {
              id: `pokedex-${entry.id}`,
              pokemon: entry,
              customTypes: run?.customTypesByPokemonId?.[entry.id],
              gender: "unknown",
              isShiny: false,
              isDead: false,
              createdAt: 0,
            };
            const resolvedTypes = getCaptureTypesForRun(
              rowCapture,
              run,
              fallbackTypes,
            );
            const displayedTypes =
              randomTypesMode && resolvedTypes.length === 0
                ? [t(tr.pokemonDetail.unknownType, lang)]
                : resolvedTypes;
            const entryOrigin = isRegional
              ? getPokedexEntryOrigin(entry, regionalPokedex)
              : "regional";

            return (
              <Box
                key={entry.id}
                sx={{ display: "flex", alignItems: "stretch", gap: 0.5 }}
              >
                <Box
                  component="button"
                  onClick={() => setSelectedCapture(rowCapture)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    background: "#fff",
                    border: "2px solid #000",
                    borderRadius: "0.75rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    "&:hover": {
                      background: "#f8fafc",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      minWidth: "48px",
                      textAlign: "center",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#334155",
                      flexShrink: 0,
                    }}
                  >
                    #{entry.id}
                  </Box>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      data?.sprites?.normal?.default ??
                      entry.sprites?.normal?.default ??
                      ""
                    }
                    alt={displayLabel}
                    onError={async (event) => {
                      const defaultSprite = await getDefaultSprite(entry.id);
                      if (
                        defaultSprite &&
                        event.currentTarget &&
                        event.currentTarget.src !== defaultSprite
                      ) {
                        event.currentTarget.src = defaultSprite;
                      }
                    }}
                    style={{
                      width: "56px",
                      height: "56px",
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: "#000",
                          textTransform: "capitalize",
                          lineHeight: 1.2,
                        }}
                      >
                        {displayLabel}
                      </Typography>
                      {entryOrigin !== "regional" && (
                        <Tooltip
                          arrow
                          title={
                            entryOrigin === "transfer"
                              ? t(tr.runPage.pokedexTransferTooltip, lang)
                              : ""
                          }
                        >
                          <Box
                            sx={{
                              px: 0.6,
                              py: 0.1,
                              borderRadius: "999px",
                              fontSize: "0.6rem",
                              fontWeight: 800,
                              border: "1px solid #000",
                              ...(entryOrigin === "added"
                                ? { background: "#fef3c7", color: "#92400e" }
                                : { background: "#e0f2fe", color: "#075985" }),
                            }}
                          >
                            {entryOrigin === "added"
                              ? t(tr.runPage.pokedexAddedBadge, lang)
                              : t(tr.runPage.pokedexTransferBadge, lang)}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      {displayedTypes.map((typeName) => (
                        <Box
                          key={typeName}
                          sx={{
                            px: 0.75,
                            py: 0.2,
                            borderRadius: "999px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "#fff",
                            textTransform: "capitalize",
                            background:
                              typeColors[typeName] ??
                              (typeName ===
                              t(tr.pokemonDetail.unknownType, lang)
                                ? "#64748b"
                                : "#888"),
                            border: "1px solid #000",
                          }}
                        >
                          {typeName === t(tr.pokemonDetail.unknownType, lang)
                            ? typeName
                            : getTypeTranslation(typeName, lang)}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      minWidth: "56px",
                      textAlign: "right",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "#334155",
                      flexShrink: 0,
                    }}
                  >
                    {bst !== null ? `BST ${bst}` : "…"}
                  </Box>
                </Box>
                {run && (
                  <Tooltip
                    title={t(tr.runPage.pokedexRemoveTooltip, lang)}
                    arrow
                  >
                    <Box
                      component="button"
                      onClick={() => handleRemoveEntry(entry)}
                      aria-label={t(tr.runPage.pokedexRemoveTooltip, lang)}
                      sx={{
                        px: 1,
                        border: "2px solid #000",
                        borderRadius: "0.75rem",
                        background: "#fff",
                        cursor: "pointer",
                        color: "#dc2626",
                        fontSize: "1rem",
                        fontWeight: 700,
                        flexShrink: 0,
                        "&:hover": { background: "#fee2e2" },
                      }}
                    >
                      ✕
                    </Box>
                  </Tooltip>
                )}
              </Box>
            );
          })
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              pt: 0.5,
            }}
          >
            <Box
              component="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              sx={{
                px: 1.5,
                py: 0.5,
                border: "2px solid #000",
                borderRadius: "0.5rem",
                background: "#fff",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: safePage === 0 ? "not-allowed" : "pointer",
                opacity: safePage === 0 ? 0.4 : 1,
                "&:hover:not(:disabled)": { background: "#f1f5f9" },
              }}
            >
              {t(tr.runPage.pokedexPrev, lang)}
            </Box>

            <Typography
              sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}
            >
              {(tr.runPage.pokedexPageInfo[lang] as (n: number) => string)(
                safePage + 1,
              )}{" "}
              / {totalPages}
            </Typography>

            <Box
              component="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePage === totalPages - 1}
              sx={{
                px: 1.5,
                py: 0.5,
                border: "2px solid #000",
                borderRadius: "0.5rem",
                background: "#fff",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: safePage === totalPages - 1 ? "not-allowed" : "pointer",
                opacity: safePage === totalPages - 1 ? 0.4 : 1,
                "&:hover:not(:disabled)": { background: "#f1f5f9" },
              }}
            >
              {t(tr.runPage.pokedexNext, lang)}
            </Box>
          </Box>
        )}
      </Box>

      {selectedCapture && (
        <AdvancedComparisonModal
          key={selectedCapture.id}
          pokemonCaptured={selectedCapture}
          runId={runId}
          allCaptures={allPokedexCaptures}
          onClose={() => setSelectedCapture(null)}
        />
      )}

      {/* Add Pokémon to the dex */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: "#FEF3E2",
              border: "3px solid #000",
              borderRadius: "1.5rem",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
          {t(tr.runPage.pokedexAddTitle, lang)}
        </DialogTitle>
        <DialogContent
          sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          <Typography sx={{ fontSize: "0.85rem" }}>
            {t(tr.runPage.pokedexAddDescription, lang)}
          </Typography>
          <StyledTextField
            autoFocus
            fullWidth
            placeholder={t(tr.runPage.pokedexSearchPlaceholder, lang)}
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              maxHeight: "50vh",
              overflowY: "auto",
            }}
          >
            {addCandidates.length === 0 ? (
              <Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>
                {t(tr.runPage.pokedexNoSearchResult, lang)}
              </Typography>
            ) : (
              addCandidates.map((entry) => {
                const label =
                  lang === "fr"
                    ? (entry.names?.fr ??
                      entry.names?.en ??
                      entry.technicalName)
                    : (entry.names?.en ?? entry.technicalName);
                const wasRemoved = run?.pokedexRemovedPokemonIds?.includes(
                  entry.id,
                );
                return (
                  <Box
                    key={entry.id}
                    component="button"
                    onClick={() => handleAddEntry(entry)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1,
                      py: 0.5,
                      background: "#fff",
                      border: "2px solid #000",
                      borderRadius: "0.75rem",
                      textAlign: "left",
                      cursor: "pointer",
                      "&:hover": { background: "#dcfce7" },
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.sprites?.normal?.default ?? ""}
                      alt={label}
                      style={{ width: 40, height: 40, objectFit: "contain" }}
                    />
                    <Box
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        color: "#334155",
                        minWidth: 44,
                      }}
                    >
                      #{entry.id}
                    </Box>
                    <Box
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        textTransform: "capitalize",
                        flex: 1,
                      }}
                    >
                      {label}
                    </Box>
                    {wasRemoved && (
                      <Box
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "#92400e",
                        }}
                      >
                        {t(tr.runPage.pokedexRemovedBadge, lang)}
                      </Box>
                    )}
                    <Box sx={{ fontWeight: 900, color: "#16a34a" }}>＋</Box>
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <StyledButton
            variant="secondary"
            onClick={() => setShowAddDialog(false)}
          >
            {t(tr.runPage.close, lang)}
          </StyledButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
