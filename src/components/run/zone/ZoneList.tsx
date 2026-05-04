"use client";

import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { Box, TextField } from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { getZonesForRegionAsync, getZoneDisplayName } from "@/lib/zones";
import ZoneItem from "./ZoneItem";

interface Props {
  run: Run;
}

type FilterKey = "all" | "not-visited" | "visited" | "captured";

export default function ZoneList({ run }: Props) {
  const { selectedZoneId, updateRun } = useRunStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [zoneNamesMap, setZoneNamesMap] = useState<
    Map<string, { fr?: string; en?: string }>
  >(new Map());
  const { lang } = useLanguage();
  const tr = translations;

  // Load correct zones for the region and sync if needed
  useEffect(() => {
    const loadAndSync = async () => {
      const correctZones = await getZonesForRegionAsync(run.region);

      const expectedZoneIds = new Set(correctZones.map((z) => z.id));
      const currentZoneIds = new Set(run.zones.map((z) => z.id));

      const zonesMismatch =
        expectedZoneIds.size !== currentZoneIds.size ||
        ![...expectedZoneIds].every((id) => currentZoneIds.has(id));

      // Build a map of zoneId -> translated names for display (never persisted)
      const newMap = new Map<string, { fr?: string; en?: string }>();
      correctZones.forEach((z) => {
        if (z.zoneNames) newMap.set(z.id, z.zoneNames);
      });
      setZoneNamesMap(newMap);

      if (zonesMismatch) {
        const syncedZones = correctZones.map((expectedZone) => {
          const currentZone = run.zones.find((z) => z.id === expectedZone.id);
          return currentZone
            ? { ...currentZone }
            : {
                id: expectedZone.id,
                zoneName: expectedZone.zoneName,
                regionArea: expectedZone.regionArea,
                status: "not-visited" as const,
                captures: [],
                updatedAt: 0,
              };
        });
        updateRun({ ...run, zones: syncedZones });
      }
    };

    loadAndSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, run.region]);

  // Derive display zones: run.zones enriched with translated names from map
  const zonesToDisplay = useMemo(
    () =>
      run.zones.map((zone) => ({
        ...zone,
        zoneNames: zoneNamesMap.get(zone.id) ?? zone.zoneNames,
      })),
    [run.zones, zoneNamesMap],
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t(tr.zoneList.filterAll, lang) },
    { key: "not-visited", label: t(tr.zoneList.filterNotVisited, lang) },
    { key: "visited", label: t(tr.zoneList.filterVisited, lang) },
    { key: "captured", label: t(tr.zoneList.filterCaptured, lang) },
  ];

  const filtered = zonesToDisplay.filter((z) => {
    if (filter !== "all" && z.status !== filter) return false;
    if (search) {
      const displayName = getZoneDisplayName(z, lang).toLowerCase();
      if (!displayName.includes(search.toLowerCase())) return false;
    }
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
          placeholder={t(tr.zoneList.searchPlaceholder, lang)}
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
            isShinyHuntMode={run.isShinyHuntMode}
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
            {t(tr.zoneList.noZoneFound, lang)}
          </Box>
        )}
      </Box>
    </Box>
  );
}
