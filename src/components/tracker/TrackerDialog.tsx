"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Box,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  type DialogProps,
} from "@mui/material";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

/** Element dialogs must stay inside so a cropped stream capture shows them. */
export const TrackerBoundsContext = createContext<HTMLElement | null>(null);

export function useTrackerBounds() {
  return useContext(TrackerBoundsContext);
}

export function boundedDialogProps(
  container: HTMLElement | null,
): Partial<DialogProps> {
  if (!container) return {};
  return {
    container,
    disableScrollLock: true,
    maxWidth: false,
    fullWidth: true,
    sx: {
      position: "absolute",
      "& .MuiDialog-container": { alignItems: "flex-start" },
    },
    slotProps: {
      backdrop: { sx: { position: "absolute" } },
      paper: {
        sx: {
          m: 1,
          width: "calc(100% - 16px)",
          maxWidth: "none",
          maxHeight: "calc(100% - 16px)",
        },
      },
    },
  };
}

const fallbackPaperSx = {
  width: "min(460px, calc(100vw - 16px))",
  m: 1,
  maxHeight: "calc(100dvh - 16px)",
};

export default function TrackerDialog({
  open,
  onClose,
  title,
  help,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  help?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { lang } = useLanguage();
  const container = useTrackerBounds();
  const [showHelp, setShowHelp] = useState(false);
  const helpLabel = t(translations.focusCard.helpAction, lang);
  const bounded = boundedDialogProps(container);
  return (
    <Dialog
      maxWidth={false}
      {...bounded}
      open={open}
      onClose={onClose}
      slotProps={{
        ...(bounded.slotProps ?? { paper: { sx: fallbackPaperSx } }),
        transition: { onExited: () => setShowHelp(false) },
      }}
    >
      <DialogTitle
        sx={{
          px: 1.5,
          py: 0.75,
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <Box
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </Box>
        {help ? (
          <Tooltip title={helpLabel}>
            <IconButton
              size="small"
              aria-label={helpLabel}
              aria-expanded={showHelp}
              onClick={() => setShowHelp((value) => !value)}
              sx={{
                width: 22,
                height: 22,
                fontSize: "0.75rem",
                fontWeight: 700,
                border: "1px solid",
                borderColor: showHelp ? "primary.main" : "divider",
                color: showHelp ? "primary.main" : "text.secondary",
              }}
            >
              ?
            </IconButton>
          </Tooltip>
        ) : null}
      </DialogTitle>
      <DialogContent sx={{ px: 1.5, py: 0.5 }}>
        {help ? (
          <Collapse in={showHelp} unmountOnExit>
            <Typography
              variant="caption"
              component="div"
              sx={{
                mb: 1,
                p: 0.75,
                borderRadius: 0.5,
                bgcolor: "action.hover",
                color: "text.secondary",
                lineHeight: 1.35,
              }}
            >
              {help}
            </Typography>
          </Collapse>
        ) : null}
        {children}
      </DialogContent>
      {actions ? (
        <DialogActions sx={{ px: 1.5, py: 0.75 }}>{actions}</DialogActions>
      ) : null}
    </Dialog>
  );
}
