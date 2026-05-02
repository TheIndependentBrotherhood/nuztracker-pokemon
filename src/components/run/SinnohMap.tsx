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

// Zone layout based on DP/BDSP Sinnoh geography
// Mt. Coronet (large feature) divides the region east/west
// South-west: Twinleaf / Sandgem / Jubilife
// North-east: Snowpoint / Veilstone / Sunyshore
// Far south-east: Pokémon League
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // --- Mt. Coronet (central divider) ---
  "mt-coronet": { x: 308, y: 72, w: 88, h: 330, label: "Mont Couronné" },
  "spear-pillar": { x: 315, y: 55, w: 72, h: 15, label: "Pilier Fer de Lance" },

  // === WEST SIDE ===

  // --- Starting area (south-west) ---
  "twinleaf-town": { x: 88, y: 448, w: 75, h: 35, label: "Ronflex" },
  "lake-verity": { x: 30, y: 430, w: 55, h: 38, label: "Lac Vérité" },
  "sinnoh-route-201": { x: 100, y: 408, w: 80, h: 24, label: "R.201" },
  "sandgem-town": { x: 185, y: 398, w: 72, h: 35, label: "Bonaugure" },
  "sinnoh-route-219": { x: 190, y: 436, w: 24, h: 48, label: "Ch.219" },
  "sinnoh-route-202": { x: 197, y: 360, w: 24, h: 34, label: "R.202" },
  "jubilife-city": { x: 162, y: 305, w: 90, h: 50, label: "Floraville" },
  "sinnoh-route-218": { x: 75, y: 315, w: 82, h: 24, label: "Ch.218" },
  "canalave-city": { x: 20, y: 295, w: 52, h: 40, label: "Joliberges" },
  "iron-island": { x: 20, y: 255, w: 55, h: 35, label: "Île d'Acier" },

  // --- Jubilife → Oreburgh ---
  "sinnoh-route-203": { x: 255, y: 318, w: 50, h: 24, label: "R.203" },
  "oreburgh-gate": { x: 255, y: 360, w: 48, h: 24, label: "Porte Minerais" },
  "oreburgh-city": { x: 248, y: 388, w: 55, h: 40, label: "Minerais" },
  "oreburgh-mine": { x: 248, y: 431, w: 55, h: 24, label: "Mine" },

  // --- North from Jubilife ---
  "sinnoh-route-204": { x: 185, y: 258, w: 24, h: 44, label: "R.204" },
  "floaroma-town": { x: 148, y: 210, w: 78, h: 38, label: "Floraville" },
  "valley-windworks": { x: 230, y: 216, w: 70, h: 28, label: "Vents de Val" },
  "sinnoh-route-205": { x: 185, y: 172, w: 24, h: 34, label: "R.205" },
  "fuego-ironworks": { x: 85, y: 188, w: 60, h: 28, label: "Forgex" },
  "eterna-forest": { x: 148, y: 122, w: 82, h: 46, label: "Forêt Éternia" },
  "old-chateau": { x: 148, y: 98, w: 65, h: 22, label: "Vieux Château" },
  "eterna-city": { x: 200, y: 70, w: 78, h: 45, label: "Éternalia" },
  "sinnoh-route-211": { x: 282, y: 82, w: 24, h: 28, label: "R.211 W" },

  // --- North-west routes ---
  "sinnoh-route-207": { x: 255, y: 295, w: 50, h: 22, label: "R.207" },
  "sinnoh-route-208": { x: 255, y: 268, w: 50, h: 22, label: "R.208" },
  "sinnoh-route-206": { x: 258, y: 185, w: 48, h: 80, label: "R.206" },
  "wayward-cave": { x: 260, y: 240, w: 46, h: 22, label: "Grotte Biscorne" },

  // --- Snowpoint route (north-west) ---
  "sinnoh-route-216": { x: 185, y: 78, w: 24, h: 42, label: "R.216" },
  "sinnoh-route-217": { x: 185, y: 38, w: 24, h: 38, label: "R.217" },
  "snowpoint-city": { x: 138, y: 20, w: 75, h: 38, label: "Blanche-Neige" },
  "snowpoint-temple": { x: 218, y: 20, w: 62, h: 30, label: "Temple" },
  "lake-acuity": { x: 60, y: 60, w: 75, h: 40, label: "Lac Sagesse" },
  "acuity-lakefront": { x: 60, y: 103, w: 72, h: 24, label: "Bords Sagesse" },

  // === EAST SIDE ===

  // --- Eterna → Hearthome ---
  "sinnoh-route-210": { x: 400, y: 72, w: 24, h: 88, label: "R.210 N" },
  "celestic-town": { x: 395, y: 55, w: 78, h: 35, label: "Célestia" },
  "sinnoh-route-211-e": { x: 400, y: 160, w: 24, h: 30, label: "R.211 E" },
  "hearthome-city": { x: 398, y: 194, w: 90, h: 50, label: "Cœuronne" },
  "amity-square": { x: 398, y: 247, w: 65, h: 22, label: "Parc Amitié" },
  "sinnoh-route-212": { x: 398, y: 272, w: 24, h: 90, label: "R.212 N" },
  "trophy-garden": { x: 425, y: 285, w: 62, h: 24, label: "Jard. Trophée" },

  // --- East routes (Hearthome → Veilstone) ---
  "sinnoh-route-215": { x: 492, y: 200, w: 24, h: 68, label: "R.215" },
  "veilstone-city": { x: 488, y: 152, w: 90, h: 45, label: "Acier-Bourg" },
  "lost-tower": { x: 425, y: 347, w: 55, h: 26, label: "Tour Perdue" },
  "sinnoh-route-209": { x: 400, y: 320, w: 24, h: 65, label: "R.209" },
  "solaceon-town": { x: 398, y: 390, w: 82, h: 40, label: "Bonhélio" },
  "solaceon-ruins": { x: 484, y: 393, w: 60, h: 28, label: "Ruines" },
  "sinnoh-route-214": { x: 400, y: 434, w: 24, h: 60, label: "R.214" },
  "valor-lakefront": { x: 430, y: 448, w: 72, h: 24, label: "Bords Bravoure" },
  "lake-valor": { x: 430, y: 475, w: 72, h: 30, label: "Lac Bravoure" },
  "sinnoh-route-213": { x: 490, y: 440, w: 72, h: 24, label: "R.213" },
  "pastoria-city": { x: 510, y: 388, w: 80, h: 45, label: "Marécajou" },
  "great-marsh": { x: 510, y: 340, w: 72, h: 44, label: "Marais" },
  "sinnoh-route-212-s": { x: 490, y: 272, w: 24, h: 64, label: "R.212 S" },

  // --- Veilstone → Sunyshore ---
  "sinnoh-route-222": { x: 566, y: 268, w: 76, h: 24, label: "R.222" },
  "sunyshore-city": { x: 578, y: 240, w: 82, h: 45, label: "Rivamar" },
  "sinnoh-route-221": { x: 596, y: 288, w: 24, h: 68, label: "R.221" },

  // --- Stark Mountain / Fight Area (post-game) ---
  "fight-area": { x: 568, y: 155, w: 65, h: 28, label: "Zone Combat" },
  "survival-area": { x: 568, y: 125, w: 68, h: 28, label: "Zone Survie" },
  "resort-area": { x: 568, y: 95, w: 65, h: 28, label: "Zone Détente" },
  "sinnoh-route-225": { x: 546, y: 120, w: 20, h: 65, label: "R.225" },
  "sinnoh-route-226": { x: 596, y: 65, w: 24, h: 60, label: "Ch.226" },
  "sinnoh-route-227": { x: 524, y: 65, w: 60, h: 24, label: "R.227" },
  "stark-mountain": { x: 480, y: 50, w: 78, h: 42, label: "Mt. Distorsion" },
  "sinnoh-route-228": { x: 524, y: 92, w: 20, h: 65, label: "R.228" },
  "spring-path": { x: 565, y: 200, w: 50, h: 20, label: "Sentier" },
  "turnback-cave": {
    x: 560,
    y: 178,
    w: 58,
    h: 20,
    label: "Grotte Aller-Retour",
  },

  // --- Pokémon League (south-east) ---
  "sinnoh-sea-route-223": { x: 610, y: 310, w: 24, h: 80, label: "Ch.223" },
  "sinnoh-victory-road": {
    x: 595,
    y: 393,
    w: 24,
    h: 65,
    label: "Rte Victoire",
  },
  "sinnoh-pokemon-league": {
    x: 580,
    y: 458,
    w: 90,
    h: 35,
    label: "Ligue Sinnoh",
  },
  "sinnoh-route-224": { x: 610, y: 395, w: 50, h: 24, label: "R.224" },
};

export default function SinnohMap({
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

        {/* Land mass */}
        <path
          d="M 18 18 L 682 18 L 682 492 L 18 492 Z"
          fill="#2d4a1e"
          opacity="0.25"
          stroke="#374151"
          strokeWidth="1"
        />

        {Object.entries(zoneLayout).map(([id, { x, y, w, h, label }]) => {
          if (!label) return null;

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
