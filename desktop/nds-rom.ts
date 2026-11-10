import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, type FileHandle } from "node:fs/promises";

export class NdsRom {
  private readonly files = new Map<string, { start: number; end: number }>();
  private readonly archives = new Map<string, Buffer[]>();

  private constructor(
    private readonly file: FileHandle,
    readonly header: Buffer,
    readonly romHash: string,
    private readonly size: number,
  ) {}

  get gameCode(): string { return this.header.toString("ascii", 12, 16); }
  get revision(): number { return this.header[30]; }

  static async open(path: string): Promise<NdsRom> {
    const file = await open(path, "r");
    try {
      const size = (await file.stat()).size;
      if (size < 0x200 || size > 512 * 1024 * 1024)
        throw new Error("Select a valid Platinum NDS ROM (up to 512 MB).");
      const header = Buffer.alloc(0x200);
      await file.read(header, 0, header.length, 0);
      if (!["CPUE", "CPUF"].includes(header.toString("ascii", 12, 16)) || header[30] > 1)
        throw new Error("This connector supports Platinum CPUE / CPUF revisions 0 and 1 only.");
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(path)) hash.update(chunk);
      const rom = new NdsRom(file, header, hash.digest("hex"), size);
      await rom.loadDirectory();
      return rom;
    } catch (error) {
      await file.close();
      throw error;
    }
  }

  private async read(start: number, length: number): Promise<Buffer> {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) ||
        start < 0 || length < 1 || length > 16 * 1024 * 1024 || start + length > this.size)
      throw new Error("The NDS filesystem contains an invalid range.");
    const buffer = Buffer.alloc(length);
    let offset = 0;
    while (offset < length) {
      const { bytesRead } = await this.file.read(buffer, offset, length - offset, start + offset);
      if (!bytesRead) throw new Error("The NDS ROM is truncated.");
      offset += bytesRead;
    }
    return buffer;
  }

  private async loadDirectory(): Promise<void> {
    const names = await this.read(this.header.readUInt32LE(0x40), this.header.readUInt32LE(0x44));
    const allocations = await this.read(this.header.readUInt32LE(0x48), this.header.readUInt32LE(0x4c));
    const visited = new Set<number>();
    const walk = (directory: number, parent: string, depth: number) => {
      if (depth > 20 || visited.has(directory) || directory * 8 + 8 > names.length)
        throw new Error("The NDS directory table is invalid.");
      visited.add(directory);
      let cursor = names.readUInt32LE(directory * 8);
      let fileId = names.readUInt16LE(directory * 8 + 4);
      while (cursor < names.length) {
        const control = names[cursor++];
        if (!control) return;
        const length = control & 127;
        if (!length || cursor + length + (control & 128 ? 2 : 0) > names.length)
          throw new Error("The NDS filename table is truncated.");
        const name = names.toString("ascii", cursor, cursor + length);
        cursor += length;
        const path = parent ? `${parent}/${name}` : name;
        if (control & 128) {
          const child = names.readUInt16LE(cursor) - 0xf000;
          cursor += 2;
          walk(child, path, depth + 1);
        } else {
          if (fileId * 8 + 8 > allocations.length)
            throw new Error("The NDS file allocation table is truncated.");
          this.files.set(path, {
            start: allocations.readUInt32LE(fileId * 8),
            end: allocations.readUInt32LE(fileId * 8 + 4),
          });
          fileId++;
        }
      }
      throw new Error("The NDS filename table has no terminator.");
    };
    walk(0, "", 0);
  }

  async arm9(): Promise<Buffer> {
    const size = this.header.readUInt32LE(0x2c);
    return size ? await this.read(this.header.readUInt32LE(0x20), size) : Buffer.alloc(0);
  }

  async archive(path: string): Promise<Buffer[]> {
    const cached = this.archives.get(path);
    if (cached) return cached;
    const file = this.files.get(path);
    if (!file) throw new Error(`This ROM is missing ${path}; its layout is unsupported.`);
    const data = await this.read(file.start, file.end - file.start);
    if (data.toString("ascii", 0, 4) !== "NARC")
      throw new Error(`Invalid NDS archive: ${path}.`);
    let table: Buffer | undefined;
    let contents: Buffer | undefined;
    for (let offset = data.readUInt16LE(12); offset + 8 <= data.length;) {
      const length = data.readUInt32LE(offset + 4);
      if (length < 8 || offset + length > data.length)
        throw new Error("The NDS archive contains an invalid block.");
      const block = data.toString("ascii", offset, offset + 4);
      if (block === "BTAF") table = data.subarray(offset + 8, offset + length);
      if (block === "GMIF") contents = data.subarray(offset + 8, offset + length);
      offset += length;
    }
    if (!table || table.length < 4 || !contents)
      throw new Error("The NDS archive is missing its file table or data.");
    const count = table.readUInt16LE(0);
    if (count * 8 + 4 > table.length) throw new Error("The NDS archive table is truncated.");
    const result: Buffer[] = [];
    for (let index = 0; index < count; index++) {
      const start = table.readUInt32LE(4 + index * 8);
      const end = table.readUInt32LE(8 + index * 8);
      if (end < start || end > contents.length) throw new Error("An NDS archive entry is invalid.");
      result.push(contents.subarray(start, end));
    }
    this.archives.set(path, result);
    return result;
  }

  async close(): Promise<void> { await this.file.close(); }
}
