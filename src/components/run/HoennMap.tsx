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

// Zone layout based on RSE/ORAS Hoenn geography
// South-east: Littleroot / starting area
// North-west: Rustboro / Fallarbor
// East: Fortree / Lilycove / Ever Grande
// South islands: Dewford / sea routes
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // --- Starting area (south-east) ---
  "littleroot-town": { x: 568, y: 440, w: 88, h: 35, label: "Bourg-en-Vol" },
  "hoenn-route-101": { x: 574, y: 400, w: 24, h: 36, label: "R.101" },
  "oldale-town": { x: 535, y: 368, w: 72, h: 30, label: "Rosyères" },
  "hoenn-route-103": { x: 573, y: 340, w: 75, h: 24, label: "R.103" },
  "hoenn-route-102": { x: 428, y: 372, w: 102, h: 24, label: "R.102" },

  // --- Petalburg area ---
  "petalburg-city": { x: 342, y: 362, w: 80, h: 38, label: "Clémenti-Ville" },
  "hoenn-route-104": { x: 332, y: 292, w: 24, h: 66, label: "R.104" },
  "petalburg-woods": { x: 296, y: 272, w: 62, h: 48, label: "Bois Clémenti" },

  // --- Rustboro area ---
  "rustboro-city": { x: 295, y: 185, w: 80, h: 45, label: "Mérouville" },
  "hoenn-route-116": { x: 380, y: 195, w: 82, h: 24, label: "R.116" },
  "rusturf-tunnel": { x: 467, y: 188, w: 68, h: 28, label: "Tunnel Mérazon" },
  "granite-cave": { x: 265, y: 295, w: 65, h: 28, label: "Grotte Granit" },

  // --- Sea routes south-west (toward Dewford) ---
  "hoenn-route-105": { x: 260, y: 328, w: 24, h: 58, label: "Ch.105" },
  "hoenn-route-106": { x: 225, y: 393, w: 24, h: 50, label: "Ch.106" },
  "dewford-town": { x: 168, y: 420, w: 75, h: 35, label: "Myokara" },

  // --- Sea routes east (toward Slateport) ---
  "hoenn-route-107": { x: 293, y: 420, w: 85, h: 24, label: "Ch.107" },
  "hoenn-route-108": { x: 382, y: 420, w: 65, h: 24, label: "Ch.108" },
  "abandoned-ship": { x: 382, y: 447, w: 62, h: 24, label: "Épave" },
  "hoenn-route-109": { x: 450, y: 393, w: 24, h: 55, label: "Ch.109" },
  "slateport-city": { x: 432, y: 330, w: 78, h: 38, label: "Poivressel" },
  "hoenn-route-110": { x: 452, y: 290, w: 24, h: 36, label: "R.110" },

  // --- Mauville area (center) ---
  "mauville-city": { x: 418, y: 245, w: 82, h: 40, label: "Lavandia" },
  "new-mauville": { x: 418, y: 224, w: 68, h: 18, label: "New Lavandia" },
  "hoenn-route-117": { x: 328, y: 255, w: 86, h: 24, label: "R.117" },
  "verdanturf-town": { x: 264, y: 245, w: 60, h: 35, label: "Vergazon" },

  // --- North from Mauville ---
  "hoenn-route-111": { x: 450, y: 178, w: 24, h: 62, label: "R.111" },
  "hoenn-route-112": { x: 380, y: 148, w: 65, h: 24, label: "R.112" },
  "fiery-path": { x: 380, y: 122, w: 62, h: 22, label: "Ch. Ardent" },
  "mt-chimney": { x: 310, y: 98, w: 85, h: 42, label: "Mont Chimnée" },
  "jagged-pass": { x: 310, y: 143, w: 58, h: 28, label: "Sentier Sinuroc" },
  "lavaridge-town": { x: 245, y: 143, w: 62, h: 35, label: "Vermilava" },
  "hoenn-route-113": { x: 192, y: 94, w: 112, h: 24, label: "R.113" },
  "fallarbor-town": { x: 138, y: 88, w: 50, h: 35, label: "Autéquia" },
  "hoenn-route-114": { x: 150, y: 126, w: 24, h: 62, label: "R.114" },
  "meteor-falls": { x: 152, y: 192, w: 72, h: 28, label: "Site Météore" },
  "hoenn-route-115": { x: 228, y: 185, w: 24, h: 85, label: "R.115" },
  "magma-hideout": { x: 358, y: 130, w: 65, h: 24, label: "Planque Magma" },

  // --- East from Mauville ---
  "hoenn-route-118": { x: 505, y: 252, w: 65, h: 24, label: "R.118" },
  "hoenn-route-119": { x: 575, y: 195, w: 24, h: 102, label: "R.119" },
  "fortree-city": { x: 540, y: 155, w: 75, h: 35, label: "Cimentonelle" },
  "hoenn-route-120": { x: 545, y: 120, w: 24, h: 32, label: "R.120" },
  "hoenn-route-121": { x: 540, y: 88, w: 24, h: 28, label: "R.121" },
  "lilycove-city": { x: 565, y: 65, w: 90, h: 40, label: "Nénucrique" },
  "team-aqua-hideout": { x: 590, y: 48, w: 70, h: 14, label: "Planque Aqua" },
  "hoenn-route-123": { x: 455, y: 88, w: 80, h: 24, label: "R.123" },
  "hoenn-route-122": { x: 530, y: 95, w: 24, h: 75, label: "Ch.122" },
  "mt-pyre": { x: 498, y: 100, w: 30, h: 65, label: "Mt.Mémoria" },

  // --- Far east sea routes ---
  "hoenn-route-124": { x: 620, y: 110, w: 24, h: 95, label: "Ch.124" },
  "mossdeep-city": { x: 630, y: 210, w: 48, h: 35, label: "Algatia" },
  "hoenn-route-125": { x: 630, y: 155, w: 24, h: 50, label: "Ch.125" },
  "shoal-cave": { x: 640, y: 125, w: 38, h: 24, label: "Grotte Tréfonds" },

  // --- Sootopolis area (center-south, island) ---
  "hoenn-route-126": { x: 605, y: 248, w: 24, h: 88, label: "Ch.126" },
  "sootopolis-city": { x: 540, y: 298, w: 80, h: 42, label: "Atalanopolis" },
  "cave-of-origin": { x: 543, y: 343, w: 68, h: 24, label: "Grotte Origine" },
  "hoenn-route-127": { x: 625, y: 298, w: 24, h: 78, label: "Ch.127" },
  "seafloor-cavern": { x: 590, y: 375, w: 78, h: 24, label: "Caverne Fondmer" },
  "hoenn-route-128": { x: 625, y: 380, w: 24, h: 65, label: "Ch.128" },
  "sky-pillar": { x: 518, y: 370, w: 55, h: 28, label: "Pilier Céleste" },

  // --- Ever Grande / League (south-east) ---
  "ever-grande-city": { x: 635, y: 448, w: 48, h: 32, label: "Éternara" },
  "hoenn-victory-road": { x: 615, y: 430, w: 24, h: 65, label: "Rte Victoire" },

  // --- Far south sea routes ---
  "hoenn-route-129": { x: 534, y: 418, w: 78, h: 22, label: "Ch.129" },
  "hoenn-route-130": { x: 452, y: 418, w: 78, h: 22, label: "Ch.130" },
  "hoenn-route-131": { x: 372, y: 430, w: 75, h: 22, label: "Ch.131" },
  "pacifidlog-town": { x: 355, y: 455, w: 72, h: 32, label: "Pacifiville" },
  "hoenn-route-132": { x: 282, y: 445, w: 68, h: 22, label: "Ch.132" },
  "hoenn-route-133": { x: 210, y: 445, w: 68, h: 22, label: "Ch.133" },
  "hoenn-route-134": { x: 140, y: 445, w: 65, h: 22, label: "Ch.134" },

  // --- Hoenn safari ---
  "hoenn-safari-zone": { x: 132, y: 165, w: 65, h: 25, label: "Zone Safari" },
};

export default function HoennMap({
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

        {/* Land mass rough shapes */}
        <path
          d="M 120 62 L 650 62 L 650 480 L 120 480 Z"
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
