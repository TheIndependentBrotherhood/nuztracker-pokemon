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

type FilterKey = "all" | "not-visited" | "lost" | "captured";

export default function ZoneList({ run }: Props) {
  const { selectedZoneId, updateRun } = useRunStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [zoneNamesMap, setZoneNamesMap] = useState<
    Map<string, { fr?: string; en?: string }>
  >(new Map());
  const [showAddZoneDialog, setShowAddZoneDialog] = useState(false);
  const [showRemovedZonesDialog, setShowRemovedZonesDialog] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  const [templateZoneIds, setTemplateZoneIds] = useState<string[]>([]);
  const { lang } = useLanguage();
  const tr = translations;

  const removedZones = useMemo(
    () => run.removedZones ?? [],
    [run.removedZones],
  );

  // Load correct zones for the region and sync if needed
  useEffect(() => {
    const loadAndSync = async () => {
      const correctZones = await getZonesForRegionAsync(run.region);
      setTemplateZoneIds(correctZones.map((z) => z.id));

      // Template zones explicitly removed by the user must not be re-added
      const removedZoneIds = new Set((run.removedZones ?? []).map((z) => z.id));
      const expectedZones = correctZones.filter(
        (z) => !removedZoneIds.has(z.id),
      );

      const expectedZoneIds = new Set(expectedZones.map((z) => z.id));
      const currentZoneIds = new Set(run.zones.map((z) => z.id));

      // Zones added manually by the user are not part of the template and
      // must always be preserved (otherwise their captures become orphans).
      const userAddedZones = run.zones.filter(
        (z) => !expectedZoneIds.has(z.id),
      );

      // Mismatch when at least one template zone is missing from the run
      const zonesMismatch = ![...expectedZoneIds].every((id) =>
        currentZoneIds.has(id),
      );

      // Build a map of zoneId -> translated names for display (never persisted)
      const newMap = new Map<string, { fr?: string; en?: string }>();
      correctZones.forEach((z) => {
        if (z.zoneNames) newMap.set(z.id, z.zoneNames);
      });
      setZoneNamesMap(newMap);

      // For non-custom regions: sync zones if mismatch
      if (run.region !== "custom" && zonesMismatch) {
        const syncedZones = expectedZones.map((expectedZone) => {
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
        updateRun({ ...run, zones: [...syncedZones, ...userAddedZones] });
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
    { key: "lost", label: t(tr.zoneList.filterLost, lang) },
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
      if (!zoneToRemove) {
        setZoneToDelete(null);
        return;
      }

      // Get all capture IDs from the zone to remove team members
      const captureIdsToRemove = new Set(
        zoneToRemove.captures.map((c) => c.id),
      );

      // Soul Link: also remove the captures from each player's team
      const cleanedPlayerTeams = run.playerTeams
        ? Object.fromEntries(
            Object.entries(run.playerTeams).map(([idx, team]) => [
              idx,
              team.filter((member) => !captureIdsToRemove.has(member.id)),
            ]),
          )
        : undefined;

      // Remove the zone, archive it for a possible restore and filter out team members from this zone
      updateRun({
        ...run,
        zones: run.zones.filter((z) => z.id !== zoneToDelete),
        removedZones: [
          ...removedZones.filter((z) => z.id !== zoneToRemove.id),
          { ...zoneToRemove, updatedAt: Date.now() },
        ],
        team: run.team.filter((member) => !captureIdsToRemove.has(member.id)),
        ...(cleanedPlayerTeams !== undefined
          ? { playerTeams: cleanedPlayerTeams }
          : {}),
      });
      setZoneToDelete(null);
    }
  };

  const handleRestoreZone = (zoneId: string) => {
    const zoneToRestore = removedZones.find((z) => z.id === zoneId);
    if (!zoneToRestore || run.zones.some((z) => z.id === zoneId)) return;

    const restoredZone = zoneToRestore;

    // Template zones go back to their template position, custom zones are appended
    const templateIndex = templateZoneIds.indexOf(zoneId);
    const nextZones = [...run.zones];
    if (templateIndex === -1) {
      nextZones.push(restoredZone);
    } else {
      const insertAt = nextZones.findIndex((z) => {
        const idx = templateZoneIds.indexOf(z.id);
        return idx > templateIndex;
      });
      nextZones.splice(
        insertAt === -1 ? nextZones.length : insertAt,
        0,
        restoredZone,
      );
    }

    // Put alive captures back in the team(s) while there is room; the others stay in the reserve
    const aliveCaptures = restoredZone.captures.filter((c) => !c.isDead);
    let nextTeam = run.team;
    let nextPlayerTeams = run.playerTeams;
    if (run.isSoulLinkMode) {
      nextPlayerTeams = { ...(run.playerTeams ?? {}) };
      aliveCaptures.forEach((capture) => {
        const playerIdx = capture.playerIndex ?? 0;
        const playerTeam = nextPlayerTeams![playerIdx] ?? [];
        if (
          playerTeam.length < 6 &&
          !playerTeam.some((c) => c.id === capture.id)
        ) {
          nextPlayerTeams![playerIdx] = [...playerTeam, capture];
        }
      });
    } else {
      nextTeam = [...run.team];
      aliveCaptures.forEach((capture) => {
        if (nextTeam.length < 6 && !nextTeam.some((c) => c.id === capture.id)) {
          nextTeam.push(capture);
        }
      });
    }

    updateRun({
      ...run,
      zones: nextZones,
      removedZones: removedZones.filter((z) => z.id !== zoneId),
      team: nextTeam,
      ...(nextPlayerTeams !== undefined
        ? { playerTeams: nextPlayerTeams }
        : {}),
    });

    if (removedZones.length <= 1) setShowRemovedZonesDialog(false);
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

        {/* Removed zones button (only when there is something to restore) */}
        {removedZones.length > 0 && (
          <StyledButton
            variant="secondary"
            onClick={() => setShowRemovedZonesDialog(true)}
            sx={{ width: "100%" }}
          >
            {t(tr.zoneList.removedZonesButton, lang)(removedZones.length)}
          </StyledButton>
        )}
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

      {/* Removed Zones Dialog */}
      <Dialog
        open={showRemovedZonesDialog}
        onClose={() => setShowRemovedZonesDialog(false)}
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
          {t(tr.zoneList.removedZonesTitle, lang)}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ fontSize: "0.875rem", mb: 2 }}>
            {t(tr.zoneList.removedZonesDescription, lang)}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {removedZones.map((zone) => {
              const displayZone = {
                ...zone,
                zoneNames: zoneNamesMap.get(zone.id) ?? zone.zoneNames,
              };
              const name =
                getZoneDisplayName(displayZone, lang) || zone.zoneName;
              return (
                <Box
                  key={zone.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    background: "#fff",
                    border: "2px solid #000",
                    borderRadius: "0.75rem",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </Box>
                    <Box sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {zone.regionArea ? `${zone.regionArea} · ` : ""}
                      {t(
                        tr.zoneList.removedZoneCaptures,
                        lang,
                      )(zone.captures.length)}
                    </Box>
                  </Box>
                  <StyledButton
                    variant="primary"
                    onClick={() => handleRestoreZone(zone.id)}
                  >
                    {t(tr.zoneList.restoreButton, lang)}
                  </StyledButton>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <StyledButton
            variant="secondary"
            onClick={() => setShowRemovedZonesDialog(false)}
          >
            {t(tr.zoneList.removedZonesClose, lang)}
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
