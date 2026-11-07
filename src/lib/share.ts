import { z } from "zod";
import { Capture, type Run } from "./types";
import type { GameVersionId } from "./game-catalog";
import { getCaptureTypesForRun } from "./capture-types";
import { captureSchema } from "./tracker/schema";

export async function encodeTeam(captures: Capture[], run?: Run): Promise<string> {
  const json = JSON.stringify(run ? captures.map((capture) => ({
    ...capture,
    customTypes: getCaptureTypesForRun(capture, run),
  })) : captures);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);

  const pako = await import("pako");
  const compressed = pako.gzip(data);

  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < compressed.length; i += chunkSize) {
    parts.push(String.fromCharCode(...compressed.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(""));
}

export async function decodeTeam(base64: string): Promise<Capture[]> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const pako = await import("pako");
    const decompressed = pako.ungzip(bytes);
    const decoder = new TextDecoder();
    const json = decoder.decode(decompressed);
    return z.array(captureSchema).max(24).parse(JSON.parse(json));
  } catch (error) {
    throw new Error("This team link is invalid or damaged.", { cause: error });
  }
}

export function buildShareUrl(
  base64: string,
  options: { showTypes?: boolean; tightTypes?: boolean; isRip?: boolean; gameVersion?: GameVersionId; randomTypes?: boolean } = {},
): string {
  const params = new URLSearchParams({ team: base64 });
  if (options.gameVersion) params.set("game", options.gameVersion);
  if (options.randomTypes) params.set("randomTypes", "true");
  if (typeof options?.showTypes === "boolean") {
    params.set("showTypes", String(options.showTypes));
  }
  if (typeof options?.tightTypes === "boolean") {
    params.set("tightTypes", String(options.tightTypes));
  }
  if (typeof options?.isRip === "boolean") {
    params.set("isRip", String(options.isRip));
  }
  return `/share/?${params.toString()}`;
}
