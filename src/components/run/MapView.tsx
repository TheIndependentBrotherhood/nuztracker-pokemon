"use client";

import { Run } from "@/lib/types";
import { Box, Typography } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import KantoMap from "./KantoMap";
import JohtoMap from "./JohtoMap";
import HoennMap from "./HoennMap";
import SinnohMap from "./SinnohMap";
import UnovaMap from "./UnovaMap";
import KalosMap from "./KalosMap";
import AlolaMap from "./AlolaMap";
import GalarMap from "./GalarMap";
import PaldeaMap from "./PaldeaMap";
import HisuiMap from "./HisuiMap";
import OrreMap from "./OrreMap";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { regionZones } from "@/lib/zones";

interface Props {
  run: Run;
}

export default function MapView({ run }: Props) {
  const { setSelectedZone, selectedZoneId } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;

  function getZoneStatus(zoneId: string) {
    const zone = run.zones.find((z) => z.id === zoneId);
    if (!zone) return "not-visited";
    if (run.isShinyHuntMode && zone.captures.length >= 2) return "multiple";
    return zone.status;
  }

  function getZoneLabel(zoneId: string): string | null {
    const zones = regionZones[run.region];
    if (!zones) return null;
    const template = zones.find((z) => z.id === zoneId);
    if (!template) return null;
    return template.zoneNames?.[lang] ?? template.zoneName ?? null;
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
          {run.region} {t(tr.mapView.regionMap, lang)}
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
            {t(tr.mapView.notVisited, lang)}
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
            {t(tr.mapView.visited, lang)}
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
            {t(tr.mapView.captured, lang)}
          </Box>
          {run.isShinyHuntMode && (
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
              {t(tr.mapView.multiple, lang)}
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ p: 2, background: "#fff" }}>
        {run.region === "kanto" && (
          <KantoMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "johto" && (
          <JohtoMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "hoenn" && (
          <HoennMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "sinnoh" && (
          <SinnohMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "unova" && (
          <UnovaMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "kalos" && (
          <KalosMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "alola" && (
          <AlolaMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "galar" && (
          <GalarMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "paldea" && (
          <PaldeaMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "hisui" && (
          <HisuiMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {run.region === "orre" && (
          <OrreMap
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            getZoneStatus={getZoneStatus}
            getZoneLabel={getZoneLabel}
          />
        )}
        {![
          "kanto",
          "johto",
          "hoenn",
          "sinnoh",
          "unova",
          "kalos",
          "alola",
          "galar",
          "paldea",
          "hisui",
          "orre",
        ].includes(run.region) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              color: "#6B7280",
              fontSize: "0.875rem",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {t(tr.mapView.noMapAvailable, lang)}
          </Box>
        )}
      </Box>
    </Box>
  );
}
