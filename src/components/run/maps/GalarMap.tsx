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

// Galar layout — Sword/Shield
// Linear north-south region: Postwick (south) → Wyndon (north).
// Wild Area occupies the central band.
// DLC areas:
//   Isle of Armor (right side, eastern DLC)
//   Crown Tundra (top-left, northern DLC)
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // === SOUTH — MAIN ROUTE START ===
  postwick: { x: 228, y: 468, w: 70, h: 30, label: "Postwick" },
  "slumbering-weald": {
    x: 305,
    y: 468,
    w: 75,
    h: 28,
    label: "Forêt Enchanteuse",
  },
  "galar-route-1": { x: 228, y: 435, w: 22, h: 30, label: "R.1" },
  wedgehurst: { x: 192, y: 405, w: 75, h: 28, label: "Mesproville" },
  "galar-route-2": { x: 215, y: 372, w: 22, h: 30, label: "R.2" },
  "galar-mine": { x: 248, y: 376, w: 65, h: 24, label: "Mine de Galar" },
  "galar-mine-no-2": { x: 248, y: 404, w: 65, h: 22, label: "Mine Galar n°2" },
  motostoke: { x: 192, y: 338, w: 78, h: 32, label: "Motorby" },
  "motostoke-outskirts": {
    x: 278,
    y: 342,
    w: 78,
    h: 24,
    label: "Faubourgs Motor.",
  },

  // === WILD AREA (center band) ===
  "rolling-fields": { x: 22, y: 285, w: 70, h: 30, label: "Plaines Roulantes" },
  "dappled-grove": { x: 22, y: 320, w: 65, h: 25, label: "Bois Tacheté" },
  "watchtower-ruins": { x: 22, y: 350, w: 65, h: 25, label: "Tour Guet" },
  "west-lake-axewell": { x: 92, y: 285, w: 65, h: 35, label: "Lac Axewell O." },
  "axews-eye": { x: 162, y: 295, w: 42, h: 28, label: "Île Axew" },
  "south-lake-miloch": { x: 162, y: 328, w: 42, h: 28, label: "Lac Miloch S." },
  "east-lake-axewell": {
    x: 285,
    y: 285,
    w: 68,
    h: 32,
    label: "Lac Axewell E.",
  },
  "north-lake-miloch": { x: 162, y: 262, w: 42, h: 28, label: "Lac Miloch N." },
  "motostoke-riverbank": {
    x: 209,
    y: 265,
    w: 72,
    h: 25,
    label: "Rivière Motor.",
  },
  "bridge-field": { x: 209, y: 295, w: 72, h: 30, label: "Champ Pont" },
  "stony-wilderness": { x: 285, y: 322, w: 72, h: 28, label: "Pierreuse" },
  "dusty-bowl": { x: 285, y: 255, w: 68, h: 28, label: "Bol Poussiéreux" },
  "giants-seat": { x: 285, y: 352, w: 65, h: 25, label: "Siège du Géant" },
  "giants-cap": { x: 209, y: 355, w: 68, h: 25, label: "Casquette Géant" },
  "giants-mirror": { x: 115, y: 355, w: 70, h: 25, label: "Miroir Géant" },
  "giants-foot": { x: 92, y: 322, w: 68, h: 28, label: "Pied du Géant" },
  "lake-of-outrage": { x: 22, y: 255, w: 68, h: 27, label: "Lac Fureur" },
  "hammerlocke-hills": {
    x: 22,
    y: 225,
    w: 68,
    h: 27,
    label: "Collines Coronet",
  },

  // === MAIN ROUTE — EAST BRANCH ===
  "galar-route-3": { x: 358, y: 340, w: 22, h: 50, label: "R.3" },
  turffield: { x: 358, y: 298, w: 70, h: 30, label: "Épisable" },
  "galar-route-4": { x: 400, y: 298, w: 22, h: 50, label: "R.4" },
  hulbury: { x: 428, y: 295, w: 70, h: 30, label: "Portville" },
  "galar-route-5": { x: 428, y: 262, w: 22, h: 30, label: "R.5" },

  // === HAMMERLOCKE / CENTRAL ===
  hammerlocke: { x: 140, y: 218, w: 82, h: 32, label: "Coronet" },
  "galar-route-6": { x: 95, y: 185, w: 22, h: 30, label: "R.6" },
  "stow-on-side": { x: 65, y: 155, w: 78, h: 28, label: "Cobsec" },
  "glimwood-tangle": { x: 65, y: 120, w: 75, h: 30, label: "Forêt Luciole" },
  "galar-route-7": { x: 65, y: 88, w: 22, h: 28, label: "R.7" },
  ballonlea: { x: 65, y: 58, w: 70, h: 28, label: "Ballonléa" },
  "galar-route-8": { x: 380, y: 220, w: 22, h: 40, label: "R.8" },
  "galar-route-8-east": { x: 408, y: 225, w: 45, h: 22, label: "R.8 E" },
  "old-cemetery": { x: 408, y: 252, w: 62, h: 22, label: "Vieux Cimetière" },
  circhester: { x: 420, y: 192, w: 75, h: 32, label: "Circhester" },
  "galar-route-9": { x: 445, y: 155, w: 22, h: 35, label: "R.9" },
  spikemuth: { x: 440, y: 118, w: 72, h: 30, label: "Piquantes" },
  "galar-route-10": { x: 228, y: 190, w: 22, h: 26, label: "R.10" },
  wyndon: { x: 228, y: 155, w: 80, h: 32, label: "Wyndon" },

  // === CROWN TUNDRA DLC (top-left) ===
  "slippery-slope": { x: 22, y: 118, w: 40, h: 28, label: "Pente Glissante" },
  "frostpoint-field": { x: 22, y: 88, w: 40, h: 28, label: "Plaine Givre" },
  "giants-bed": { x: 22, y: 58, w: 40, h: 28, label: "Lit du Géant" },
  "old-cemetery-ct": { x: 22, y: 30, w: 40, h: 25, label: "Cimetière CT" },
  "crown-shrine": { x: 65, y: 25, w: 62, h: 28, label: "Sanctuaire" },
  "snowslide-slope": { x: 132, y: 25, w: 68, h: 26, label: "Pente Avalanche" },
  "tunnel-to-the-top": { x: 132, y: 55, w: 68, h: 24, label: "Tunnel Sommet" },
  "path-to-the-peak": { x: 132, y: 82, w: 68, h: 25, label: "Chemin Sommet" },
  freezington: { x: 202, y: 25, w: 75, h: 28, label: "Frisquilin" },
  "ballimere-lake": { x: 202, y: 57, w: 75, h: 28, label: "Lac Ballimère" },
  "roaring-sea-caves": {
    x: 202,
    y: 88,
    w: 75,
    h: 25,
    label: "Grottes Mugiss.",
  },
  "frigid-sea": { x: 202, y: 116, w: 22, h: 30, label: "Mer Glacée" },

  // === ISLE OF ARMOR DLC (right side) ===
  "master-dojo": { x: 525, y: 150, w: 65, h: 28, label: "Dojo Maître" },
  "fields-of-honor": { x: 525, y: 182, w: 65, h: 24, label: "Champs Honneur" },
  "soothing-wetlands": { x: 525, y: 210, w: 68, h: 24, label: "Marais Calme" },
  "forest-of-focus": { x: 525, y: 238, w: 68, h: 24, label: "Forêt Focale" },
  "challenge-beach": { x: 598, y: 182, w: 70, h: 24, label: "Plage Défi" },
  "challenge-road": { x: 598, y: 210, w: 68, h: 24, label: "Route Défi" },
  "warm-up-tunnel": { x: 598, y: 238, w: 68, h: 24, label: "Tunnel Chauffe" },
  "brawlers-cave": { x: 525, y: 265, w: 68, h: 24, label: "Grotte Combat" },
  "training-lowlands": {
    x: 598,
    y: 265,
    w: 68,
    h: 24,
    label: "Plaines Entraîn.",
  },
  "potbottom-desert": { x: 525, y: 293, w: 68, h: 24, label: "Désert Fond" },
  "workout-sea": { x: 598, y: 293, w: 68, h: 24, label: "Mer Musculation" },
  "loop-lagoon": { x: 525, y: 320, w: 68, h: 24, label: "Lagon Boucle" },
  "honeycalm-sea": { x: 598, y: 320, w: 68, h: 24, label: "Mer Mielleuse" },
  "honeycalm-island": { x: 598, y: 348, w: 68, h: 24, label: "Île Mielleuse" },
  "insular-sea": { x: 525, y: 348, w: 68, h: 24, label: "Mer Insulaire" },
  "three-point-pass": { x: 525, y: 118, w: 68, h: 28, label: "Col Trois Pts" },
};

export default function GalarMap({
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

        {/* Wild Area band background */}
        <rect
          x="14"
          y="250"
          width="360"
          height="118"
          fill="#1a3a1a"
          opacity="0.4"
          rx="6"
        />
        <text
          x="194"
          y="376"
          textAnchor="middle"
          fontSize="8"
          fill="#6B7280"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          ZONE SAUVAGE
        </text>

        {/* Crown Tundra background */}
        <rect
          x="14"
          y="14"
          width="268"
          height="135"
          fill="#1a2a3a"
          opacity="0.4"
          rx="6"
        />
        <text
          x="148"
          y="155"
          textAnchor="middle"
          fontSize="7"
          fill="#6B7280"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          TERRES COURONNES
        </text>

        {/* Isle of Armor background */}
        <rect
          x="515"
          y="110"
          width="165"
          height="270"
          fill="#2a1a3a"
          opacity="0.4"
          rx="6"
        />
        <text
          x="597"
          y="392"
          textAnchor="middle"
          fontSize="7"
          fill="#6B7280"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          ÎLE ARMOR
        </text>

        {Object.entries(zoneLayout).map(([id, { x, y, w, h, label }]) => {
          // skip internal placeholder
          if (id === "old-cemetery-ct" || id === "galar-route-8-east") {
            const status = getZoneStatus(
              id === "old-cemetery-ct" ? "old-cemetery" : "galar-route-8",
            );
            // Don't render these — they're covered by the main entries
            return null;
          }

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
