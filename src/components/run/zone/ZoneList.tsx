"use client";

import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { getZonesForRegionAsync, getZoneDisplayName } from "@/lib/zones";
import ZoneItem from "./ZoneItem";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextField from "@/components/ui/StyledTextField";

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
  const [showAddZoneDialog, setShowAddZoneDialog] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
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

      // For non-custom regions: sync zones if mismatch
      if (run.region !== "custom" && zonesMismatch) {
        const syncedZones = correctZones.map((expectedZone) => {
          const currentZone = run.zones.find((z) => z.id === expectedZone.id);
          return currentZone
            ? { ...currentZone }
            : {
                id: expectedZone.id,
                zoneName:
                  expectedZone.zoneNames?.en ??
                  expectedZone.regionArea ??
                  "Unknown",
                zoneNames: expectedZone.zoneNames,
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

  const handleAddZone = () => {
    if (!newZoneName.trim()) return;

    const zoneId = `custom-zone-${Date.now()}`;
    const newZone = {
      id: zoneId,
      zoneName: newZoneName.trim(),
      zoneNames: {
        en: newZoneName.trim(),
      },
      regionArea: "",
      status: "not-visited" as const,
      captures: [],
      updatedAt: Date.now(),
    };

    updateRun({
      ...run,
      zones: [...run.zones, newZone],
    });

    setNewZoneName("");
    setShowAddZoneDialog(false);
  };

  const handleRemoveZone = (zoneId: string) => {
    setZoneToDelete(zoneId);
  };

  const confirmRemoveZone = () => {
    if (zoneToDelete) {
      // Get the zone to be deleted
      const zoneToRemove = run.zones.find((z) => z.id === zoneToDelete);

      // Get all capture IDs from the zone to remove team members
      const captureIdsToRemove = new Set(
        zoneToRemove?.captures.map((c) => c.id) || [],
      );

      // Remove the zone and filter out team members from this zone
      updateRun({
        ...run,
        zones: run.zones.filter((z) => z.id !== zoneToDelete),
        team: run.team.filter((member) => !captureIdsToRemove.has(member.id)),
      });
      setZoneToDelete(null);
    }
  };

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
        <StyledTextField
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

        {/* Add zone button */}
        <StyledButton
          variant="primary"
          onClick={() => setShowAddZoneDialog(true)}
          sx={{ width: "100%" }}
        >
          ➕ Ajouter une zone
        </StyledButton>
      </Box>
      <Box sx={{ overflowY: "auto", flex: 1, background: "#fff" }}>
        {filtered.map((zone) => (
          <Box
            key={zone.id}
            sx={{
              display: "flex",
              alignItems: "stretch",
              borderBottom: "1px solid #eee",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <ZoneItem
                zone={zone}
                runId={run.id}
                isSelected={selectedZoneId === zone.id}
                isShinyHuntMode={run.isShinyHuntMode}
                run={run}
              />
            </Box>
            <Box
              component="button"
              onClick={() => handleRemoveZone(zone.id)}
              sx={{
                px: 1.5,
                py: 0,
                border: "none",
                borderBottom: "1px solid rgba(71, 85, 99, 0.3);",
                background: "none",
                cursor: "pointer",
                color: "#dc2626",
                fontSize: "1.25rem",
                fontWeight: 700,
                "&:hover": {
                  background: "#fee2e2",
                },
              }}
            >
              ✕
            </Box>
          </Box>
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

      {/* Add Zone Dialog */}
      <Dialog
        open={showAddZoneDialog}
        onClose={() => setShowAddZoneDialog(false)}
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
          {t(tr.zoneList.addTitle, lang)}
        </DialogTitle>
        <DialogContent sx={{ pt: 4, overflow: "visible" }}>
          <StyledTextField
            autoFocus
            label={t(tr.zoneList.addLabel, lang)}
            placeholder={t(tr.zoneList.addPlaceholder, lang)}
            fullWidth
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <StyledButton
            variant="secondary"
            onClick={() => setShowAddZoneDialog(false)}
          >
            {t(tr.zoneList.addCancel, lang)}
          </StyledButton>
          <StyledButton
            variant="primary"
            onClick={handleAddZone}
            disabled={!newZoneName.trim()}
          >
            {t(tr.zoneList.addButton, lang)}
          </StyledButton>
        </DialogActions>
      </Dialog>

      {/* Delete Zone Confirmation Dialog */}
      <Dialog
        open={!!zoneToDelete}
        onClose={() => setZoneToDelete(null)}
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
          {t(tr.zoneList.deleteTitle, lang)}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {t(tr.zoneList.deleteMessage, lang)}
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <StyledButton
            variant="secondary"
            onClick={() => setZoneToDelete(null)}
          >
            {t(tr.zoneList.deleteCancel, lang)}
          </StyledButton>
          <StyledButton variant="danger" onClick={confirmRemoveZone}>
            {t(tr.zoneList.deleteButton, lang)}
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
