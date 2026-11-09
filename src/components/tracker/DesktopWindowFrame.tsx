"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import type { DesktopWindowState } from "@/lib/tracker/types";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PixelIcon, { PIN_ICON } from "./PixelIcon";

const TITLE_BAR_HEIGHT = 32;
// Fallback width of the three Windows caption buttons when the overlay area is unknown.
const CAPTION_BUTTONS_WIDTH = 138;
const drag = { WebkitAppRegion: "drag" } as CSSProperties;
const noDrag = { WebkitAppRegion: "no-drag" } as CSSProperties;

/** Desktop title bar drawn beside the system caption buttons, with an always-on-top pin. */
export default function DesktopWindowFrame({
  children,
}: {
  children: ReactNode;
}) {
  const { lang } = useLanguage();
  const [state, setState] = useState<DesktopWindowState>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.nuztracker
      ?.getWindowState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state?.titleBar) return children;
  const pinned = state.alwaysOnTop;
  const label = t(
    pinned ? translations.windowPin.unpin : translations.windowPin.pin,
    lang,
  );

  async function togglePin() {
    try {
      setState(await window.nuztracker!.setAlwaysOnTop(!pinned));
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <Box
      sx={{
        "--window-content-height": `calc(100vh - ${TITLE_BAR_HEIGHT}px)`,
      }}
    >
      <Box
        data-testid="desktop-title-bar"
        style={drag}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1500,
          height: TITLE_BAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          pl: 1,
          pr: `calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, calc(100vw - ${CAPTION_BUTTONS_WIDTH}px)) + 4px)`,
          bgcolor: "#0b1218",
          color: "#edf4fa",
          borderBottom: "1px solid #263442",
          userSelect: "none",
        }}
      >
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#a5b6c8",
          }}
        >
          NuzTracker
        </Typography>
        <Box
          component="button"
          type="button"
          data-testid="window-pin"
          aria-pressed={pinned}
          aria-label={label}
          title={label}
          onClick={() => void togglePin()}
          style={noDrag}
          sx={{
            width: 28,
            height: 24,
            display: "grid",
            placeItems: "center",
            border: "1px solid",
            borderColor: error ? "#ef4444" : pinned ? "#facc15" : "transparent",
            borderRadius: 1,
            bgcolor: pinned ? "#2a2410" : "transparent",
            cursor: "pointer",
            "&:hover": { bgcolor: pinned ? "#3a3214" : "#1c2834" },
            "&:focus-visible": { outline: "2px solid #60a5fa" },
          }}
        >
          <PixelIcon
            rows={PIN_ICON}
            size={11}
            color={pinned ? "#facc15" : "#a5b6c8"}
          />
        </Box>
      </Box>
      {children}
    </Box>
  );
}
