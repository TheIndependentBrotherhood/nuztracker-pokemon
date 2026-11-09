import { createHash, X509Certificate } from "node:crypto";
import { generate } from "selfsigned";
import { z } from "zod";
import type { TrackerDatabase } from "./database";

const DAY = 24 * 60 * 60 * 1000;
const tlsSchema = z.object({ key: z.string(), cert: z.string() });

export interface RoomTls {
  key: string;
  cert: string;
  fingerprint: string;
}

export function certificateFingerprint(raw: Buffer): string {
  return createHash("sha256").update(raw).digest("base64url");
}

/** Self-signed room certificate, kept across sessions so invitations stay valid. */
export async function roomTls(
  database: TrackerDatabase,
  now = Date.now(),
): Promise<RoomTls> {
  const saved = database.readSetting("room-tls", tlsSchema);
  if (saved) {
    try {
      const certificate = new X509Certificate(saved.cert);
      if (Date.parse(certificate.validTo) - now > 30 * DAY)
        return {
          ...saved,
          fingerprint: certificateFingerprint(certificate.raw),
        };
    } catch {
      // A corrupted certificate is replaced below.
    }
  }
  const pems = await generate(
    [{ name: "commonName", value: "NuzTracker room" }],
    {
      keyType: "ec",
      curve: "P-256",
      algorithm: "sha256",
      notBeforeDate: new Date(now - DAY),
      notAfterDate: new Date(now + 5 * 365 * DAY),
      extensions: [
        { name: "basicConstraints", cA: false },
        { name: "keyUsage", digitalSignature: true, critical: true },
        { name: "extKeyUsage", serverAuth: true },
      ],
    },
  );
  const stored = { key: pems.private, cert: pems.cert };
  database.writeSetting("room-tls", stored);
  return {
    ...stored,
    fingerprint: certificateFingerprint(new X509Certificate(pems.cert).raw),
  };
}
