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

// Paldea layout — Scarlet/Violet (open world)
// Mesagoza at center; provinces fan out in all directions.
// 8 gym towns around the periphery.
// DLC areas:
//   Kitakami (right side — The Teal Mask)
//   Blueberry Academy biomes (bottom-right — The Indigo Disk)
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // === CENTER ===
  mesagoza: { x: 228, y: 205, w: 92, h: 48, label: "Mesagoza" },
  "naranja-academy": { x: 228, y: 180, w: 90, h: 22, label: "Acad. Naranja" },
  "poco-path": { x: 284, y: 255, w: 72, h: 24, label: "Chemin Poco" },
  "inlet-grotto": { x: 284, y: 282, w: 72, h: 22, label: "Grotte Inlet" },

  // === SOUTH (start) ===
  "los-platos": { x: 270, y: 310, w: 78, h: 28, label: "Los Platos" },
  "cabo-poco": { x: 265, y: 342, w: 85, h: 28, label: "Cabo Poco" },

  // === SOUTH PROVINCE ===
  "paldea-south-province-area-one": {
    x: 228,
    y: 255,
    w: 52,
    h: 24,
    label: "Province S.1",
  },
  "paldea-south-province-area-two": {
    x: 355,
    y: 270,
    w: 55,
    h: 24,
    label: "Province S.2",
  },
  "paldea-south-province-area-three": {
    x: 355,
    y: 298,
    w: 55,
    h: 24,
    label: "Province S.3",
  },
  "paldea-south-province-area-four": {
    x: 165,
    y: 270,
    w: 58,
    h: 24,
    label: "Province S.4",
  },
  "paldea-south-province-area-five": {
    x: 165,
    y: 298,
    w: 58,
    h: 24,
    label: "Province S.5",
  },
  "paldea-south-province-area-six": {
    x: 228,
    y: 342,
    w: 60,
    h: 24,
    label: "Province S.6",
  },

  // === SOUTH-WEST ===
  alfornada: { x: 90, y: 340, w: 72, h: 30, label: "Alfornada" },
  "alfornada-cavern": { x: 90, y: 373, w: 72, h: 24, label: "Caverne Alfor." },
  "paldea-west-province-area-one": {
    x: 118,
    y: 268,
    w: 44,
    h: 24,
    label: "Province O.1",
  },
  "paldea-west-province-area-two": {
    x: 70,
    y: 255,
    w: 44,
    h: 24,
    label: "Province O.2",
  },
  "paldea-west-province-area-three": {
    x: 70,
    y: 225,
    w: 44,
    h: 24,
    label: "Province O.3",
  },
  "asado-desert": { x: 80, y: 185, w: 75, h: 32, label: "Désert Asado" },
  "icerend-shrine": { x: 80, y: 155, w: 72, h: 28, label: "Sanctuaire Glace" },
  cascarrafa: { x: 55, y: 280, w: 60, h: 30, label: "Cascarrafa" },

  // === WEST ===
  "porto-marinada": { x: 30, y: 165, w: 78, h: 28, label: "Porto Marinada" },
  "west-paldean-sea": { x: 22, y: 200, w: 40, h: 42, label: "Mer O." },

  // === NORTH-WEST ===
  medali: { x: 145, y: 125, w: 72, h: 28, label: "Médali" },
  "casseroya-lake": { x: 155, y: 165, w: 68, h: 28, label: "Lac Casseroya" },
  "paldea-north-province-area-one": {
    x: 228,
    y: 138,
    w: 55,
    h: 24,
    label: "Province N.1",
  },
  "paldea-north-province-area-two": {
    x: 228,
    y: 110,
    w: 55,
    h: 24,
    label: "Province N.2",
  },
  "paldea-north-province-area-three": {
    x: 228,
    y: 82,
    w: 55,
    h: 24,
    label: "Province N.3",
  },

  // === NORTH ===
  montenevera: { x: 295, y: 95, w: 78, h: 28, label: "Montenevera" },
  "glaseado-mountain": { x: 295, y: 125, w: 78, h: 28, label: "Mt Glaseado" },
  "groundblight-shrine": {
    x: 380,
    y: 118,
    w: 72,
    h: 24,
    label: "Sanct. Terre",
  },
  "firescourge-shrine": { x: 380, y: 88, w: 72, h: 24, label: "Sanct. Feu" },

  // === NORTH-EAST ===
  "paldea-north-province-area-three-east": {
    x: 380,
    y: 148,
    w: 55,
    h: 22,
    label: "",
  },
  "dalizapa-passage": { x: 380, y: 170, w: 72, h: 24, label: "Passage Dali." },
  "socarrat-trail": { x: 295, y: 170, w: 80, h: 22, label: "Sentier Socarrat" },

  // === EAST ===
  zapapico: { x: 420, y: 130, w: 65, h: 28, label: "Zapapico" },
  levincia: { x: 435, y: 198, w: 72, h: 30, label: "Levincia" },
  "paldea-east-province-area-one": {
    x: 358,
    y: 200,
    w: 72,
    h: 24,
    label: "Province E.1",
  },
  "paldea-east-province-area-two": {
    x: 420,
    y: 170,
    w: 72,
    h: 25,
    label: "Province E.2",
  },
  "paldea-east-province-area-three": {
    x: 420,
    y: 92,
    w: 68,
    h: 32,
    label: "Province E.3",
  },
  "east-paldean-sea": { x: 460, y: 225, w: 40, h: 42, label: "Mer E." },
  "north-paldean-sea": { x: 432, y: 55, w: 45, h: 30, label: "Mer N." },
  "south-paldean-sea": { x: 358, y: 350, w: 55, h: 28, label: "Mer S." },

  // === SOUTH-EAST ===
  artazon: { x: 358, y: 310, w: 72, h: 30, label: "Artazon" },
  "tagtree-thicket": { x: 358, y: 245, w: 55, h: 22, label: "Bosq. Tagtree" },

  // === CENTER (Area Zero) ===
  "area-zero": { x: 228, y: 165, w: 88, h: 36, label: "Zone Zéro" },
  "zero-lab": { x: 230, y: 203, w: 84, h: 0, label: "" }, // covered by area-zero visually
  "pokemon-league": { x: 145, y: 93, w: 78, h: 28, label: "Ligue Paldea" },

  // === KITAKAMI DLC (Teal Mask) — right panel ===
  "mossui-town": { x: 540, y: 148, w: 72, h: 28, label: "Mossui Town" },
  "kitakami-road": { x: 540, y: 180, w: 72, h: 24, label: "Route Kitakami" },
  "kitakami-wilds": { x: 540, y: 208, w: 72, h: 24, label: "Terres Kitakami" },
  "loyalty-plaza": { x: 540, y: 235, w: 72, h: 24, label: "Plaza Loyauté" },
  "oni-mountain": { x: 540, y: 118, w: 72, h: 28, label: "Mont Oni" },
  "onis-maw": { x: 617, y: 118, w: 62, h: 25, label: "Antre Oni" },
  "timeless-woods": { x: 617, y: 148, w: 62, h: 25, label: "Bois Intemporel" },
  "wistful-fields": {
    x: 617,
    y: 177,
    w: 62,
    h: 24,
    label: "Champs Mélancolie",
  },
  "paradise-barrens": { x: 617, y: 205, w: 62, h: 24, label: "Landes Paradis" },
  "revelers-road": { x: 617, y: 233, w: 62, h: 24, label: "Rte Festivités" },
  "mossfell-confluence": { x: 540, y: 263, w: 72, h: 24, label: "Confluent" },
  "kitakami-hall": { x: 617, y: 261, w: 62, h: 24, label: "Hall Kitakami" },
  "fellhorn-gorge": { x: 617, y: 88, w: 62, h: 26, label: "Gorges Fellhorn" },

  // === BLUEBERRY ACADEMY DLC (Indigo Disk) — bottom-right ===
  "canyon-biome": { x: 525, y: 340, w: 58, h: 30, label: "Biome Canyon" },
  "coastal-biome": { x: 525, y: 373, w: 58, h: 28, label: "Biome Côtier" },
  "polar-biome": { x: 590, y: 373, w: 58, h: 28, label: "Biome Polaire" },
  "savanna-biome": { x: 590, y: 340, w: 58, h: 28, label: "Biome Savane" },
  "central-plaza": { x: 555, y: 310, w: 90, h: 28, label: "Plaza Central" },
  "canyon-plaza": { x: 525, y: 403, w: 58, h: 25, label: "Plaza Canyon" },
  "coastal-plaza": { x: 590, y: 403, w: 58, h: 25, label: "Plaza Côtier" },
  "torchlit-labyrinth": {
    x: 555,
    y: 430,
    w: 90,
    h: 28,
    label: "Labyrinthe Torches",
  },
  "chargestone-cavern": {
    x: 555,
    y: 460,
    w: 90,
    h: 28,
    label: "Grotte Électrique",
  },
};

export default function PaldeaMap({
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

        {/* Main Paldea region */}
        <rect
          x="14"
          y="60"
          width="510"
          height="440"
          fill="#2d4a1e"
          opacity="0.22"
          rx="8"
        />

        {/* Kitakami DLC */}
        <rect
          x="530"
          y="80"
          width="158"
          height="220"
          fill="#3a2d4a"
          opacity="0.3"
          rx="8"
        />
        <text
          x="609"
          y="308"
          textAnchor="middle"
          fontSize="7"
          fill="#9CA3AF"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          KITAKAMI
        </text>

        {/* Blueberry DLC */}
        <rect
          x="515"
          y="298"
          width="168"
          height="192"
          fill="#2d3a4a"
          opacity="0.3"
          rx="8"
        />
        <text
          x="599"
          y="498"
          textAnchor="middle"
          fontSize="7"
          fill="#9CA3AF"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          ACADÉMIE MYRTILLE
        </text>

        {Object.entries(zoneLayout).map(([id, { x, y, w, h, label }]) => {
          if (h === 0 || !label) return null;

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
                fontSize={w < 50 ? "6.5" : "8"}
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
