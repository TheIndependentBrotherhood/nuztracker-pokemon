import { Suspense } from "react";
import { Box } from "@mui/material";
import RunPageContent from "./RunPageContent";

export default function RunPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: "100vh",
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
          }}
        >
          Chargement...
        </Box>
      }
    >
      <RunPageContent />
    </Suspense>
  );
}
