import type { GameFrame } from "../../../src/lib/tracker/types";
import { sharedGdbClient } from "../../emulators/melonds/gdb-client";
import {
  MelonDsInput,
  SAMPLE_INTERVAL_MS,
} from "../../emulators/melonds/input";
import { NdsRom } from "../../formats/nds/rom";
import { SnapshotError } from "../../formats/gen4/pk4";
import type { VanillaMoveNames } from "./data";
import { PlatinumReader, type PlatinumLayout } from "./reader";

const UNSTABLE_REPORT_MS = 5000;
const FRAME_INTERVAL_MS = 250;
const TRANSIENT_ERROR_REPORT_MS = 2500;

export class MelonDsConnector {
  private readonly cancel = new AbortController();
  private rom?: NdsRom;
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private polling?: Promise<void>;

  async start(
    path: string,
    port: number,
    maps: string[],
    onFrame: (frame: GameFrame, layout: PlatinumLayout) => void,
    onError: (error: unknown, disconnected: boolean) => void,
    moveNames?: VanillaMoveNames,
    onStart?: (battleId: string) => void,
  ): Promise<void> {
    this.rom = await NdsRom.open(path);
    try {
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
      // Stopping the connector keeps this connection open so that reconnecting does not need a MelonDS reset.
      const memory = sharedGdbClient(port);
      const input = new MelonDsInput(memory, (battleId) => {
        if (!this.stopped) onStart?.(battleId);
      });
      const reader = await PlatinumReader.create(
        input,
        this.rom,
        maps,
        moveNames,
      );
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
      await memory.connect(port, { signal: this.cancel.signal });
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
      let unstableSince: number | undefined;
      let sampling = false;
      let lastFrameAt = -Infinity;
      const poll = async () => {
        let delay = FRAME_INTERVAL_MS;
        try {
          // Between battle frames only the keypad register is read, so short Start presses are not missed.
          if (sampling && Date.now() - lastFrameAt < FRAME_INTERVAL_MS) {
            await input.sample();
            // Best effort: the next full read reports anything found and handles real errors.
            await reader.probeEffectiveness().catch(() => undefined);
            delay = SAMPLE_INTERVAL_MS;
            return;
          }
          const { frame, layout } = await reader.read();
          lastFrameAt = Date.now();
          const battleId = frame.stateLoaded ? undefined : frame.battle?.id;
          input.setBattle(battleId);
          sampling = Boolean(battleId);
          if (sampling) delay = SAMPLE_INTERVAL_MS;
          unstableSince = undefined;
          if (!this.stopped) onFrame(frame, layout);
        } catch (error) {
          input.setBattle(undefined);
          sampling = false;
          if (error instanceof SnapshotError) {
            // Records being rewritten are expected for a moment; only a lasting inconsistency is reported.
            unstableSince ??= Date.now();
            if (
              !this.stopped &&
              Date.now() - unstableSince >= UNSTABLE_REPORT_MS
            )
              onError(error, false);
          } else {
            delay = 1000;
            // Transitions can briefly expose an unreadable state; only a lasting failure or a disconnection is reported.
            unstableSince ??= Date.now();
            if (
              !this.stopped &&
              (!memory.isConnected ||
                Date.now() - unstableSince >= TRANSIENT_ERROR_REPORT_MS)
            )
              onError(error, !memory.isConnected);
          }
        } finally {
          if (!this.stopped && memory.isConnected)
            this.timer = setTimeout(() => {
              this.polling = poll();
            }, delay);
        }
      };
      this.polling = poll();
      await this.polling;
      if (this.stopped) throw new Error("MelonDS connection cancelled.");
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.cancel.abort();
    clearTimeout(this.timer);
    try {
      await this.polling;
    } finally {
      const rom = this.rom;
      this.rom = undefined;
      await rom?.close();
    }
  }
}
