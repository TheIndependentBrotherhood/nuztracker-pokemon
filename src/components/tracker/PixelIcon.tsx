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

export default function PixelIcon({
  rows,
  color,
  size = 11,
  label,
}: {
  rows: string[];
  color: string;
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
          bit === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
