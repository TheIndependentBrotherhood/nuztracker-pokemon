export const dataRoot =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";

export function csv(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(field);
      field = "";
      if (char === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (char !== "\r") field += char;
  }
  if (quoted)
    throw new Error("The reference CSV contains an unterminated quote.");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows
    .filter((entry) => entry.some(Boolean))
    .map((entry) => {
      if (entry.length !== headers.length)
        throw new Error("The reference CSV has inconsistent columns.");
      return Object.fromEntries(
        headers.map((name, index) => [name, entry[index]]),
      );
    });
}

export async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new Error(`Reference download failed: ${response.status} ${url}`);
  return response.text();
}

export async function downloadTables(names) {
  return Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [
        name,
        csv(await download(`${dataRoot}/${name}.csv`)),
      ]),
    ),
  );
}
