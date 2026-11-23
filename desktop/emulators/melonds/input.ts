import type { ReadOnlyGdbClient } from "./gdb-client";

export const NDS_KEY_INPUT = 0x04000130;
const START = 1 << 3;
export const SAMPLE_INTERVAL_MS = 40;

/** Samples the emulated button, not the host key, between serialized memory reads. */
export class MelonDsInput {
  private lastSample = -Infinity;
  private startHeld?: boolean;
  private battleId?: string;

  constructor(
    private readonly memory: Pick<ReadOnlyGdbClient, "readMemory">,
    private readonly onStart: (battleId: string) => void,
    private readonly now = Date.now,
  ) {}

  setBattle(id?: string): void {
    this.battleId = id;
  }

  /** Reads the keypad unless it was sampled less than one interval ago. */
  async sample(): Promise<void> {
    if (this.now() - this.lastSample < SAMPLE_INTERVAL_MS) return;
    const buttons = await this.memory.readMemory(NDS_KEY_INPUT, 2);
    this.lastSample = this.now();
    const held = (buttons.readUInt16LE(0) & START) === 0;
    if (held && this.startHeld === false && this.battleId)
      this.onStart(this.battleId);
    this.startHeld = held;
  }

  async readMemory(address: number, length: number): Promise<Buffer> {
    await this.sample();
    return this.memory.readMemory(address, length);
  }
}
