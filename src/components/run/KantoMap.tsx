"use client";

import { Box } from "@mui/material";

interface Props {
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  getZoneStatus: (zoneId: string) => string;
  getZoneLabel: (zoneId: string) => string | null;
}

const statusColor: Record<string, string> = {
  "not-visited": "#4B5563",
  visited: "#60A5FA",
  captured: "#34D399",
  multiple: "#FB923C",
};

const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  "pallet-town": { x: 120, y: 480, w: 70, h: 40, label: "Pallet" },
  "kanto-route-1": { x: 143, y: 430, w: 25, h: 45, label: "R.1" },
  "viridian-city": { x: 100, y: 378, w: 80, h: 40, label: "Viridian" },
  "kanto-route-22": { x: 20, y: 378, w: 75, h: 30, label: "R.22" },
  "kanto-route-2": { x: 143, y: 350, w: 25, h: 25, label: "R.2" },
  "viridian-forest": { x: 116, y: 322, w: 58, h: 28, label: "Forêt Jade" },
  "pewter-city": { x: 100, y: 260, w: 80, h: 40, label: "Pewter" },
  "kanto-route-3": { x: 185, y: 270, w: 90, h: 30, label: "R.3" },
  "mt-moon": { x: 280, y: 255, w: 60, h: 40, label: "Mt.Moon" },
  "kanto-route-4": { x: 345, y: 265, w: 80, h: 30, label: "R.4" },
  "cerulean-city": { x: 340, y: 195, w: 90, h: 40, label: "Cerulean" },
  "cerulean-cave": { x: 287, y: 193, w: 50, h: 28, label: "Grotte Az." },
  "kanto-route-24": { x: 375, y: 152, w: 25, h: 38, label: "R.24" },
  "kanto-route-25": { x: 403, y: 147, w: 75, h: 24, label: "R.25" },
  "kanto-route-9": { x: 435, y: 200, w: 80, h: 25, label: "R.9" },
  "kanto-route-10": { x: 435, y: 228, w: 25, h: 55, label: "R.10" },
  "rock-tunnel": { x: 463, y: 228, w: 52, h: 28, label: "Grotte" },
  "kanto-power-plant": { x: 465, y: 258, w: 58, h: 25, label: "Centrale" },
  "kanto-route-5": { x: 355, y: 250, w: 30, h: 50, label: "R.5" },
  "kanto-route-6": { x: 355, y: 305, w: 30, h: 50, label: "R.6" },
  "saffron-city": { x: 320, y: 305, w: 90, h: 45, label: "Saffron" },
  "kanto-route-7": { x: 265, y: 315, w: 50, h: 25, label: "R.7" },
  "celadon-city": { x: 175, y: 305, w: 85, h: 45, label: "Celadon" },
  "kanto-route-16": { x: 100, y: 310, w: 70, h: 25, label: "R.16" },
  "kanto-route-17": { x: 110, y: 340, w: 25, h: 80, label: "R.17" },
  "kanto-route-18": { x: 110, y: 425, w: 70, h: 25, label: "R.18" },
  "kanto-route-8": { x: 265, y: 260, w: 70, h: 25, label: "R.8" },
  "lavender-town": { x: 460, y: 265, w: 80, h: 40, label: "Lavender" },
  "pokemon-tower": { x: 545, y: 265, w: 58, h: 28, label: "Tour Pkm" },
  "kanto-route-11": { x: 460, y: 310, w: 80, h: 25, label: "R.11" },
  "kanto-route-12": { x: 510, y: 340, w: 25, h: 80, label: "R.12" },
  "vermilion-city": { x: 340, y: 360, w: 90, h: 40, label: "Vermilion" },
  "ss-anne": { x: 340, y: 403, w: 80, h: 22, label: "L'Océane" },
  "digletts-cave": { x: 248, y: 360, w: 68, h: 22, label: "Cave Taupiq." },
  "kanto-route-13": { x: 460, y: 420, w: 80, h: 25, label: "R.13" },
  "kanto-route-14": { x: 545, y: 340, w: 25, h: 80, label: "R.14" },
  "kanto-route-15": { x: 460, y: 450, w: 80, h: 25, label: "R.15" },
  "fuchsia-city": { x: 340, y: 410, w: 90, h: 40, label: "Fuchsia" },
  "kanto-safari-zone": { x: 245, y: 400, w: 90, h: 45, label: "Safari Zone" },
  "kanto-sea-route-19": { x: 370, y: 455, w: 25, h: 50, label: "Ch.19" },
  "kanto-sea-route-20": { x: 200, y: 490, w: 165, h: 25, label: "Ch.20" },
  "seafoam-islands": { x: 185, y: 475, w: 45, h: 45, label: "Seafoam" },
  "cinnabar-island": { x: 185, y: 525, w: 80, h: 40, label: "Cinnabar" },
  "pokemon-mansion": { x: 270, y: 523, w: 65, h: 27, label: "Manoir Pkm" },
  "kanto-sea-route-21": { x: 155, y: 455, w: 25, h: 70, label: "Ch.21" },
  "kanto-route-23": { x: 20, y: 290, w: 25, h: 85, label: "R.23" },
  "kanto-victory-road-1": { x: 20, y: 220, w: 60, h: 65, label: "Victory Rd" },
  "indigo-plateau": { x: 20, y: 170, w: 80, h: 45, label: "Plateau Indigo" },
};

export default function KantoMap({
  selectedZoneId,
  onZoneClick,
  getZoneStatus,
  getZoneLabel,
}: Props) {
  return (
    <Box
      sx={{
        position: "relative",
        background: "rgba(30, 58, 95, 0.3)",
        width: "100%",
        paddingBottom: "75%",
      }}
    >
      <svg
        viewBox="0 0 700 575"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          fontFamily: "sans-serif",
        }}
      >
        <rect
          x="0"
          y="0"
          width="700"
          height="575"
          fill="#1e3a5f"
          opacity="0.5"
          rx="8"
        />

        <path
          d="M 85 155 L 115 155 L 115 165 L 285 165 L 285 155 L 555 155 L 555 490 L 525 490 L 525 510 L 135 510 L 135 520 L 100 520 L 100 490 L 55 490 L 55 200 L 85 200 Z"
          fill="#2d4a1e"
          opacity="0.4"
          stroke="#374151"
          strokeWidth="1"
        />

        {Object.entries(zoneLayout).map(([id, { x, y, w, h, label }]) => {
          const status = getZoneStatus(id);
          const isSelected = selectedZoneId === id;
          const fill = statusColor[status] ?? statusColor["not-visited"];

          return (
            <g
              key={id}
              onClick={() => onZoneClick(id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="4"
                fill={fill}
                fillOpacity={isSelected ? 1 : 0.8}
                stroke={isSelected ? "#FBBF24" : "#6B7280"}
                strokeWidth={isSelected ? 2.5 : 1}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={w < 50 ? "7" : "8"}
                fontWeight="600"
                fill="#fff"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {getZoneLabel(id) ?? label}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
