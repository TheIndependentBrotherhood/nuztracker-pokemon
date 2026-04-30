"use client";

import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { Box, TextField, Button, Typography } from "@mui/material";
import ZoneItem from "./ZoneItem";
import { useState } from "react";

interface Props {
  run: Run;
}

const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "not-visited", label: "Non visitées" },
  { key: "visited", label: "Visitées" },
  { key: "captured", label: "Capturées" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function ZoneList({ run }: Props) {
  const { selectedZoneId } = useRunStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filtered = run.zones.filter((z) => {
    if (filter !== "all" && z.status !== filter) return false;
    if (search && !z.zoneName.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          p: 2,
          borderBottom: "2px solid #000",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          background: "linear-gradient(to right, #EFF6FF, #F3E8FF)",
        }}
      >
        <TextField
          fullWidth
          placeholder="Rechercher une zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              background: "#fff",
              border: "2px solid #000",
              borderRadius: "1rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#000",
              "& fieldset": {
                border: "none",
              },
              "&:hover fieldset": {
                border: "none",
              },
              "&.Mui-focused fieldset": {
                border: "none",
              },
              "&.Mui-focused": {
                outline: "2px solid #3b82f6",
                outlineOffset: "0px",
              },
            },
            "& .MuiOutlinedInput-input::placeholder": {
              color: "#9ca3af",
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          {FILTERS.map((f) => (
            <Box
              component="button"
              key={f.key}
              onClick={() => setFilter(f.key)}
              sx={{
                flex: 1,
                fontSize: "0.75rem",
                fontWeight: 700,
                py: 1,
                borderRadius: "0.5rem",
                border: "2px solid #000",
                transition: "all 300ms ease",
                background: filter === f.key ? "#3b82f6" : "#fff",
                color: filter === f.key ? "#fff" : "#000",
                cursor: "pointer",
                "&:hover": {
                  background: filter === f.key ? "#2563eb" : "#dbeafe",
                },
                boxShadow:
                  filter === f.key
                    ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    : "none",
              }}
            >
              {f.label}
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ overflowY: "auto", flex: 1, background: "#fff" }}>
        {filtered.map((zone) => (
          <ZoneItem
            key={zone.id}
            zone={zone}
            runId={run.id}
            isSelected={selectedZoneId === zone.id}
          />
        ))}
        {filtered.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              color: "#000",
              fontWeight: 700,
              py: 5,
              fontSize: "0.875rem",
            }}
          >
            Aucune zone trouvée
          </Box>
        )}
      </Box>
    </Box>
  );
}
