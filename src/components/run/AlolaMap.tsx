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

// Alola layout — Sun/Moon/USUM
// 4 separate islands positioned in a 2×2 grid:
//   Melemele (top-left) | Akala (top-right)
//   Ula'ula (bottom-left) | Poni (bottom-right)
// Aether Paradise between islands (center)
// Mount Lanakila + League on north side of Ula'ula
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // === MELEMELE ISLAND (top-left, x: 18-295, y: 18-240) ===
  "iki-town": { x: 22, y: 22, w: 65, h: 28, label: "Iki Town" },
  "mahalo-trail": { x: 22, y: 54, w: 65, h: 24, label: "Sentier Mahalo" },
  "ruins-of-conflict": { x: 22, y: 82, w: 65, h: 22, label: "Ruines Conflit" },
  "alola-route-1": { x: 92, y: 22, w: 55, h: 28, label: "R.1" },
  "hauoli-city--beachfront": {
    x: 152,
    y: 22,
    w: 65,
    h: 22,
    label: "Hauoli Plage",
  },
  "hauoli-city--shopping-district": {
    x: 152,
    y: 48,
    w: 68,
    h: 22,
    label: "Hauoli Centre",
  },
  "hauoli-city--marina": { x: 152, y: 74, w: 65, h: 22, label: "Hauoli Port" },
  "hauoli-cemetery": { x: 224, y: 22, w: 60, h: 24, label: "Cimetière" },
  "alola-route-2": { x: 224, y: 50, w: 60, h: 22, label: "R.2" },
  "berry-fields": { x: 224, y: 76, w: 60, h: 22, label: "Champs Baies" },
  "ten-carat-hill": { x: 22, y: 108, w: 65, h: 24, label: "Île Carat" },
  "ten-carat-hill--farthest-hollow": {
    x: 22,
    y: 135,
    w: 68,
    h: 22,
    label: "Carat Creux",
  },
  "seaward-cave": { x: 95, y: 102, w: 62, h: 24, label: "Grotte Marine" },
  "verdant-cavern": { x: 162, y: 102, w: 68, h: 24, label: "Verdoyante" },
  "verdant-cavern--trial-site": {
    x: 162,
    y: 130,
    w: 68,
    h: 22,
    label: "Verdoyante Épreuve",
  },
  "melemele-meadow": { x: 22, y: 162, w: 65, h: 24, label: "Prairie Mele" },
  "melemele-sea": { x: 92, y: 162, w: 62, h: 24, label: "Mer Mele" },
  "alola-route-3": { x: 162, y: 162, w: 55, h: 24, label: "R.3" },
  "alola-route-4": { x: 224, y: 102, w: 55, h: 24, label: "R.4" },
  "kalae-bay": { x: 224, y: 130, w: 60, h: 28, label: "Baie Kalaé" },

  // === AETHER PARADISE (center between islands) ===
  "aether-paradise": { x: 308, y: 110, w: 75, h: 32, label: "Paradis Æther" },

  // === AKALA ISLAND (top-right, x: 395-670, y: 18-240) ===
  "heahea-city": { x: 400, y: 22, w: 72, h: 28, label: "Heahea" },
  "alola-route-5": { x: 400, y: 54, w: 30, h: 28, label: "R.5" },
  "paniola-town": { x: 400, y: 86, w: 72, h: 28, label: "Paniola" },
  "paniola-ranch": { x: 478, y: 88, w: 72, h: 24, label: "Ranch Paniola" },
  "alola-route-6": { x: 400, y: 118, w: 28, h: 28, label: "R.6" },
  "royal-avenue": { x: 400, y: 150, w: 78, h: 28, label: "Av. Royale" },
  "battle-royal-dome": { x: 483, y: 152, w: 68, h: 24, label: "Dôme Royal" },
  "alola-route-7": { x: 436, y: 118, w: 28, h: 30, label: "R.7" },
  "wela-volcano-park": { x: 468, y: 55, w: 78, h: 28, label: "Volcan Wela" },
  "alola-route-8": { x: 555, y: 88, w: 28, h: 45, label: "R.8" },
  "brooklet-hill": { x: 555, y: 22, w: 72, h: 28, label: "Ruisselet" },
  "brooklet-hill--totems-den": {
    x: 555,
    y: 54,
    w: 75,
    h: 24,
    label: "Ruisselet Repaire",
  },
  "memorial-hill": { x: 555, y: 138, w: 72, h: 24, label: "Colline Mémo." },
  "lush-jungle": { x: 555, y: 166, w: 72, h: 28, label: "Jungle Verdoyante" },
  "alola-route-9": { x: 478, y: 180, w: 30, h: 28, label: "R.9" },
  "konikoni-city": { x: 635, y: 55, w: 42, h: 28, label: "Konikoni" },
  "ruins-of-life": { x: 635, y: 22, w: 42, h: 30, label: "Ruines Vie" },
  "akala-outskirts": { x: 635, y: 87, w: 42, h: 24, label: "Périph. Akala" },
  "alola-route-10": { x: 478, y: 210, w: 68, h: 22, label: "R.10" },
  "digletts-tunnel": { x: 400, y: 182, w: 75, h: 22, label: "Tunnel Taupiq." },
  "secluded-shore": { x: 400, y: 208, w: 75, h: 22, label: "Plage Secrète" },

  // === ULA'ULA ISLAND (bottom-left, x: 18-305, y: 268-490) ===
  "alola-route-11": { x: 22, y: 272, w: 55, h: 24, label: "R.11" },
  "tapu-village": { x: 22, y: 300, w: 70, h: 28, label: "Village Tapu" },
  "alola-route-12": { x: 22, y: 332, w: 28, h: 35, label: "R.12" },
  "haina-desert": { x: 22, y: 370, w: 78, h: 28, label: "Désert Haina" },
  "alola-route-13": { x: 105, y: 272, w: 55, h: 24, label: "R.13" },
  "malie-city": { x: 165, y: 270, w: 75, h: 30, label: "Malie" },
  "malie-garden": { x: 165, y: 303, w: 72, h: 22, label: "Jardin Malie" },
  "mount-hokulani": { x: 245, y: 272, w: 75, h: 28, label: "Mt Hokulani" },
  "hokulani-observatory": {
    x: 245,
    y: 303,
    w: 72,
    h: 22,
    label: "Observatoire",
  },
  "blush-mountain": { x: 245, y: 330, w: 72, h: 22, label: "Mt Rougeur" },
  "alola-route-16": { x: 22, y: 400, w: 28, h: 42, label: "R.16" },
  "alola-route-17": { x: 55, y: 415, w: 80, h: 24, label: "R.17" },
  "po-town": { x: 140, y: 360, w: 72, h: 28, label: "Po Town" },
  "shady-house": { x: 140, y: 392, w: 70, h: 22, label: "Maison Louche" },
  "ulaula-meadow": { x: 140, y: 328, w: 72, h: 28, label: "Prairie Ula'ula" },
  "ruins-of-abundance": {
    x: 220,
    y: 358,
    w: 72,
    h: 25,
    label: "Ruines Abond.",
  },
  "lake-of-the-moone": { x: 220, y: 387, w: 72, h: 24, label: "Lac Lune" },
  "thrifty-megamart--abandoned-site": {
    x: 220,
    y: 415,
    w: 75,
    h: 22,
    label: "Méga-Bazar",
  },
  "alola-route-14": { x: 55, y: 445, w: 80, h: 24, label: "R.14" },
  "alola-route-15": { x: 140, y: 445, w: 80, h: 22, label: "R.15" },

  // Mount Lanakila + League (north of Ula'ula island, top of the pokemon journey)
  "mount-lanakila": { x: 245, y: 440, w: 72, h: 28, label: "Mt Lanakila" },
  "alola-pokemon-league": {
    x: 245,
    y: 472,
    w: 72,
    h: 24,
    label: "Ligue Alola",
  },

  // === PONI ISLAND (bottom-right, x: 375-670, y: 268-490) ===
  "seafolk-village": { x: 380, y: 270, w: 80, h: 28, label: "Village Mer" },
  "alola-route-16-poni": { x: 380, y: 302, w: 28, h: 35, label: "R.16 (Poni)" },
  "poni-wilds": { x: 413, y: 302, w: 72, h: 28, label: "Terres Poni" },
  "ancient-poni-path": { x: 490, y: 302, w: 72, h: 28, label: "Chemin Ancien" },
  "poni-meadow": { x: 380, y: 340, w: 72, h: 28, label: "Prairie Poni" },
  "poni-plains": { x: 456, y: 340, w: 72, h: 26, label: "Plaines Poni" },
  "poni-grove": { x: 532, y: 302, w: 65, h: 25, label: "Bois Poni" },
  "poni-coast": { x: 604, y: 270, w: 55, h: 25, label: "Côte Poni" },
  "poni-breaker-coast": {
    x: 604,
    y: 298,
    w: 55,
    h: 24,
    label: "Côte Briseurs",
  },
  "poni-gauntlet": { x: 605, y: 326, w: 58, h: 24, label: "Épreuve Poni" },
  "vast-poni-canyon": { x: 545, y: 368, w: 72, h: 28, label: "Canyon Poni" },
  "ruins-of-hope": { x: 468, y: 375, w: 72, h: 28, label: "Ruines Espoir" },
  "altar-of-the-sunne": {
    x: 600,
    y: 368,
    w: 68,
    h: 26,
    label: "Autel Solgaleo",
  },
  "resolution-cave": { x: 545, y: 400, w: 72, h: 24, label: "Grotte Résolu." },
  "exeggutor-island": { x: 618, y: 400, w: 55, h: 24, label: "Île Noadkoko" },
  "battle-tree": { x: 468, y: 408, w: 72, h: 24, label: "Arbre Combat" },
};

export default function AlolaMap({
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

        {/* Island backgrounds */}
        {/* Melemele */}
        <rect
          x="14"
          y="14"
          width="278"
          height="242"
          fill="#2d4a1e"
          opacity="0.3"
          rx="10"
        />
        {/* Akala */}
        <rect
          x="392"
          y="14"
          width="290"
          height="242"
          fill="#3a2d4a"
          opacity="0.3"
          rx="10"
        />
        {/* Ula'ula */}
        <rect
          x="14"
          y="262"
          width="318"
          height="236"
          fill="#4a3a2d"
          opacity="0.3"
          rx="10"
        />
        {/* Poni */}
        <rect
          x="372"
          y="262"
          width="310"
          height="236"
          fill="#2d4a3a"
          opacity="0.3"
          rx="10"
        />

        {/* Island labels */}
        <text
          x="153"
          y="258"
          textAnchor="middle"
          fontSize="9"
          fill="#9CA3AF"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          MÉLÉMÉLE
        </text>
        <text
          x="537"
          y="258"
          textAnchor="middle"
          fontSize="9"
          fill="#9CA3AF"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          AKALA
        </text>
        <text
          x="173"
          y="506"
          textAnchor="middle"
          fontSize="9"
          fill="#9CA3AF"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          ULA'ULA
        </text>
        <text
          x="527"
          y="506"
          textAnchor="middle"
          fontSize="9"
          fill="#9CA3AF"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          PONI
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
                fontSize={w < 45 ? "6" : "7"}
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
