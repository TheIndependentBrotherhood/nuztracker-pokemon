"use client";

import { Run } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useRunStore } from "@/store/runStore";
import { Box, Typography, Grid, Tooltip } from "@mui/material";

interface RunListProps {
  runs: Run[];
}

export default function RunList({ runs }: RunListProps) {
  const router = useRouter();
  const { deleteRun } = useRunStore();

  if (runs.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 20, px: 2 }}>
        <Box
          sx={{ fontSize: "4.5rem", mb: 3, animation: "bounce 1s infinite" }}
        >
          🎮
        </Box>
        <Typography
          sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#000", mb: 1 }}
        >
          Aucun run pour l&apos;instant
        </Typography>
        <Typography
          sx={{ color: "#374151", fontSize: "1rem", fontWeight: 500 }}
        >
          Lancez votre premier Nuzlocke et démarrez l&apos;aventure !
        </Typography>
      </Box>
    );
  }

  const statusConfig: Record<
    string,
    {
      label: string;
      icon: string;
      bgColor: string;
      borderColor: string;
      textColor: string;
      barColor: string;
    }
  > = {
    "in-progress": {
      label: "Active",
      icon: "▶️",
      bgColor: "rgba(16, 185, 129, 0.1)",
      borderColor: "#10b981",
      textColor: "#10b981",
      barColor: "linear-gradient(to right, #10b981, #06b6d4)",
    },
    completed: {
      label: "Terminé",
      icon: "✓",
      bgColor: "rgba(59, 130, 246, 0.1)",
      borderColor: "#3b82f6",
      textColor: "#3b82f6",
      barColor: "linear-gradient(to right, #3b82f6, #06b6d4)",
    },
    abandoned: {
      label: "Abandonné",
      icon: "✕",
      bgColor: "rgba(239, 68, 68, 0.1)",
      borderColor: "#ef4444",
      textColor: "#ef4444",
      barColor: "linear-gradient(to right, #ef4444, #f97316)",
    },
  };

  return (
    <Grid container spacing={2}>
      {runs.map((run: Run) => {
        const captureCount = run.zones.reduce(
          (acc: number, z: any) => acc + z.captures.length,
          0,
        );
        const visitedCount = run.zones.filter(
          (z: any) => z.status !== "not-visited",
        ).length;
        const progress =
          run.zones.length > 0 ? (visitedCount / run.zones.length) * 100 : 0;
        const status = statusConfig[run.status] ?? statusConfig["in-progress"];

        return (
          <Grid item xs={12} md={6} key={run.id}>
            <Box
              sx={{
                position: "relative",
                background: "#E3F2FD",
                border: "3px solid #000",
                borderRadius: "1rem",
                p: 3,
                cursor: "pointer",
                transition: "all 300ms ease",
                width: "345px",
                "&:hover": {
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  transform: "scale(1.05)",
                },
                "&:hover .delete-btn": {
                  opacity: 1,
                },
                group: { position: "relative" },
              }}
              onClick={() => router.push(`/run/?id=${run.id}`)}
            >
              {/* Background gradient effect */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom right, rgba(59, 130, 246, 0), rgba(6, 182, 212, 0))",
                  pointerEvents: "none",
                  transition: "all 300ms ease",
                }}
              />

              {/* Content */}
              <Box
                sx={{
                  position: "relative",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Tooltip title={run.gameName} arrow>
                      <Typography
                        sx={{
                          fontSize: "1.125rem",
                          fontWeight: 700,
                          color: "#000",
                          transition: "color 300ms ease",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          lineHeight: 1.2,
                        }}
                      >
                        {run.gameName}
                      </Typography>
                    </Tooltip>
                    <Typography
                      sx={{
                        color: "#374151",
                        fontSize: "0.75rem",
                        mt: 1.5,
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      📍{" "}
                      {run.region.charAt(0).toUpperCase() + run.region.slice(1)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "9999px",
                      shrinkFlexBasis: 0,
                      border: `2px solid ${status.borderColor}`,
                      background: status.bgColor,
                      color: status.textColor,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      transition: "all 300ms ease",
                    }}
                  >
                    <span>{status.icon}</span>
                    {status.label}
                  </Box>
                </Box>

                {/* Stats */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        background: "#E8F5E9",
                        borderRadius: "0.5rem",
                        p: 1.5,
                        border: "2px solid #000",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "#000",
                          fontWeight: 700,
                          mb: 0.25,
                        }}
                      >
                        Zones
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.125rem",
                          fontWeight: 700,
                          color: "#10b981",
                        }}
                      >
                        {visitedCount}/{run.zones.length}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        background: "#F3E5F5",
                        borderRadius: "0.5rem",
                        p: 1.5,
                        border: "2px solid #000",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "#000",
                          fontWeight: 700,
                          mb: 0.25,
                        }}
                      >
                        Captures
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.125rem",
                          fontWeight: 700,
                          color: "#8b5cf6",
                        }}
                      >
                        {captureCount}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Progress bar */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Typography sx={{ color: "#000", fontWeight: 700 }}>
                      Progression
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: "#000" }}>
                      {Math.round(progress)}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: "8px",
                      background: "#d1d5db",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        borderRadius: "9999px",
                        transition: "width 500ms ease",
                        background: status.barColor,
                        width: `${progress}%`,
                      }}
                    />
                  </Box>
                </Box>

                {/* Modes */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {run.isShinyHuntMode && (
                    <Box
                      sx={{
                        fontSize: "0.75rem",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "9999px",
                        background: "rgba(234, 179, 8, 0.15)",
                        color: "#eab308",
                        border: "1px solid rgba(234, 179, 8, 0.3)",
                        fontWeight: 500,
                      }}
                    >
                      ✨ Shiny
                    </Box>
                  )}
                  {run.isRandomMode && (
                    <Box
                      sx={{
                        fontSize: "0.75rem",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "9999px",
                        background: "rgba(168, 85, 247, 0.15)",
                        color: "#a855f7",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        fontWeight: 500,
                      }}
                    >
                      🎲 Random
                    </Box>
                  )}
                  <Box
                    sx={{
                      fontSize: "0.75rem",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: "9999px",
                      background: "rgba(51, 65, 85, 0.5)",
                      color: "#cbd5e1",
                      border: "1px solid rgba(71, 85, 99, 0.3)",
                      fontWeight: 500,
                    }}
                  >
                    📅 {new Date(run.createdAt).toLocaleDateString()}
                  </Box>
                </Box>

                {/* Delete button */}
                <Box
                  component="button"
                  className="delete-btn"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (confirm("Supprimer ce run ?")) deleteRun(run.id);
                  }}
                  sx={{
                    width: "100%",
                    fontSize: "0.75rem",
                    py: 1,
                    borderRadius: "0.5rem",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    transition: "all 300ms ease",
                    fontWeight: 500,
                    opacity: 0,
                    cursor: "pointer",
                    "&:hover": {
                      background: "rgba(239, 68, 68, 0.2)",
                      borderColor: "rgba(239, 68, 68, 0.5)",
                    },
                  }}
                >
                  🗑️ Supprimer
                </Box>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
