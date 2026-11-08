"use client";

import NextLink from "next/link";
import { Button, type ButtonProps } from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

export default function OpenLightTrackerButton({
  runId,
  variant = "contained",
}: {
  runId: string;
  variant?: ButtonProps["variant"];
}) {
  const { desktopStatus, reportError } = useRunStore();
  const { lang } = useLanguage();
  const label = t(translations.connections.openLight, lang);
  if (!desktopStatus)
    return (
      <Button
        variant={variant}
        component={NextLink}
        href={`/compact/?id=${runId}`}
      >
        {label}
      </Button>
    );
  return (
    <Button
      variant={variant}
      onClick={() =>
        void window.nuztracker?.openCompact(runId).catch(reportError)
      }
    >
      {label}
    </Button>
  );
}
