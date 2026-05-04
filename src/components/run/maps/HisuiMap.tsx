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

// Hisui layout — Pokémon Legends: Arceus
// 5 open-world areas arranged as:
//   [Cobalt Coastlands] | [Coronet Highlands] | [Alabaster Icelands]
//      [Obsidian Fieldlands]  |  Jubilife Village  |  [Crimson Mirelands]
const zoneLayout: Record<
  string,
  { x: number; y: number; w: number; h: number; label: string }
> = {
  // === COBALT COASTLANDS (top-left, x:12-222, y:12-248) ===
  "aipom-hill": { x: 16, y: 22, w: 100, h: 20, label: "Colline Aipom" },
  "bathers-lagoon": { x: 16, y: 46, w: 100, h: 20, label: "Lagon Baignade" },
  "castaway-shore": { x: 16, y: 70, w: 100, h: 20, label: "Rivage Naufragé" },
  "coastlands-camp": { x: 16, y: 94, w: 100, h: 20, label: "Camp Côtier" },
  "crossing-slope": { x: 16, y: 118, w: 100, h: 20, label: "Pente Croisée" },
  "deadwood-haunt": { x: 16, y: 142, w: 100, h: 20, label: "Bois Mort" },
  "firespit-island": { x: 16, y: 166, w: 100, h: 20, label: "Île Feu Sacré" },
  "ginkgo-landing": { x: 16, y: 190, w: 100, h: 20, label: "Ponton Ginkgo" },
  "hideaway-bay": { x: 120, y: 22, w: 98, h: 20, label: "Baie Cachée" },
  "islespy-shore": { x: 120, y: 46, w: 98, h: 20, label: "Rivage Espion" },
  "lunkers-lair": { x: 120, y: 70, w: 98, h: 20, label: "Antre Lunkers" },
  "sands-reach": { x: 120, y: 94, w: 98, h: 20, label: "Plage Sablée" },
  "seagrass-haven": { x: 120, y: 118, w: 98, h: 20, label: "Havre Herbier" },
  "seaside-hollow": { x: 120, y: 142, w: 98, h: 20, label: "Creux Littoral" },
  "tombolo-walk": { x: 120, y: 166, w: 98, h: 20, label: "Tombolo" },
  "tranquility-cove": {
    x: 120,
    y: 190,
    w: 98,
    h: 20,
    label: "Crique Sérénité",
  },

  // === CORONET HIGHLANDS (top-center, x:226-464, y:12-248) ===
  "ancient-quarry": { x: 230, y: 22, w: 72, h: 20, label: "Anc. Carrière" },
  "celestica-ruins": { x: 230, y: 46, w: 72, h: 20, label: "Ruines Célestia" },
  "celestica-trail": { x: 230, y: 70, w: 72, h: 20, label: "Sentier Célestia" },
  "clamberclaw-cliffs": {
    x: 230,
    y: 94,
    w: 72,
    h: 20,
    label: "Falaises Griffe",
  },
  "cloudcap-pass": { x: 230, y: 118, w: 72, h: 20, label: "Col Nuage" },
  "fabled-spring": { x: 230, y: 142, w: 72, h: 20, label: "Source Légend." },
  "hearts-crag": { x: 230, y: 166, w: 72, h: 20, label: "Rocher Cœur" },
  "heavenward-lookout": {
    x: 308,
    y: 22,
    w: 72,
    h: 20,
    label: "Belvédère Ciel",
  },
  "heights-camp": { x: 308, y: 46, w: 72, h: 20, label: "Camp Hauteurs" },
  "molten-arena": { x: 308, y: 70, w: 72, h: 20, label: "Arène Lave" },
  "oreburrow-tunnel": { x: 308, y: 94, w: 72, h: 20, label: "Tunnel Minerai" },
  "primeval-grotto": { x: 308, y: 118, w: 72, h: 20, label: "Grotte Primord." },
  "sacred-plaza": { x: 308, y: 142, w: 72, h: 20, label: "Place Sacrée" },
  "sonorous-path": { x: 308, y: 166, w: 72, h: 20, label: "Chemin Sonore" },
  "space-time-distortion": { x: 386, y: 22, w: 72, h: 20, label: "Distorsion" },
  "stonetooth-rows": { x: 386, y: 46, w: 72, h: 20, label: "Rangées Pierres" },
  "temple-of-sinnoh": { x: 386, y: 70, w: 72, h: 20, label: "Temple Sinnoh" },
  "wayward-wood": { x: 386, y: 94, w: 72, h: 20, label: "Bois Caprice" },
  "windbreak-stand": { x: 386, y: 118, w: 72, h: 20, label: "Bosquet Vent" },
  "windswept-run": { x: 386, y: 142, w: 72, h: 20, label: "Couloir Venteux" },
  "hisui-wayward-cave": {
    x: 386,
    y: 166,
    w: 72,
    h: 20,
    label: "Grotte Caprice",
  },

  // === ALABASTER ICELANDS (top-right, x:468-686, y:12-248) ===
  "arenas-approach": { x: 472, y: 22, w: 98, h: 20, label: "Approche Arène" },
  "aspiration-hill": { x: 472, y: 46, w: 98, h: 20, label: "Colline Aspir." },
  "avalanche-slopes": {
    x: 472,
    y: 70,
    w: 98,
    h: 20,
    label: "Pentes Avalanche",
  },
  "avaluggs-legacy": { x: 472, y: 94, w: 98, h: 20, label: "Héritage Avalugg" },
  "bonechill-wastes": { x: 472, y: 118, w: 98, h: 20, label: "Landes Glacées" },
  "glacier-terrace": {
    x: 472,
    y: 142,
    w: 98,
    h: 20,
    label: "Terrasse Glacier",
  },
  "ice-column-chamber": {
    x: 472,
    y: 166,
    w: 98,
    h: 20,
    label: "Chambre Glace",
  },
  "icebound-falls": { x: 472, y: 190, w: 98, h: 20, label: "Chutes Glacier" },
  "icepeak-arena": { x: 472, y: 214, w: 98, h: 20, label: "Arène Pic Glace" },
  "icepeak-cavern": { x: 576, y: 22, w: 106, h: 20, label: "Cav. Pic Glace" },
  "hisui-lake-acuity": { x: 576, y: 46, w: 106, h: 20, label: "Lac Acuité" },
  "moonview-arena": { x: 576, y: 70, w: 106, h: 20, label: "Arène Lune" },
  "snowfall-hot-spring": {
    x: 576,
    y: 94,
    w: 106,
    h: 20,
    label: "Source Chaude",
  },
  "hisui-snowpoint-temple": {
    x: 576,
    y: 118,
    w: 106,
    h: 20,
    label: "Temple B.-Neige",
  },
  "hisui-spring-path": {
    x: 576,
    y: 142,
    w: 106,
    h: 20,
    label: "Chemin Source",
  },
  "hisui-turnback-cave": {
    x: 576,
    y: 166,
    w: 106,
    h: 20,
    label: "Grotte Demi-Tour",
  },
  "ursas-ring": { x: 576, y: 190, w: 106, h: 20, label: "Anneau Ursas" },
  "whiteout-valley": { x: 576, y: 214, w: 106, h: 20, label: "Vallée Blanche" },

  // === JUBILIFE VILLAGE (center hub) ===
  "jubilife-village": {
    x: 282,
    y: 253,
    w: 134,
    h: 28,
    label: "Village Bonheur",
  },

  // === OBSIDIAN FIELDLANDS (bottom-left, x:12-342, y:285-496) ===
  "deertrack-heights": { x: 16, y: 292, w: 100, h: 20, label: "Hauteurs Cerf" },
  "deertrack-path": { x: 16, y: 316, w: 100, h: 20, label: "Sentier Cerf" },
  "diamond-heath": { x: 16, y: 340, w: 100, h: 20, label: "Lande Diamant" },
  "diamond-settlement": { x: 16, y: 364, w: 100, h: 20, label: "Col. Diamant" },
  "floaro-gardens": { x: 16, y: 388, w: 100, h: 20, label: "Jardins Floaro" },
  "grandtree-arena": { x: 16, y: 412, w: 100, h: 20, label: "Arène G. Arbre" },
  "grueling-grove": { x: 120, y: 292, w: 100, h: 20, label: "Bois Éprouvant" },
  "holm-of-trials": { x: 120, y: 316, w: 100, h: 20, label: "Îlot Épreuves" },
  "horseshoe-plains": {
    x: 120,
    y: 340,
    w: 100,
    h: 20,
    label: "Pl. Fer-à-Cheval",
  },
  "hisui-lake-verity": { x: 120, y: 364, w: 100, h: 20, label: "Lac Vérité" },
  "natures-pantry": { x: 120, y: 388, w: 100, h: 20, label: "Garde-Manger" },
  "obsidian-falls": { x: 120, y: 412, w: 100, h: 20, label: "Chutes Obsid." },
  "ramanas-island": { x: 224, y: 292, w: 110, h: 20, label: "Île Ramanas" },
  "sandgem-flats": { x: 224, y: 316, w: 110, h: 20, label: "Plaines Antibes" },
  "the-heartwood": { x: 224, y: 340, w: 110, h: 20, label: "Bois Cœur" },
  "tidewater-dam": { x: 224, y: 364, w: 110, h: 20, label: "Digue Marée" },
  "worn-bridge": { x: 224, y: 388, w: 110, h: 20, label: "Vieux Pont" },

  // === CRIMSON MIRELANDS (bottom-right, x:346-686, y:285-496) ===
  "bolderoll-ravine": {
    x: 350,
    y: 292,
    w: 108,
    h: 20,
    label: "Ravin Bolderoll",
  },
  "bolderoll-slope": {
    x: 350,
    y: 316,
    w: 108,
    h: 20,
    label: "Pente Bolderoll",
  },
  "brava-arena": { x: 350, y: 340, w: 108, h: 20, label: "Arène Brava" },
  "cloudpool-ridge": { x: 350, y: 364, w: 108, h: 20, label: "Crête Nuage" },
  "cottonsedge-prairie": {
    x: 350,
    y: 388,
    w: 108,
    h: 20,
    label: "Prairie Coton",
  },
  "droning-meadow": { x: 350, y: 412, w: 108, h: 20, label: "Pré Bourdonnant" },
  "gapejaw-bog": { x: 462, y: 292, w: 108, h: 20, label: "Marais Gapejaw" },
  "golden-lowlands": { x: 462, y: 316, w: 108, h: 20, label: "Plaines Dorées" },
  "hisui-lake-valor": { x: 462, y: 340, w: 108, h: 20, label: "Lac Valeur" },
  "lonely-spring": { x: 462, y: 364, w: 108, h: 20, label: "Source Solitaire" },
  "pearl-settlement": { x: 462, y: 388, w: 108, h: 20, label: "Col. Perle" },
  "scarlet-bog": { x: 462, y: 412, w: 108, h: 20, label: "Marais Écarlate" },
  "shrouded-ruins": { x: 574, y: 292, w: 108, h: 20, label: "Ruines Brume" },
  "sludge-mound": { x: 574, y: 316, w: 108, h: 20, label: "Mont Boue" },
  "hisui-solaceon-ruins": {
    x: 574,
    y: 340,
    w: 108,
    h: 20,
    label: "Ruines Balbuto",
  },
  "veilstone-cape": {
    x: 574,
    y: 364,
    w: 108,
    h: 20,
    label: "Cap Pierre Voile",
  },
};

export default function HisuiMap({
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
          fill="#1a2a1a"
          opacity="0.6"
          rx="8"
        />

        {/* Area backgrounds — top row */}
        <rect
          x="12"
          y="12"
          width="210"
          height="238"
          fill="#1a3a4a"
          opacity="0.5"
          rx="6"
        />
        <rect
          x="226"
          y="12"
          width="238"
          height="238"
          fill="#2a2a1a"
          opacity="0.5"
          rx="6"
        />
        <rect
          x="468"
          y="12"
          width="220"
          height="238"
          fill="#2a3a4a"
          opacity="0.5"
          rx="6"
        />

        {/* Area backgrounds — bottom row */}
        <rect
          x="12"
          y="284"
          width="332"
          height="214"
          fill="#1a3a1a"
          opacity="0.5"
          rx="6"
        />
        <rect
          x="346"
          y="284"
          width="342"
          height="214"
          fill="#3a1a1a"
          opacity="0.5"
          rx="6"
        />

        {/* Jubilife connector */}
        <rect
          x="226"
          y="250"
          width="238"
          height="32"
          fill="#2a3a2a"
          opacity="0.4"
        />

        {/* Area labels */}
        <text
          x="117"
          y="8"
          textAnchor="middle"
          fontSize="7"
          fill="#93C5FD"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          COBALT COASTLANDS
        </text>
        <text
          x="345"
          y="8"
          textAnchor="middle"
          fontSize="7"
          fill="#FCD34D"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          CORONET HIGHLANDS
        </text>
        <text
          x="578"
          y="8"
          textAnchor="middle"
          fontSize="7"
          fill="#BAE6FD"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          ALABASTER ICELANDS
        </text>
        <text
          x="178"
          y="504"
          textAnchor="middle"
          fontSize="7"
          fill="#86EFAC"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          OBSIDIAN FIELDLANDS
        </text>
        <text
          x="517"
          y="504"
          textAnchor="middle"
          fontSize="7"
          fill="#FCA5A5"
          fontWeight="700"
          style={{ userSelect: "none" }}
        >
          CRIMSON MIRELANDS
        </text>

        {Object.entries(zoneLayout).map(([id, { x, y, w, h, label }]) => {
          const status = getZoneStatus(id);
          const isSelected = selectedZoneId === id;
          const fill = statusColor[status] ?? statusColor["not-visited"];
          const isHub = id === "jubilife-village";
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
                rx="3"
                fill={fill}
                fillOpacity={isSelected ? 1 : 0.85}
                stroke={isSelected ? "#FBBF24" : isHub ? "#FCD34D" : "#6B7280"}
                strokeWidth={isSelected ? 2.5 : isHub ? 2 : 1}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isHub ? "9" : "6.5"}
                fontWeight={isHub ? "700" : "600"}
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
