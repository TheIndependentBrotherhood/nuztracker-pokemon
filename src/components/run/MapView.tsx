"use client";

import { Run } from "@/lib/types";
import { Box, Typography } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import KantoMap from "./KantoMap";

interface Props {
  run: Run;
}

export default function MapView({ run }: Props) {
  const { setSelectedZone, selectedZoneId } = useRunStore();

  function getZoneStatus(zoneId: string) {
    const zone = run.zones.find((z) => z.id === zoneId);
    if (!zone) return "not-visited";
    if (zone.captures.length >= 2) return "multiple";
    return zone.status;
  }

  function handleZoneClick(zoneId: string) {
    setSelectedZone(selectedZoneId === zoneId ? null : zoneId);
  }

  return (
    <Box
      sx={{
        borderRadius: "1rem",
        overflow: "hidden",
        border: "3px solid #000",
        background: "#fff",
      }}
    >
      <Box
        sx={{
          p: 2,
          background: "linear-gradient(to right, #DBEAFE, #E9D5FF)",
          borderBottom: "3px solid #000",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            color: "#000",
            fontSize: "1.125rem",
            textTransform: "capitalize",
          }}
        >
          {run.region} Region Map
        </Typography>
        <Box
          sx={{ display: "flex", gap: 2, fontSize: "0.75rem", fontWeight: 700 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#9ca3af",
                border: "2px solid #000",
              }}
            />
            Not Visited
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#60a5fa",
                border: "2px solid #000",
              }}
            />
            Visited
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#22c55e",
                border: "2px solid #000",
              }}
            />
            Captured
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#fb923c",
                border: "2px solid #000",
              }}
            />
            Multiple
          </Box>
        </Box>
      </Box>
      <Box sx={{ p: 2, background: "#fff" }}>
        <KantoMap
          zones={run.zones}
          selectedZoneId={selectedZoneId}
          onZoneClick={handleZoneClick}
          getZoneStatus={getZoneStatus}
        />
      </Box>
    </Box>
  );
}
