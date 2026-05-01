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
} from "@/lib/type-chart";
import { fetchPokemon } from "@/lib/pokemon-api";

interface Props {
  run: Run;
}

export default function TypeAnalysis({ run }: Props) {
  const [teamTypes, setTeamTypes] = useState<string[][]>([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    async function load() {
      const types = await Promise.all(
        run.team.map(async (c) => {
          try {
            const data = await fetchPokemon(c.pokemonId);
            return data.types.map((t) => t.type.name);
          } catch {
            return [];
          }
        }),
      );
      setTeamTypes(types);
    }
    if (run.team.length > 0) load();
  }, [run.team]);

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
        Ajoute des Pokémon à ton équipe pour voir l&apos;analyse des types
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
          <Tab label="Défense" sx={{ fontWeight: 700, color: "#000" }} />
          <Tab label="Attaque" sx={{ fontWeight: 700, color: "#000" }} />
        </Tabs>
      </Box>

      {tabValue === 0 && renderDefenseTable()}
      {tabValue === 1 && renderOffenseTable()}
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
                Attack Type
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
                Def x2+
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
                Def x0.5-
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
                Différence
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TYPES.map((attackType) => {
              const memberEffects = teamTypes.map((types) => {
                if (types.length === 0) return 1;
                return getTypeDefenses(types)[attackType] ?? 1;
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
                Defense Type
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
                Atk x2+
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
                Atk x0.5-
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
                Différence
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TYPES.map((defendType) => {
              const teamOffenses = teamTypes.map((types) => {
                if (types.length === 0)
                  return getTypeOffenses([])[defendType] ?? 1;
                return getTypeOffenses(types)[defendType] ?? 1;
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
