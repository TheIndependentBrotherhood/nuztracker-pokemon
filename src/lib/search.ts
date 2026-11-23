// Search keys ignore case and accents: "pokemon" finds "Pokémon", "eau" finds "Éau".
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesSearch(
  query: string,
  ...values: (string | number | null | undefined)[]
): boolean {
  const needle = normalizeSearch(query);
  return (
    !needle ||
    values.some(
      (value) =>
        value !== null &&
        value !== undefined &&
        normalizeSearch(String(value)).includes(needle),
    )
  );
}
