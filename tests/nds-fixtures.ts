const permutations: number[][] = [];
for (let a = 0; a < 4; a++)
  for (let b = 0; b < 4; b++)
    for (let c = 0; c < 4; c++)
      for (let d = 0; d < 4; d++)
        if (new Set([a, b, c, d]).size === 4) permutations.push([a, b, c, d]);

function encrypt(input: Buffer, initial: number): Buffer {
  const data = Buffer.from(input);
  let seed = BigInt(initial);
  for (let offset = 0; offset < data.length; offset += 2) {
    seed = (seed * BigInt(0x41c64e6d) + BigInt(0x6073)) & BigInt(0xffffffff);
    data.writeUInt16LE(
      data.readUInt16LE(offset) ^ Number(seed >> BigInt(16)),
      offset,
    );
  }
  return data;
}

export function pk4Fixture(
  shuffle = 0,
  options: {
    flags?: number;
    egg?: boolean;
    species?: number;
    hp?: number;
  } = {},
): Buffer {
  const pid = (0x8000000f | (shuffle << 13)) >>> 0;
  const blocks = Array.from({ length: 4 }, () => Buffer.alloc(32));
  blocks[0].writeUInt16LE(options.species ?? 25, 0);
  blocks[0].writeUInt16LE(234, 2);
  blocks[0].writeUInt32LE(0xf123abcd, 4);
  blocks[0].writeUInt32LE(1234, 8);
  blocks[0][13] = 9;
  blocks[0][15] = 3;
  blocks[1].writeUInt16LE(33, 0);
  blocks[1][8] = 35;
  blocks[1].writeUInt32LE(
    (0x80000000 | (options.egg ? 0x40000000 : 0)) >>> 0,
    16,
  );
  blocks[1][24] = 2;
  [0x12c, 0x188, 0x145, 0xffff].forEach((code, index) =>
    blocks[2].writeUInt16LE(code, index * 2),
  );
  const body = Buffer.concat(
    permutations[shuffle % 24].map((index) => blocks[index]),
  );
  let checksum = 0;
  for (let index = 0; index < 64; index++)
    checksum = (checksum + body.readUInt16LE(index * 2)) % 65536;
  const tail = Buffer.alloc(100);
  tail[4] = 12;
  tail.writeUInt16LE(options.hp ?? 18, 6);
  tail.writeUInt16LE(30, 8);
  [21, 22, 23, 24, 25].forEach((value, index) =>
    tail.writeUInt16LE(value, 10 + index * 2),
  );
  const header = Buffer.alloc(8);
  const flags = options.flags ?? 0;
  header.writeUInt32LE(pid);
  header.writeUInt16LE(flags, 4);
  header.writeUInt16LE(checksum, 6);
  return Buffer.concat([
    header,
    flags & 2 ? body : encrypt(body, checksum),
    flags & 1 ? tail : encrypt(tail, pid),
  ]);
}

export function messageBank(strings: string[]): Buffer {
  const bodies = strings.map((text, index) => {
    const characters = [...text].map((char) => {
      const value = char.charCodeAt(0);
      return value >= 65 && value <= 90
        ? value - 65 + 0x12b
        : value >= 97 && value <= 122
          ? value - 97 + 0x145
          : value >= 0xc0 && value <= 0xff
            ? value - 0xc0 + 0x15f
            : char === " "
              ? 0x1de
              : 0x1ac;
    });
    characters.push(0xffff);
    let key = (0x91bd3 * (index + 1)) % 65536;
    const body = Buffer.alloc(characters.length * 2);
    characters.forEach((value, offset) => {
      body.writeUInt16LE(value ^ key, offset * 2);
      key = (key + 0x493d) % 65536;
    });
    return body;
  });
  const table = Buffer.alloc(4 + strings.length * 8);
  table.writeUInt16LE(strings.length);
  table.writeUInt16LE(123, 2);
  let offset = table.length;
  bodies.forEach((body, index) => {
    const key = (123 * 0x2fd * (index + 1)) % 65536;
    const mask = key * 65537;
    table.writeUInt32LE((offset ^ mask) >>> 0, 4 + index * 8);
    table.writeUInt32LE(((body.length / 2) ^ mask) >>> 0, 8 + index * 8);
    offset += body.length;
  });
  return Buffer.concat([table, ...bodies]);
}

export function ndsRomFixture(): Buffer {
  const personal = Array.from({ length: 509 }, () => Buffer.alloc(44));
  personal[25][6] = 9;
  personal[25][7] = 9;
  const moves = Array.from({ length: 472 }, () => Buffer.alloc(16));
  moves[33][3] = 40;
  moves[33][4] = 10;
  moves[33][5] = 100;
  const messages: Buffer[] = Array.from({ length: 625 }, () => Buffer.alloc(0));
  const learnsets = Array.from({ length: 509 }, () =>
    Buffer.from([0xff, 0xff]),
  );
  // Pikachu: moves #33 and #84 at level 1, #45 at level 7, #85 at level 26.
  learnsets[25] = Buffer.alloc(10);
  [(1 << 9) | 33, (1 << 9) | 84, (7 << 9) | 45, (26 << 9) | 85, 0xffff].forEach(
    (value, index) => learnsets[25].writeUInt16LE(value, index * 2),
  );
  const evolutions = Array.from({ length: 509 }, () => Buffer.alloc(44));
  // Pikachu: Thunder Stone (method 7, item #83) into Raichu.
  [7, 83, 26].forEach((value, index) =>
    evolutions[25].writeUInt16LE(value, index * 2),
  );
  messages[624] = messageBank(
    Array.from({ length: 18 }, (_, index) =>
      index === 9 ? "F\u00e9e" : "Normal",
    ),
  );
  const narc = (entries: Buffer[]) => {
    const table = Buffer.alloc(12 + 8 * entries.length);
    table.write("BTAF");
    table.writeUInt32LE(table.length, 4);
    table.writeUInt16LE(entries.length, 8);
    let offset = 0;
    entries.forEach((data, index) => {
      table.writeUInt32LE(offset, 12 + index * 8);
      offset += data.length;
      table.writeUInt32LE(offset, 16 + index * 8);
    });
    const contents = Buffer.alloc(8);
    contents.write("GMIF");
    contents.writeUInt32LE(8 + offset, 4);
    const header = Buffer.alloc(16);
    header.write("NARC");
    header.writeUInt16LE(0xfffe, 4);
    header.writeUInt16LE(0x100, 6);
    header.writeUInt32LE(16 + table.length + 8 + offset, 8);
    header.writeUInt16LE(16, 12);
    header.writeUInt16LE(2, 14);
    return Buffer.concat([header, table, contents, ...entries]);
  };
  const files = [
    narc(personal),
    narc(learnsets),
    narc(evolutions),
    narc(moves),
    narc(messages),
  ];
  const directory = (entries: ([string, number] | string)[]) =>
    Buffer.concat([
      ...entries.map((entry) => {
        const name = typeof entry === "string" ? entry : entry[0];
        const data = Buffer.alloc(
          1 + name.length + (typeof entry === "string" ? 0 : 2),
        );
        data[0] = name.length | (typeof entry === "string" ? 0 : 128);
        data.write(name, 1);
        if (typeof entry !== "string")
          data.writeUInt16LE(0xf000 + entry[1], 1 + name.length);
        return data;
      }),
      Buffer.from([0]),
    ]);
  const directories = [
    directory([
      ["poketool", 1],
      ["msgdata", 4],
    ]),
    directory([
      ["personal", 2],
      ["waza", 3],
    ]),
    directory(["pl_personal.narc", "wotbl.narc", "evo.narc"]),
    directory(["pl_waza_tbl.narc"]),
    directory(["pl_msg.narc"]),
  ];
  const names = Buffer.alloc(40);
  let cursor = 40;
  directories.forEach((entry, index) => {
    names.writeUInt32LE(cursor, index * 8);
    names.writeUInt16LE([0, 0, 0, 3, 4][index], index * 8 + 4);
    cursor += entry.length;
  });
  const fnt = Buffer.concat([names, ...directories]);
  const header = Buffer.alloc(0x200);
  header.write("CPUE", 12);
  header[30] = 1;
  header.writeUInt32LE(0x200, 0x40);
  header.writeUInt32LE(fnt.length, 0x44);
  header.writeUInt32LE(0x200 + fnt.length, 0x48);
  header.writeUInt32LE(40, 0x4c);
  const fat = Buffer.alloc(40);
  cursor = 0x200 + fnt.length + fat.length;
  files.forEach((file, index) => {
    fat.writeUInt32LE(cursor, index * 8);
    cursor += file.length;
    fat.writeUInt32LE(cursor, index * 8 + 4);
  });
  return Buffer.concat([header, fnt, fat, ...files]);
}
