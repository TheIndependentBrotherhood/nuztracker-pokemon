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

// Zone layout based on HG/SS Johto geography
// East (right): New Bark Town / starting area
// West (left): Cianwood / Olivine
// North-right: Blackthorn / Mt. Silver
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // --- Starting area (south-east) ---
  "new-bark-town": { x: 582, y: 418, w: 80, h: 35, label: "Bourg Épine" },
  "johto-route-29": { x: 475, y: 423, w: 102, h: 24, label: "R.29" },
  "cherrygrove-city": { x: 412, y: 413, w: 60, h: 35, label: "Cherrove" },
  "johto-route-30": { x: 432, y: 362, w: 24, h: 46, label: "R.30" },
  "johto-route-31": { x: 432, y: 305, w: 24, h: 53, label: "R.31" },
  "dark-cave": { x: 413, y: 282, w: 42, h: 20, label: "Grotte Sombre" },
  "violet-city": { x: 390, y: 240, w: 80, h: 38, label: "Violette" },
  "sprout-tower": { x: 475, y: 246, w: 70, h: 28, label: "Tour Ortie" },

  // --- South loop (Violet → Azalea) ---
  "ruins-of-alph": { x: 310, y: 318, w: 75, h: 28, label: "Ruines d'Alph" },
  "johto-route-32": { x: 330, y: 350, w: 24, h: 58, label: "R.32" },
  "union-cave": { x: 302, y: 393, w: 28, h: 40, label: "Grotte Union" },
  "johto-route-33": { x: 244, y: 423, w: 54, h: 24, label: "R.33" },
  "azalea-town": { x: 163, y: 415, w: 75, h: 35, label: "Agaronia" },
  "slowpoke-well": { x: 165, y: 453, w: 62, h: 24, label: "Puits Roigada" },

  // --- Goldenrod path (Azalea → Goldenrod) ---
  "ilex-forest": { x: 170, y: 370, w: 60, h: 40, label: "Forêt Ilex" },
  "johto-route-34": { x: 228, y: 340, w: 24, h: 58, label: "R.34" },
  "goldenrod-city": { x: 162, y: 280, w: 95, h: 55, label: "Doublonville" },
  "radio-tower": { x: 262, y: 293, w: 52, h: 28, label: "Tour Radio" },

  // --- Northeast (Goldenrod → Ecruteak) ---
  "johto-route-35": { x: 235, y: 238, w: 24, h: 38, label: "R.35" },
  "national-park": { x: 196, y: 176, w: 82, h: 58, label: "Parc Nat." },
  "johto-route-36": { x: 118, y: 280, w: 40, h: 24, label: "R.36" },
  "johto-route-37": { x: 85, y: 238, w: 24, h: 38, label: "R.37" },
  "ecruteak-city": { x: 33, y: 183, w: 80, h: 50, label: "Acoua" },
  "burned-tower": { x: 33, y: 237, w: 62, h: 24, label: "Tour Cendrée" },
  "bell-tower": { x: 118, y: 162, w: 52, h: 28, label: "Tour Cristal" },

  // --- Olivine / Cianwood (west coast) ---
  "johto-route-38": { x: 18, y: 158, w: 62, h: 22, label: "R.38" },
  "johto-route-39": { x: 18, y: 233, w: 24, h: 58, label: "R.39" },
  "olivine-city": { x: 18, y: 296, w: 72, h: 40, label: "Oliville" },
  "johto-lighthouse": { x: 18, y: 340, w: 62, h: 22, label: "Phare" },
  "johto-sea-route-40": { x: 18, y: 366, w: 72, h: 22, label: "Ch.40" },
  "johto-sea-route-41": { x: 18, y: 392, w: 72, h: 22, label: "Ch.41" },
  "cianwood-city": { x: 18, y: 418, w: 72, h: 38, label: "Irisia" },

  // --- North-west (above Ecruteak) ---
  "johto-route-47": { x: 18, y: 118, w: 52, h: 22, label: "R.47" },
  "johto-route-48": { x: 75, y: 116, w: 52, h: 22, label: "R.48" },
  "cliff-cave": { x: 18, y: 90, w: 50, h: 26, label: "Grotte Falaise" },

  // --- Ecruteak → Mahogany ---
  "johto-route-42": { x: 118, y: 148, w: 95, h: 24, label: "R.42" },
  "mt-mortar": { x: 218, y: 140, w: 62, h: 30, label: "Mt. Mortagne" },
  "johto-route-43": { x: 290, y: 108, w: 24, h: 60, label: "R.43" },
  "lake-of-rage": { x: 286, y: 65, w: 88, h: 40, label: "Lac Colère" },
  "mahogany-town": { x: 322, y: 118, w: 82, h: 38, label: "Acajou" },
  "team-rocket-hq": { x: 325, y: 160, w: 72, h: 24, label: "QG Rocket" },

  // --- Mahogany → Blackthorn ---
  "johto-route-44": { x: 388, y: 134, w: 24, h: 62, label: "R.44" },
  "ice-path": { x: 386, y: 105, w: 62, h: 26, label: "Chemin Glace" },
  "blackthorn-city": { x: 432, y: 116, w: 82, h: 40, label: "Carbone" },
  "dragons-den": { x: 442, y: 160, w: 65, h: 24, label: "Antre Dragon" },
  "johto-route-45": { x: 432, y: 188, w: 24, h: 65, label: "R.45" },
  "johto-route-46": { x: 432, y: 257, w: 24, h: 50, label: "R.46" },

  // --- Mt. Silver area (far north-east) ---
  "johto-route-28": { x: 542, y: 148, w: 24, h: 100, label: "R.28" },
  "mt-silver": { x: 555, y: 55, w: 90, h: 55, label: "Mont Argenté" },
  "mt-silver-cave": { x: 558, y: 113, w: 85, h: 28, label: "Grotte Arg." },

  // --- Post-game (Kanto border, south-east) ---
  "johto-route-26": { x: 602, y: 335, w: 24, h: 78, label: "R.26" },
  "johto-route-27": { x: 552, y: 390, w: 48, h: 24, label: "R.27" },
  "tohjo-falls": { x: 552, y: 418, w: 65, h: 24, label: "Chutes Tohjo" },
};

export default function JohtoMap({
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

        {/* Land mass rough shape */}
        <path
          d="M 15 55 L 700 55 L 700 505 L 15 505 Z"
          fill="#2d4a1e"
          opacity="0.3"
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
