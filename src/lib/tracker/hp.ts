/** Pokémon HP bar colors: green above 1/2, yellow above 1/5, red below. */
export function hpColor(hp: number, maxHp: number) {
  if (hp * 2 > maxHp) return "#22c55e";
  if (hp * 5 > maxHp) return "#facc15";
  return "#ef4444";
}
