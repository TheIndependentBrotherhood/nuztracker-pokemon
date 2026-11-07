"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { overlaySchema, type OverlayData } from "@/lib/tracker/overlay";
import { validationMessage } from "@/lib/tracker/schema";
import OverlayPresentation from "@/components/tracker/OverlayPresentation";

export default function OverlayPage() {
  const [data, setData] = useState<OverlayData | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const compact = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("style") === "compact",
    () => false,
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const runId = new URLSearchParams(window.location.search).get("run");
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        if (!runId || !token)
          throw new Error(
            "Generate a local overlay URL from the desktop application.",
          );
        const response = await fetch(
          `/overlay-data/${encodeURIComponent(runId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok)
          throw new Error(
            "The local tracker is unavailable or the overlay token is invalid.",
          );
        const payload: unknown = await response.json();
        setNow(Date.now());
        setData(overlaySchema.parse(payload));
        setError("");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(validationMessage(failure));
      }
      if (!controller.signal.aborted)
        timer = setTimeout(() => void refresh(), 250);
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  return <OverlayPresentation data={data} error={error} now={now} compact={compact} />;
}
