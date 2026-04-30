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
} from "@mui/material";
import { Run } from "@/lib/types";
import { TYPES, getTypeDefenses, typeColors } from "@/lib/type-chart";
import { fetchPokemon } from "@/lib/pokemon-api";

interface Props {
  run: Run;
}

export default function TypeAnalysis({ run }: Props) {
  const [teamTypes, setTeamTypes] = useState<string[][]>([]);

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
    <TableContainer
      sx={{
        background: "#fff",
        borderRadius: "1rem",
        border: "2px solid #000",
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
          </TableRow>
        </TableHead>
        <TableBody>
          {TYPES.map((attackType) => {
            const memberEffects = teamTypes.map((types) => {
              if (types.length === 0) return 1;
              return getTypeDefenses(types)[attackType] ?? 1;
            });

            const weakCount = memberEffects.filter((e) => e > 1).length;
            const resistCount = memberEffects.filter((e) => e < 1).length;

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
                      ? "#f0f0f0"
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
                  {resistCount > 0 && (
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
