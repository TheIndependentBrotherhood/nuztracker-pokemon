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

// Kalos layout — X/Y
// Lumiose City (center hub) with a clockwise loop:
// South-east start (Vaniville) → Santalune → Lumiose
// West arc: Camphrier → Cyllage (coast) → Ambrette → Geosenge → Shalour → Coumarine
// East arc from Lumiose: Laverre → Dendemille → Anistar → Couriway → Snowbelle → League (north)
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // === SOUTH START ===
  "vaniville-town": { x: 550, y: 455, w: 78, h: 30, label: "Vaniville" },
  "kalos-route-1": { x: 500, y: 437, w: 45, h: 22, label: "R.1" },
  "aquacorde-town": { x: 430, y: 428, w: 68, h: 28, label: "Aquacorde" },
  "kalos-route-2": { x: 385, y: 405, w: 22, h: 22, label: "R.2" },
  "santalune-forest": {
    x: 330,
    y: 382,
    w: 80,
    h: 30,
    label: "Forêt Santalune",
  },
  "kalos-route-3": { x: 310, y: 350, w: 22, h: 28, label: "R.3" },
  "santalune-city": { x: 268, y: 332, w: 78, h: 32, label: "Santalune" },
  "kalos-route-4": { x: 268, y: 295, w: 22, h: 34, label: "R.4" },

  // === CENTER — LUMIOSE ===
  "lumiose-city": { x: 238, y: 230, w: 95, h: 55, label: "Illumis" },
  "prism-tower": { x: 238, y: 205, w: 62, h: 22, label: "Tour Prismatique" },
  "lysandre-labs": { x: 338, y: 240, w: 70, h: 24, label: "Labo Lysandre" },

  // === WEST ARC ===
  "kalos-route-5": { x: 175, y: 245, w: 58, h: 22, label: "R.5" },
  "camphrier-town": { x: 108, y: 242, w: 62, h: 30, label: "Camphélia" },
  "shabboneau-castle": { x: 108, y: 215, w: 65, h: 22, label: "Châ. Douveau" },
  "kalos-route-6": { x: 90, y: 278, w: 22, h: 30, label: "R.6" },
  "parfum-palace": { x: 52, y: 295, w: 72, h: 28, label: "Palais Parfum" },
  "kalos-route-7": { x: 52, y: 330, w: 22, h: 32, label: "R.7" },
  "cyllage-city": { x: 38, y: 368, w: 72, h: 32, label: "Cyanure" },
  "battle-chateau": { x: 115, y: 372, w: 65, h: 24, label: "Châ. Combat" },
  "kalos-route-8": { x: 70, y: 405, w: 22, h: 30, label: "R.8 (côte)" },
  "ambrette-town": { x: 95, y: 438, w: 68, h: 28, label: "Ambre" },
  "glittering-cave": { x: 95, y: 468, w: 65, h: 22, label: "Grotte Azur" },
  "kalos-route-9": { x: 167, y: 448, w: 50, h: 22, label: "R.9" },
  "kalos-route-10": { x: 225, y: 440, w: 50, h: 22, label: "R.10" },
  "geosenge-town": { x: 280, y: 435, w: 72, h: 28, label: "Géosenge" },
  "team-flare-secret-hq": { x: 280, y: 465, w: 75, h: 22, label: "QG Flare" },
  "connecting-cave": { x: 356, y: 435, w: 55, h: 22, label: "Grotte Liaison" },
  "kalos-route-11": { x: 355, y: 405, w: 22, h: 27, label: "R.11" },
  "reflection-cave": { x: 355, y: 372, w: 65, h: 28, label: "Grotte Miroir" },
  "shalour-city": { x: 380, y: 340, w: 72, h: 28, label: "Shalour" },
  "tower-of-mastery": { x: 458, y: 342, w: 65, h: 24, label: "Tour Maîtrise" },

  // North-west of Shalour (Route 12 → Coumarine)
  "kalos-route-12": { x: 400, y: 305, w: 22, h: 32, label: "R.12" },
  "coumarine-city": { x: 382, y: 268, w: 78, h: 32, label: "Coumarina" },
  "azure-bay": { x: 465, y: 280, w: 65, h: 25, label: "Baie Azuréenne" },

  // === EAST ARC from Lumiose ===
  "kalos-route-13": { x: 338, y: 268, w: 22, h: 30, label: "R.13" },
  "kalos-route-14": { x: 395, y: 232, w: 45, h: 22, label: "R.14" },
  "laverre-city": { x: 445, y: 225, w: 75, h: 30, label: "Boulerouge" },
  "poke-ball-factory": {
    x: 525,
    y: 228,
    w: 70,
    h: 24,
    label: "Usine Poké Ball",
  },
  "kalos-route-15": { x: 498, y: 200, w: 22, h: 24, label: "R.15" },
  "dendemille-town": { x: 478, y: 170, w: 80, h: 28, label: "Dendemille" },
  "kalos-route-16": { x: 530, y: 162, w: 22, h: 30, label: "R.16" },
  "lost-hotel": { x: 530, y: 136, w: 65, h: 22, label: "Hôtel Perdu" },
  "frost-cavern": { x: 558, y: 112, w: 70, h: 22, label: "Caverne Givre" },
  "kalos-route-17": { x: 580, y: 90, w: 22, h: 20, label: "R.17" },
  "anistar-city": { x: 548, y: 65, w: 78, h: 28, label: "Anistar" },
  "kalos-route-18": { x: 512, y: 55, w: 32, h: 22, label: "R.18" },
  "couriway-town": { x: 468, y: 48, w: 40, h: 30, label: "Couriway" },
  "kalos-route-19": { x: 430, y: 40, w: 35, h: 22, label: "R.19" },
  "snowbelle-city": { x: 385, y: 38, w: 42, h: 30, label: "Frimas" },
  "kalos-route-20": { x: 348, y: 40, w: 35, h: 22, label: "R.20" },
  "pokemon-village": { x: 305, y: 38, w: 40, h: 28, label: "Village Pkm" },
  "kalos-route-21": { x: 268, y: 40, w: 34, h: 22, label: "R.21" },
  "kalos-victory-road": { x: 228, y: 38, w: 38, h: 28, label: "Rte Victoire" },
  "kalos-route-22": { x: 192, y: 40, w: 34, h: 22, label: "R.22" },
  "kalos-pokemon-league": { x: 148, y: 38, w: 42, h: 32, label: "Ligue Kalos" },

  // === EXTRAS ===
  "terminus-cave": { x: 555, y: 195, w: 68, h: 22, label: "Grotte Terminus" },
  "kalos-power-plant": {
    x: 340,
    y: 308,
    w: 72,
    h: 22,
    label: "Centrale Kalos",
  },
  "kiloude-city": { x: 620, y: 65, w: 62, h: 28, label: "Kiloude" },
  "sea-spirits-den": { x: 460, y: 358, w: 68, h: 22, label: "Antre Luvres" },
};

export default function KalosMap({
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
          fill="#1e3a5f"
          opacity="0.5"
          rx="8"
        />
        <path
          d="M 30 22 L 670 22 L 670 490 L 30 490 Z"
          fill="#2d4a1e"
          opacity="0.25"
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
                fontSize={w < 45 ? "6.5" : "8"}
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
