"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { Capture, PokemonApiData } from "@/lib/types";
import { fetchPokemon, getCaptureSpriteFallbackUrl } from "@/lib/pokemon-api";
import { typeColors } from "@/lib/type-chart";
import { getCaptureTypesForRun, isRandomTypesMode } from "@/lib/capture-types";
import PokemonDetailModal from "@/components/run/modals/PokemonDetailModal";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { useRunStore } from "@/store/runStore";

const ITEMS_PER_PAGE = 20;

interface PokemonListEntry {
  id: number;
  name: string;
  alternativeNames?: string[];
  names?: { fr?: string; en?: string };
  types: string[];
  sprites: {
    normal: { default: string; alternatives: string[] };
    shiny: { default: string; alternatives: string[] };
  };
}

type SortOption = "dex" | "name" | "bst";
type SortDir = "asc" | "desc";

interface Props {
  runId?: string;
}

export default function PokedexView({ runId }: Props) {
  const { lang } = useLanguage();
  const { runs } = useRunStore();
  const tr = translations;
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("dex");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [pokedexEntries, setPokedexEntries] = useState<PokemonListEntry[]>([]);
  const [pokemonData, setPokemonData] = useState<
    Record<number, PokemonApiData>
  >({});
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  const run = runId ? runs.find((candidate) => candidate.id === runId) : null;
  const randomTypesMode = isRandomTypesMode(run);

  useEffect(() => {
    let cancelled = false;

    const loadPokedexEntries = async () => {
      try {
        const response = await fetch("/data/pokemon-list.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as {
          pokemon?: PokemonListEntry[];
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

      const dataMap: Record<number, PokemonApiData> = {};
      await Promise.all(
        pokedexEntries.map(async (entry) => {
          try {
            dataMap[entry.id] = await fetchPokemon(entry.id);
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

    const filtered = pokedexEntries.filter((entry) => {
      if (!normalizedQuery) return true;

      const nameFr = entry.names?.fr?.toLowerCase() ?? "";
      const nameEn = entry.names?.en?.toLowerCase() ?? "";
      const technicalName = entry.name.toLowerCase();
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
            ? (a.names?.fr ?? a.names?.en ?? a.name)
            : (a.names?.en ?? a.name);
        const nameB =
          lang === "fr"
            ? (b.names?.fr ?? b.names?.en ?? b.name)
            : (b.names?.en ?? b.name);
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
      } else {
        result = a.id - b.id;
      }

      return sortDir === "desc" ? -result : result;
    });

    return sorted;
  }, [lang, pokedexEntries, pokemonData, searchQuery, sortBy, sortDir]);

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
                ? (entry.names?.fr ?? entry.names?.en ?? entry.name)
                : (entry.names?.en ?? entry.name);
            const bst = data
              ? data.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
              : null;
            const fallbackTypes =
              data?.types?.map((tValue) => tValue.type.name) ?? entry.types;
            const rowCapture: Capture = {
              id: `pokedex-${entry.id}`,
              pokemonId: entry.id,
              pokemonName: entry.name,
              pokemonNames: entry.names,
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

            return (
              <Box
                key={entry.id}
                component="button"
                onClick={() => setSelectedCapture(rowCapture)}
                sx={{
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
                  src={entry.sprites.normal.default}
                  alt={displayLabel}
                  onError={(event) => {
                    const fallbackUrl = getCaptureSpriteFallbackUrl(rowCapture);
                    if (event.currentTarget.src !== fallbackUrl) {
                      event.currentTarget.src = fallbackUrl;
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
                            (typeName === t(tr.pokemonDetail.unknownType, lang)
                              ? "#64748b"
                              : "#888"),
                          border: "1px solid #000",
                        }}
                      >
                        {typeName}
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
              {t(tr.runPage.pokedexPageInfo, lang)(safePage + 1)} / {totalPages}
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
        <PokemonDetailModal
          key={selectedCapture.id}
          capture={selectedCapture}
          runId={runId}
          onClose={() => setSelectedCapture(null)}
        />
      )}
    </>
  );
}
