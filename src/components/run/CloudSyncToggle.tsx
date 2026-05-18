"use client";

import { useState, useCallback } from "react";
import { Box, CircularProgress, Tooltip } from "@mui/material";
import { Run } from "@/lib/types";
import { useRunStore } from "@/store/runStore";
import { getOrCreateAnonUser } from "@/lib/auth";
import { saveRunToCloud } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface Props {
  run: Run;
}

export default function CloudSyncToggle({ run }: Props) {
  const { updateRun } = useRunStore();
  const { lang } = useLanguage();
  const tr = translations;
  const [status, setStatus] = useState<SyncStatus>("idle");

  const configured = isFirebaseConfigured();

  const handleToggle = useCallback(async () => {
    if (!configured) return;

    if (run.cloudSyncEnabled) {
      // Disable sync — keep data in Firestore so share links keep working
      updateRun({ ...run, cloudSyncEnabled: false });
      setStatus("idle");
      return;
    }

    // Enable sync — sign in anonymously and do an initial full push
    setStatus("syncing");
    try {
      const uid = await getOrCreateAnonUser();
      const updatedRun: Run = { ...run, cloudSyncEnabled: true, ownerUid: uid };
      await saveRunToCloud(updatedRun);
      updateRun(updatedRun);
      setStatus("synced");
    } catch {
      setStatus("error");
    }
  }, [run, configured, updateRun]);

  const isEnabled = Boolean(run.cloudSyncEnabled);

  const statusIcon =
    status === "syncing" ? (
      <CircularProgress size={10} sx={{ color: "#000" }} />
    ) : isEnabled && status !== "error" ? (
      <Box component="span" sx={{ fontSize: "0.6rem" }}>✓</Box>
    ) : status === "error" ? (
      <Box component="span" sx={{ fontSize: "0.6rem" }}>✕</Box>
    ) : null;

  const label = isEnabled
    ? t(tr.cloudSync.disableButton, lang)
    : t(tr.cloudSync.enableButton, lang);

  const tooltipTitle = !configured
    ? t(tr.cloudSync.notConfigured, lang)
    : status === "syncing"
      ? t(tr.cloudSync.syncing, lang)
      : status === "synced" || (isEnabled && status === "idle")
        ? t(tr.cloudSync.synced, lang)
        : status === "error"
          ? t(tr.cloudSync.error, lang)
          : "";

  return (
    <Tooltip title={tooltipTitle} placement="bottom">
      <Box
        component="button"
        onClick={handleToggle}
        disabled={!configured || status === "syncing"}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "#000",
          background: isEnabled
            ? "linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)"
            : "rgba(255,255,255,0.6)",
          border: "2px solid #000",
          borderRadius: "0.5rem",
          px: 1,
          py: 0.5,
          cursor: configured && status !== "syncing" ? "pointer" : "not-allowed",
          opacity: !configured ? 0.5 : 1,
          transition: "all 200ms ease",
          "&:hover": {
            background: isEnabled
              ? "linear-gradient(135deg, #86efac 0%, #4ade80 100%)"
              : "rgba(255,255,255,0.9)",
            transform: configured && status !== "syncing" ? "scale(1.03)" : "none",
          },
          whiteSpace: "nowrap",
        }}
      >
        {label}
        {statusIcon && (
          <Box sx={{ ml: 0.25, display: "flex", alignItems: "center" }}>
            {statusIcon}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
