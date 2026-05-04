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

// Orre layout — Pokémon Colosseum & XD: Gale of Darkness
// Simple 4-column grid (18 zones, spacious layout)
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // Row 1 (y=35)
  "outskirt-stand": { x: 22, y: 35, w: 155, h: 55, label: "Stand Extérieur" },
  "phenac-city": { x: 192, y: 35, w: 155, h: 55, label: "Phénochaleur" },
  "snagem-hideout": { x: 362, y: 35, w: 155, h: 55, label: "Repaire Snagem" },
  "gateon-port": { x: 532, y: 35, w: 155, h: 55, label: "Port Gateon" },

  // Row 2 (y=115)
  "mt-battle": { x: 22, y: 115, w: 155, h: 55, label: "Mont Combat" },
  "pyrite-town": { x: 192, y: 115, w: 155, h: 55, label: "Poussifer" },
  "pyrite-bldg": { x: 362, y: 115, w: 155, h: 55, label: "Bâtiment Poussifer" },
  "pokemon-hq-lab": { x: 532, y: 115, w: 155, h: 55, label: "QG Laboratoire" },

  // Row 3 (y=195)
  "agate-village": { x: 22, y: 195, w: 155, h: 55, label: "Village Kiefer" },
  "pyrite-cave": { x: 192, y: 195, w: 155, h: 55, label: "Grotte Poussifer" },
  "the-under": { x: 362, y: 195, w: 155, h: 55, label: "L'En-Dessous" },
  "cipher-lab": { x: 532, y: 195, w: 155, h: 55, label: "Laboratoire Cipher" },

  // Row 4 (y=275)
  "realgam-tower": { x: 22, y: 275, w: 155, h: 55, label: "Tour Realgam" },
  "shadow-pokemon-lab": {
    x: 192,
    y: 275,
    w: 155,
    h: 55,
    label: "Labo Pkmn Obscurs",
  },
  "cipher-key-lair": {
    x: 362,
    y: 275,
    w: 155,
    h: 55,
    label: "Repaire Clé Cipher",
  },
  "citadark-isle": { x: 532, y: 275, w: 155, h: 55, label: "Île Citadark" },

  // Row 5 (y=355)
  pokespot: { x: 22, y: 355, w: 155, h: 55, label: "Pok'Endroit" },
  onbs: { x: 192, y: 355, w: 155, h: 55, label: "ONBS" },
};

export default function OrreMap({
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
        viewBox="0 0 700 510"
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
          height="510"
          fill="#3a2a10"
          opacity="0.5"
          rx="8"
        />

        {/* Row labels */}
        <text
          x="350"
          y="20"
          textAnchor="middle"
          fontSize="9"
          fill="#D97706"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          ORRE — Colosseum & XD: Gale of Darkness
        </text>

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
                rx="6"
                fill={fill}
                fillOpacity={isSelected ? 1 : 0.85}
                stroke={isSelected ? "#FBBF24" : "#6B7280"}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="700"
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
