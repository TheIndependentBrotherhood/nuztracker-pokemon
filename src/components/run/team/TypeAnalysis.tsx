"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from "@mui/material";
import { Run } from "@/lib/types";
import {
  TYPES,
  getTypeDefenses,
  getTypeOffenses,
  typeColors,
  getEffectivenessLabel,
  loadTypeData,
  buildTypeDefensesFromJson,
  buildTypeOffensesFromJson,
  type EffectivenessLabelKey,
  type TypeChartData,
} from "@/lib/type-chart";
import { fetchPokemon } from "@/lib/pokemon-api";
import { getCaptureTypesForRun, isRandomTypesMode } from "@/lib/capture-types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  run: Run;
}

export default function TypeAnalysis({ run }: Props) {
  const [teamTypes, setTeamTypes] = useState<string[][]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [typeChartData, setTypeChartData] = useState<TypeChartData>({});
  const { lang } = useLanguage();
  const tr = translations;

  useEffect(() => {
    // Load type chart data for the selected generation
    loadTypeData(run.typeChartGeneration).then((data) => {
      setTypeChartData(data);
    });
  }, [run.typeChartGeneration]);

  useEffect(() => {
    async function load() {
      if (run.team.length === 0) {
        setTeamTypes([]);
        return;
      }

      if (isRandomTypesMode(run)) {
        setTeamTypes(
          run.team.map((capture) => getCaptureTypesForRun(capture, run, [])),
        );
        return;
      }

      const types = await Promise.all(
        run.team.map(async (c) => {
          try {
            const data = await fetchPokemon(c.pokemonId);
            return getCaptureTypesForRun(
              c,
              run,
              data.types.map((t) => t.type.name),
            );
          } catch {
            return [];
          }
        }),
      );
      setTeamTypes(types);
    }
    void load();
  }, [run]);

  // Helper functions to use JSON data or fallback to old system
  const getDefenses = (types: string[]): Record<string, number> => {
    if (Object.keys(typeChartData).length > 0) {
      return buildTypeDefensesFromJson(types, typeChartData);
    }
    return getTypeDefenses(types);
  };

  const getOffenses = (types: string[]): Record<string, number> => {
    if (Object.keys(typeChartData).length > 0) {
      return buildTypeOffensesFromJson(types, typeChartData);
    }
    return getTypeOffenses(types);
  };

  if (run.team.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 6,
          color: "#000",
          fontWeight: 700,
          fontSize: "0.875rem",
        }}
      >
        {t(tr.typeAnalysis.addPokemonToSeeAnalysis, lang)}
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          borderBottom: "2px solid #000",
          background: "#fff",
          borderRadius: "1rem 1rem 0 0",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, val) => setTabValue(val)}
          sx={{ borderBottom: "none" }}
        >
          <Tab
            label={t(tr.typeAnalysis.tabDefense, lang)}
            sx={{ fontWeight: 700, color: "#000" }}
          />
          <Tab
            label={t(tr.typeAnalysis.tabAttack, lang)}
            sx={{ fontWeight: 700, color: "#000" }}
          />
          <Tab
            label={t(tr.typeAnalysis.tabCombination, lang)}
            sx={{ fontWeight: 700, color: "#000" }}
          />
          <Tab
            label={t(tr.typeAnalysis.tabTypes, lang)}
            sx={{ fontWeight: 700, color: "#000" }}
          />
        </Tabs>
      </Box>

      {tabValue === 0 && renderDefenseTable()}
      {tabValue === 1 && renderOffenseTable()}
      {tabValue === 2 && renderCombinationTable()}
      {tabValue === 3 && renderTypeTable()}
    </Box>
  );

  function renderDefenseTable() {
    return (
      <TableContainer
        sx={{
          background: "#fff",
          borderRadius: "0 0 1rem 1rem",
          border: "2px solid #000",
          borderTop: "none",
          overflowX: "auto",
        }}
      >
        <Table size="small" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(to right, #BFDBFE, #E9D5FF)",
                borderBottom: "2px solid #000",
              }}
            >
              <TableCell
                sx={{
                  textAlign: "left",
                  p: 1.5,
                  color: "#000",
                  fontWeight: 700,
                  width: "100px",
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.attackType, lang)}
              </TableCell>
              {run.team.map((c) => (
                <TableCell
                  key={c.id}
                  sx={{
                    p: 1,
                    textAlign: "center",
                    textTransform: "capitalize",
                    color: "#000",
                    fontWeight: 700,
                    width: "64px",
                    fontSize: "0.75rem",
                  }}
                >
                  {(c.nickname || c.pokemonName).slice(0, 6)}
                </TableCell>
              ))}
              <TableCell
                sx={{
                  p: 1,
                  textAlign: "center",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.defX2, lang)}
              </TableCell>
              <TableCell
                sx={{
                  p: 1,
                  textAlign: "center",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.defX05, lang)}
              </TableCell>
              <TableCell
                sx={{
                  p: 1,
                  textAlign: "center",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.difference, lang)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TYPES.map((attackType) => {
              const memberEffects = teamTypes.map((types) => {
                if (types.length === 0) return 1;
                return getDefenses(types)[attackType] ?? 1;
              });

              const weakCount = memberEffects.filter((e) => e > 1).length;
              const resistCount = memberEffects.filter(
                (e) => e < 1 && e !== 0,
              ).length;
              const immunityCount = memberEffects.filter((e) => e === 0).length;

              return (
                <TableRow
                  key={attackType}
                  sx={{
                    borderBottom: "1px solid #e5e7eb",
                    "&:hover": {
                      background: "#eff6ff",
                    },
                  }}
                >
                  <TableCell sx={{ p: 1 }}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: "0.5rem",
                        color: "#fff",
                        fontWeight: 700,
                        textTransform: "capitalize",
                        fontSize: "0.75rem",
                        border: "1px solid #000",
                        background: typeColors[attackType] ?? "#888",
                        textAlign: "center",
                      }}
                    >
                      {attackType}
                    </Box>
                  </TableCell>
                  {memberEffects.map((eff, i) => {
                    const bg =
                      eff === 0
                        ? "#60a5fa"
                        : eff >= 4
                          ? "#ef4444"
                          : eff === 2
                            ? "#f87171"
                            : eff === 0.5
                              ? "#86efac"
                              : eff === 0.25
                                ? "#4ade80"
                                : "#e5e7eb";
                    const label =
                      eff === 0
                        ? "0"
                        : eff === 0.25
                          ? "¼"
                          : eff === 0.5
                            ? "½"
                            : eff === 1
                              ? "1"
                              : eff === 2
                                ? "2"
                                : eff === 4
                                  ? "4"
                                  : `${eff}`;

                    return (
                      <TableCell key={i} sx={{ p: 1, textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "0.5rem",
                            textAlign: "center",
                            color: "#000",
                            fontWeight: 700,
                            border: "2px solid #000",
                            background: bg,
                            fontSize: "11px",
                          }}
                        >
                          {label}
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ p: 1, textAlign: "center" }}>
                    {weakCount > 0 && (
                      <Typography
                        sx={{
                          color: "#7f1d1d",
                          fontWeight: 700,
                          fontSize: "1.125rem",
                        }}
                      >
                        {weakCount}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ p: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.75,
                      }}
                    >
                      {(resistCount > 0 || immunityCount > 0) && (
                        <Typography
                          sx={{
                            color: "#166534",
                            fontWeight: 700,
                            fontSize: "1.125rem",
                          }}
                        >
                          {resistCount}
                        </Typography>
                      )}
                      {immunityCount > 0 && (
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            border: "2px solid #f59e0b",
                            borderRadius: "0.25rem",
                            background: "#fff3cd",
                            color: "#000",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {immunityCount}× 🛡️
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.75,
                      }}
                    >
                      {weakCount !== resistCount && (
                        <Typography
                          sx={{
                            color:
                              resistCount > weakCount ? "#166534" : "#7f1d1d",
                            fontWeight: 700,
                            fontSize: "1.125rem",
                          }}
                        >
                          {resistCount - weakCount > 0
                            ? `+${resistCount - weakCount}`
                            : resistCount - weakCount}
                        </Typography>
                      )}
                      {immunityCount > 0 && (
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            border: "2px solid #f59e0b",
                            borderRadius: "0.25rem",
                            background: "#fff3cd",
                            color: "#000",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {immunityCount}× 🛡️
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  function renderOffenseTable() {
    return (
      <TableContainer
        sx={{
          background: "#fff",
          borderRadius: "0 0 1rem 1rem",
          border: "2px solid #000",
          borderTop: "none",
          overflowX: "auto",
        }}
      >
        <Table size="small" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(to right, #BFDBFE, #E9D5FF)",
                borderBottom: "2px solid #000",
              }}
            >
              <TableCell
                sx={{
                  textAlign: "left",
                  p: 1.5,
                  color: "#000",
                  fontWeight: 700,
                  width: "100px",
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.defenseType, lang)}
              </TableCell>
              {run.team.map((c) => (
                <TableCell
                  key={c.id}
                  sx={{
                    p: 1,
                    textAlign: "center",
                    textTransform: "capitalize",
                    color: "#000",
                    fontWeight: 700,
                    width: "64px",
                    fontSize: "0.75rem",
                  }}
                >
                  {(c.nickname || c.pokemonName).slice(0, 6)}
                </TableCell>
              ))}
              <TableCell
                sx={{
                  p: 1,
                  textAlign: "center",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.atkX2, lang)}
              </TableCell>
              <TableCell
                sx={{
                  p: 1,
                  textAlign: "center",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.atkX05, lang)}
              </TableCell>
              <TableCell
                sx={{
                  p: 1,
                  textAlign: "center",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.difference, lang)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TYPES.map((defendType) => {
              const teamOffenses = teamTypes.map((types) => {
                if (types.length === 0) return getOffenses([])[defendType] ?? 1;
                return getOffenses(types)[defendType] ?? 1;
              });

              const strongCount = teamOffenses.filter((e) => e > 1).length;
              const weakCount = teamOffenses.filter(
                (e) => e < 1 && e !== 0,
              ).length;
              const immunityCount = teamOffenses.filter((e) => e === 0).length;

              return (
                <TableRow
                  key={defendType}
                  sx={{
                    borderBottom: "1px solid #e5e7eb",
                    "&:hover": {
                      background: "#eff6ff",
                    },
                  }}
                >
                  <TableCell sx={{ p: 1 }}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: "0.5rem",
                        color: "#fff",
                        fontWeight: 700,
                        textTransform: "capitalize",
                        fontSize: "0.75rem",
                        border: "1px solid #000",
                        background: typeColors[defendType] ?? "#888",
                        textAlign: "center",
                      }}
                    >
                      {defendType}
                    </Box>
                  </TableCell>
                  {teamOffenses.map((eff, i) => {
                    const bg =
                      eff === 0
                        ? "#60a5fa"
                        : eff >= 4
                          ? "#ef4444"
                          : eff === 2
                            ? "#f87171"
                            : eff === 0.5
                              ? "#86efac"
                              : eff === 0.25
                                ? "#4ade80"
                                : "#e5e7eb";
                    const label =
                      eff === 0
                        ? "0"
                        : eff === 0.25
                          ? "¼"
                          : eff === 0.5
                            ? "½"
                            : eff === 1
                              ? "1"
                              : eff === 2
                                ? "2"
                                : eff === 4
                                  ? "4"
                                  : `${eff}`;

                    return (
                      <TableCell key={i} sx={{ p: 1, textAlign: "center" }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "0.5rem",
                            textAlign: "center",
                            color: "#000",
                            fontWeight: 700,
                            border: "2px solid #000",
                            background: bg,
                            fontSize: "11px",
                          }}
                        >
                          {label}
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ p: 1, textAlign: "center" }}>
                    {strongCount > 0 && (
                      <Typography
                        sx={{
                          color: "#166534",
                          fontWeight: 700,
                          fontSize: "1.125rem",
                        }}
                      >
                        {strongCount}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ p: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.75,
                      }}
                    >
                      {(weakCount > 0 || immunityCount > 0) && (
                        <Typography
                          sx={{
                            color: "#7f1d1d",
                            fontWeight: 700,
                            fontSize: "1.125rem",
                          }}
                        >
                          {weakCount}
                        </Typography>
                      )}
                      {immunityCount > 0 && (
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            border: "2px solid #f52e0b",
                            borderRadius: "0.25rem",
                            background: "#ffe8e8",
                            color: "#000",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {immunityCount}× 🚫
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.75,
                      }}
                    >
                      {strongCount !== weakCount && (
                        <Typography
                          sx={{
                            color:
                              strongCount > weakCount ? "#166534" : "#7f1d1d",
                            fontWeight: 700,
                            fontSize: "1.125rem",
                          }}
                        >
                          {strongCount - weakCount > 0
                            ? `+${strongCount - weakCount}`
                            : strongCount - weakCount}
                        </Typography>
                      )}
                      {immunityCount > 0 && (
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            border: "2px solid #f52e0b",
                            borderRadius: "0.25rem",
                            background: "#ffe8e8",
                            color: "#000",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {immunityCount}× 🚫
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  function renderCombinationTable() {
    const toggleTypeSelection = (type: string) => {
      setSelectedTypes((prev) => {
        if (prev.includes(type)) {
          return prev.filter((t) => t !== type);
        }
        if (prev.length < 2) {
          return [...prev, type];
        }
        return prev;
      });
    };

    if (selectedTypes.length === 0) {
      return (
        <Box
          sx={{
            background: "#fff",
            borderRadius: "0 0 1rem 1rem",
            border: "2px solid #000",
            borderTop: "none",
            p: 2,
          }}
        >
          <Typography
            sx={{
              textAlign: "center",
              color: "#666",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {t(tr.typeAnalysis.clickToSelectCombination, lang)}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "center",
            }}
          >
            {TYPES.map((type) => (
              <Box
                key={type}
                onClick={() => toggleTypeSelection(type)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "0.5rem",
                  color: "#fff",
                  fontWeight: 700,
                  textTransform: "capitalize",
                  fontSize: "0.75rem",
                  border: "1px solid #000",
                  background: typeColors[type] ?? "#888",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                  },
                }}
              >
                {type}
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    const combinationDefenses = getDefenses(selectedTypes);
    const combinationOffenses = getOffenses(selectedTypes);

    return (
      <TableContainer
        sx={{
          background: "#fff",
          borderRadius: "0 0 1rem 1rem",
          border: "2px solid #000",
          borderTop: "none",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              marginBottom: 2,
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {selectedTypes.map((type) => (
              <Box
                key={type}
                onClick={() => toggleTypeSelection(type)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "0.5rem",
                  color: "#fff",
                  fontWeight: 700,
                  textTransform: "capitalize",
                  fontSize: "0.75rem",
                  border: "2px solid #000",
                  background: typeColors[type] ?? "#888",
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative",
                  "&:after": {
                    content: '"✕"',
                    marginLeft: "0.5rem",
                  },
                  "&:hover": {
                    opacity: 0.8,
                  },
                }}
              >
                {type}
              </Box>
            ))}
            {selectedTypes.length < 2 && (
              <Typography
                sx={{ fontSize: "0.875rem", color: "#666", fontWeight: 600 }}
              >
                {t(tr.typeAnalysis.plusOneType, lang)}
              </Typography>
            )}
          </Box>

          {selectedTypes.length < 2 && (
            <Box sx={{ marginBottom: 2 }}>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#666",
                  marginBottom: 1,
                }}
              >
                {t(tr.typeAnalysis.availableTypes, lang)}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {TYPES.filter((t) => !selectedTypes.includes(t)).map((type) => (
                  <Box
                    key={type}
                    onClick={() => toggleTypeSelection(type)}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "0.5rem",
                      color: "#fff",
                      fontWeight: 700,
                      textTransform: "capitalize",
                      fontSize: "0.75rem",
                      border: "1px solid #000",
                      background: typeColors[type] ?? "#888",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                      },
                    }}
                  >
                    {type}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              marginBottom: 2,
            }}
          >
            {/* Défense */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  marginBottom: 1,
                  color: "#000",
                }}
              >
                {t(tr.typeAnalysis.defenseSection, lang)}
              </Typography>
              {[4, 2, 0.5, 0.25, 0].map((multiplier) => {
                const types = TYPES.filter(
                  (t) => combinationDefenses[t] === multiplier,
                );
                if (types.length === 0) return null;

                const { labelKey, color } = getEffectivenessLabel(
                  multiplier,
                  "defense",
                );
                const bgColor =
                  multiplier >= 2
                    ? "#fee2e2"
                    : multiplier >= 0.5
                      ? "#dcfce7"
                      : "#cffafe";
                const borderColor =
                  multiplier >= 2
                    ? "#fca5a5"
                    : multiplier >= 0.5
                      ? "#86efac"
                      : "#60a5fa";

                return (
                  <Box key={multiplier} sx={{ marginBottom: 1.5 }}>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color,
                        marginBottom: 0.5,
                      }}
                    >
                      {t(
                        tr.typeAnalysis[labelKey as EffectivenessLabelKey],
                        lang,
                      )}{" "}
                      ({types.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {types.map((type) => (
                        <Box
                          key={type}
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "0.25rem",
                            background: bgColor,
                            color: color,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            textTransform: "capitalize",
                            border: `1px solid ${borderColor}`,
                          }}
                        >
                          {type}
                          {multiplier === 0 && " 🔒"}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Attaque */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  marginBottom: 1,
                  color: "#000",
                }}
              >
                {t(tr.typeAnalysis.attackSection, lang)}
              </Typography>
              {[4, 2, 0.5, 0.25, 0].map((multiplier) => {
                const types = TYPES.filter(
                  (t) => combinationOffenses[t] === multiplier,
                );
                if (types.length === 0) return null;

                const { labelKey, color } = getEffectivenessLabel(
                  multiplier,
                  "attack",
                );
                const bgColor =
                  multiplier >= 2
                    ? "#dcfce7"
                    : multiplier >= 0.5
                      ? "#fee2e2"
                      : "#ffe8e8";
                const borderColor =
                  multiplier >= 2
                    ? "#86efac"
                    : multiplier >= 0.5
                      ? "#fca5a5"
                      : "#ffcccc";

                return (
                  <Box key={multiplier} sx={{ marginBottom: 1.5 }}>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color,
                        marginBottom: 0.5,
                      }}
                    >
                      {t(
                        tr.typeAnalysis[labelKey as EffectivenessLabelKey],
                        lang,
                      )}{" "}
                      ({types.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {types.map((type) => (
                        <Box
                          key={type}
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "0.25rem",
                            background: bgColor,
                            color: color,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            textTransform: "capitalize",
                            border: `1px solid ${borderColor}`,
                          }}
                        >
                          {type}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box
            sx={{
              textAlign: "center",
              marginTop: 2,
            }}
          >
            <Typography
              onClick={() => setSelectedTypes([])}
              sx={{
                fontSize: "0.875rem",
                color: "#0066cc",
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {t(tr.typeAnalysis.resetSelection, lang)}
            </Typography>
          </Box>
        </Box>
      </TableContainer>
    );
  }

  function renderTypeTable() {
    return (
      <TableContainer
        sx={{
          background: "#fff",
          borderRadius: "0 0 1rem 1rem",
          border: "2px solid #000",
          borderTop: "none",
          overflowX: "auto",
        }}
      >
        <Table size="small" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(to right, #BFDBFE, #E9D5FF)",
                borderBottom: "2px solid #000",
              }}
            >
              <TableCell
                sx={{
                  textAlign: "left",
                  p: 1.5,
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                Type
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  p: 1.5,
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.effectiveAgainst, lang)}
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  p: 1.5,
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.weakAgainst, lang)}
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  p: 1.5,
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {t(tr.typeAnalysis.resistantTo, lang)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TYPES.map((type) => {
              const defenses = getDefenses([type]);
              const offenses = getOffenses([type]);

              const efficaceTo = TYPES.filter((t) => offenses[t] > 1).sort(
                (a, b) => offenses[b] - offenses[a],
              );
              const weakTo = TYPES.filter((t) => defenses[t] > 1).sort(
                (a, b) => defenses[b] - defenses[a],
              );
              const resistantTo = TYPES.filter(
                (t) => defenses[t] < 1 && defenses[t] !== 0,
              ).sort((a, b) => defenses[a] - defenses[b]);

              return (
                <TableRow
                  key={type}
                  sx={{
                    borderBottom: "1px solid #e5e7eb",
                    "&:hover": {
                      background: "#eff6ff",
                    },
                  }}
                >
                  <TableCell sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: "0.5rem",
                        color: "#fff",
                        fontWeight: 700,
                        textTransform: "capitalize",
                        fontSize: "0.75rem",
                        border: "1px solid #000",
                        background: typeColors[type] ?? "#888",
                        textAlign: "center",
                        display: "inline-block",
                      }}
                    >
                      {type}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: 1.5 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {efficaceTo.map((t) => (
                        <Box
                          key={t}
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "0.25rem",
                            background: typeColors[t] ?? "#888",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            textTransform: "capitalize",
                            border: "1px solid #000",
                          }}
                        >
                          {t}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: 1.5 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {weakTo.map((t) => (
                        <Box
                          key={t}
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "0.25rem",
                            background: typeColors[t] ?? "#888",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            textTransform: "capitalize",
                            border: "1px solid #000",
                          }}
                        >
                          {t}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ p: 1.5 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {resistantTo.map((t) => (
                        <Box
                          key={t}
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "0.25rem",
                            background: typeColors[t] ?? "#888",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            textTransform: "capitalize",
                            border: "1px solid #000",
                          }}
                        >
                          {t}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
}
