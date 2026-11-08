import { decodeGen4Text } from "./pk4";

export function readGen4Message(bank: Buffer, index: number): string | undefined {
  if (bank.length < 4) throw new Error("The NDS text bank is truncated.");
  const count = bank.readUInt16LE(0);
  if (!Number.isInteger(index) || index < 0 || index >= count || 4 + count * 8 > bank.length)
    throw new Error("The NDS text bank has an invalid entry table.");
  const key = (Math.imul(bank.readUInt16LE(2), 0x2fd) * (index + 1)) & 0xffff;
  const mask = ((key << 16) | key) >>> 0;
  const offset = (bank.readUInt32LE(4 + index * 8) ^ mask) >>> 0;
  const length = (bank.readUInt32LE(8 + index * 8) ^ mask) >>> 0;
  if (length > 4096 || offset < 4 + count * 8 || offset + length * 2 > bank.length)
    throw new Error("The NDS text bank has an invalid string range.");
  let seed = (0x91bd3 * (index + 1)) & 0xffff;
  const words: number[] = [];
  for (let cursor = 0; cursor < length; cursor++) {
    words.push(bank.readUInt16LE(offset + cursor * 2) ^ seed);
    seed = (seed + 0x493d) & 0xffff;
  }
  let characters = words;
  if (words[0] === 0xf100) {
    characters = [];
    let bits = 0;
    let available = 0;
    let finished = false;
    for (const word of words.slice(1)) {
      bits |= word << available;
      available += 16;
      while (available >= 9) {
        const code = bits & 0x1ff;
        bits >>>= 9;
        available -= 9;
        if (code === 0x1ff) { finished = true; break; }
        characters.push(code);
      }
      if (finished) break;
    }
    if (!finished) throw new Error("The compressed NDS text has no terminator.");
  }
  const data = Buffer.alloc(characters.length * 2);
  characters.forEach((word, index) => data.writeUInt16LE(word, index * 2));
  return decodeGen4Text(data);
}
