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

// Unova layout — BW/BW2
// South-east start (Nuvema), flows NW through Nacrene/Striaton,
// south to Castelia (coast), east to Nimbasa, then north arc to League.
// BW2 adds western cities (Aspertia/Virbank) and eastern sea routes.
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // === SOUTH START (SE) ===
  "nuvema-town": { x: 590, y: 455, w: 78, h: 30, label: "Nuvema" },
  "unova-route-1": { x: 565, y: 422, w: 22, h: 30, label: "R.1" },
  "accumula-town": { x: 492, y: 408, w: 75, h: 28, label: "Accumula" },
  "unova-route-2": { x: 428, y: 382, w: 22, h: 22, label: "R.2" },
  "striaton-city": { x: 350, y: 358, w: 78, h: 32, label: "Striapic" },
  dreamyard: { x: 435, y: 360, w: 62, h: 25, label: "Jardin Rêves" },
  "unova-route-3": { x: 280, y: 362, w: 65, h: 24, label: "R.3" },
  "wellspring-cave": { x: 280, y: 390, w: 62, h: 22, label: "Grotte Source" },
  "nacrene-city": { x: 205, y: 352, w: 72, h: 32, label: "Vergemure" },
  "pinwheel-forest": { x: 125, y: 340, w: 75, h: 42, label: "Forêt Volute" },

  // === SOUTH COAST (Castelia) ===
  "castelia-city": { x: 205, y: 415, w: 80, h: 32, label: "Volucité" },
  "castelia-sewers": { x: 205, y: 450, w: 70, h: 20, label: "Égouts" },
  "unova-route-4": { x: 290, y: 418, w: 55, h: 22, label: "R.4" },
  "desert-resort": { x: 350, y: 412, w: 72, h: 25, label: "Villag. Sablés" },
  "relic-castle": { x: 350, y: 440, w: 68, h: 20, label: "Châ. Relique" },
  "relic-passage": { x: 290, y: 445, w: 55, h: 20, label: "Couloir Relique" },

  // === CENTER — NIMBASA ===
  "nimbasa-city": { x: 362, y: 298, w: 82, h: 35, label: "Nimbasa" },
  "musical-theater": { x: 450, y: 300, w: 70, h: 25, label: "Musical" },
  "gear-station": { x: 450, y: 328, w: 65, h: 20, label: "Métro Combat" },
  "unova-route-16": { x: 452, y: 360, w: 22, h: 48, label: "R.16" },
  "lostlorn-forest": { x: 478, y: 360, w: 60, h: 30, label: "Forêt Mémois." },

  // Route connecting Nimbasa↔desert (Route 4 north section, same zone)
  // Actually the zone "unova-route-4" covers this, so skip.

  // === WEST — DRIFTVEIL ===
  "unova-route-5": { x: 292, y: 305, w: 65, h: 24, label: "R.5" },
  "driftveil-city": { x: 208, y: 297, w: 78, h: 32, label: "Flabeuh" },
  "cold-storage": { x: 208, y: 332, w: 68, h: 22, label: "Entrepôt Froid" },
  "unova-route-6": { x: 362, y: 255, w: 22, h: 40, label: "R.6" },

  // === NORTHWEST — MISTRALTON ===
  "chargestone-cave": { x: 330, y: 225, w: 85, h: 26, label: "Grotte Voltaïe" },
  "unova-route-7": { x: 278, y: 195, w: 48, h: 26, label: "R.7" },
  "celestial-tower": { x: 330, y: 193, w: 72, h: 24, label: "Tour Céleste" },
  "mistralton-city": { x: 205, y: 192, w: 70, h: 30, label: "Brocélome" },
  "lentimas-town": { x: 278, y: 162, w: 68, h: 25, label: "Lentimas" },
  "mistralton-cave": { x: 350, y: 162, w: 72, h: 25, label: "Grotte Brocél." },
  "twist-mountain": { x: 128, y: 152, w: 73, h: 32, label: "Mont Tordu" },
  "unova-route-8": { x: 205, y: 155, w: 22, h: 32, label: "R.8" },

  // === NORTH — ICIRRUS ===
  "moor-of-icirrus": { x: 48, y: 108, w: 78, h: 28, label: "Marais d'Illumis" },
  "icirrus-city": { x: 48, y: 75, w: 72, h: 30, label: "Illumis" },
  "dragonspiral-tower": { x: 125, y: 78, w: 80, h: 28, label: "Tour Spirale" },

  // === EAST — OPELUCID / LEAGUE ===
  "unova-route-9": { x: 210, y: 93, w: 75, h: 24, label: "R.9" },
  "giant-chasm": { x: 290, y: 80, w: 72, h: 28, label: "Grand Gouffre" },
  "challengers-cave": { x: 365, y: 92, w: 68, h: 22, label: "Grotte Défi" },
  "opelucid-city": { x: 440, y: 78, w: 82, h: 30, label: "Nœuport" },
  "unova-route-10": { x: 440, y: 43, w: 22, h: 32, label: "R.10" },
  "unova-victory-road": { x: 467, y: 38, w: 88, h: 22, label: "Rte Victoire" },
  "unova-pokemon-league": { x: 530, y: 62, w: 90, h: 30, label: "Ligue Unys" },
  "unova-route-23": { x: 527, y: 40, w: 22, h: 20, label: "R.23" },

  // === EAST COAST (Lacunosa / Undella) ===
  "unova-route-11": { x: 527, y: 95, w: 60, h: 22, label: "R.11" },
  "lacunosa-town": { x: 527, y: 120, w: 75, h: 28, label: "Mélancolim" },
  "unova-route-12": { x: 562, y: 151, w: 22, h: 50, label: "R.12" },
  "undella-town": { x: 548, y: 205, w: 75, h: 28, label: "Undella" },
  "undella-bay": { x: 548, y: 235, w: 72, h: 20, label: "Baie Undella" },
  "abyssal-ruins": { x: 548, y: 258, w: 68, h: 18, label: "Ruines Abyss." },
  "humilau-city": { x: 605, y: 120, w: 72, h: 28, label: "Humilau" },
  "seaside-cave": { x: 615, y: 152, w: 62, h: 22, label: "Grotte Rivage" },
  "unova-route-22": { x: 452, y: 338, w: 22, h: 45, label: "R.22" },
  "unova-route-13": { x: 510, y: 256, w: 35, h: 22, label: "R.13" },
  "reversal-mountain": { x: 490, y: 278, w: 72, h: 22, label: "Mt Symétrique" },
  "strange-house": { x: 490, y: 303, w: 60, h: 20, label: "Étrange Mais." },
  "unova-route-14": { x: 482, y: 326, w: 22, h: 50, label: "R.14" },
  "unova-route-15": { x: 448, y: 380, w: 30, h: 22, label: "R.15" },
  "abundant-shrine": { x: 450, y: 405, w: 65, h: 22, label: "Sanctuaire" },

  // === BW2 SOUTH-WEST ===
  "aspertia-city": { x: 48, y: 425, w: 72, h: 30, label: "Bénévola" },
  "floccesy-town": { x: 48, y: 383, w: 70, h: 30, label: "Rougemousse" },
  "floccesy-ranch": { x: 123, y: 385, w: 65, h: 24, label: "Ranch" },
  "unova-route-19": { x: 48, y: 350, w: 22, h: 30, label: "R.19" },
  "virbank-city": { x: 125, y: 420, w: 70, h: 30, label: "Virbank" },
  "virbank-complex": { x: 125, y: 452, w: 68, h: 22, label: "Complexe" },
  "unova-route-20": { x: 198, y: 422, w: 55, h: 22, label: "R.20" },
  "marine-tube": { x: 198, y: 448, w: 55, h: 20, label: "Tube Marin" },
  "unova-route-21": { x: 545, y: 418, w: 22, h: 48, label: "R.21" },
};

export default function UnovaMap({
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
          d="M 40 38 L 660 38 L 660 490 L 40 490 Z"
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
