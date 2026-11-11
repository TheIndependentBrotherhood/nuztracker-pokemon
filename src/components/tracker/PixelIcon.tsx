// 7x7 pixel icons drawn like the Ironmon Tracker ones.
export const PHYSICAL_ICON = [
  "1001001",
  "0101010",
  "0011100",
  "1111111",
  "0011100",
  "0101010",
  "1001001",
];
export const SPECIAL_ICON = [
  "0011100",
  "0100010",
  "1001001",
  "1010101",
  "1001001",
  "0100010",
  "0011100",
];
export const STATUS_ICON = [
  "0011100",
  "0100010",
  "1000001",
  "1000001",
  "1000001",
  "0100010",
  "0011100",
];
export const HEART_ICON = [
  "0110110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];
export const PIN_ICON = [
  "0011100",
  "0011100",
  "0011100",
  "0111110",
  "1111111",
  "0001000",
  "0001000",
];
export const SKULL_ICON = [
  "0111110",
  "1111111",
  "1001001",
  "1111111",
  "0111110",
  "0101010",
];
// Poké Ball drawn with POKE_BALL_PALETTE.
export const POKE_BALL_ICON = [
  "00rrr00",
  "0rrrrr0",
  "rrrkrrr",
  "kkkwkkk",
  "wwwkwww",
  "0wwwww0",
  "00www00",
];
export const POKE_BALL_PALETTE = { r: "#ef4444", k: "#111827", w: "#f8fafc" };
export const GRASS_ICON = [
  "0001000",
  "1001001",
  "0101010",
  "0101010",
  "1011101",
  "0111110",
  "1111111",
];
export const SURF_ICON = [
  "0011000",
  "0100100",
  "1000110",
  "0000000",
  "0110011",
  "1001100",
  "0000000",
];
// Fishing hook: eye, shank and barbed point.
export const HOOK_ICON = [
  "0001110",
  "0001010",
  "0001110",
  "0000100",
  "0100100",
  "1100100",
  "0111000",
];
// Half sun rising over the horizon.
export const SUNRISE_ICON = [
  "0001000",
  "0100010",
  "0011100",
  "1011101",
  "0111110",
  "0000000",
  "1111111",
];
export const SUN_ICON = [
  "1001001",
  "0011100",
  "0111110",
  "1111111",
  "0111110",
  "0011100",
  "1001001",
];
export const MOON_ICON = [
  "0011100",
  "0111000",
  "1110000",
  "1110000",
  "1110000",
  "0111000",
  "0011100",
];

export default function PixelIcon({
  rows,
  color,
  palette,
  size = 11,
  label,
}: {
  rows: string[];
  color: string;
  /** Colors of the non-"1" pixel letters, for multicolor icons. */
  palette?: Record<string, string>;
  size?: number;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * rows.length) / 7}
      viewBox={`0 0 7 ${rows.length}`}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flex: "none", display: "block" }}
    >
      {rows.flatMap((row, y) =>
        [...row].map((bit, x) =>
          bit !== "0" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={bit === "1" ? color : (palette?.[bit] ?? color)}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
