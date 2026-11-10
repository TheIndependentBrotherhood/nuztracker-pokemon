"use client";

import { useEffect } from "react";
import { Alert, Box, Button, LinearProgress } from "@mui/material";
import { useRunStore } from "@/store/runStore";

export default function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    loadRuns,
    loaded,
    pending,
    error,
    clearError,
    reportError,
    receiveRecord,
    receiveDeleted,
    setDesktopStatus,
    receiveBattleFocus,
  } = useRunStore();

  useEffect(() => {
    const unsubscribe = window.nuztracker?.subscribe((event) => {
      switch (event.type) {
        case "record":
          receiveRecord(event.record);
          break;
        case "deleted":
          receiveDeleted(event.runId);
          break;
        case "status":
          setDesktopStatus(event.status);
          break;
        case "battle-focus":
          receiveBattleFocus(event);
          break;
        case "error":
          reportError(new Error(event.message));
          break;
      }
    });
    void loadRuns();
    return unsubscribe;
  }, [
    loadRuns,
    receiveRecord,
    receiveDeleted,
    setDesktopStatus,
    receiveBattleFocus,
    reportError,
  ]);

  return (
    <>
      {pending > 0 && (
        <LinearProgress
          aria-label="Saving tracker data"
          sx={{ position: "fixed", inset: "0 0 auto", zIndex: 1600 }}
        />
      )}
      {error && (
        <Box
          sx={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 1600,
          }}
        >
          <Alert
            severity="error"
            onClose={clearError}
            action={
              <Button
                color="inherit"
                onClick={() => {
                  clearError();
                  if (!loaded) void loadRuns();
                }}
              >
                {loaded ? "Dismiss" : "Retry loading"}
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      )}
      {children}
    </>
  );
}
