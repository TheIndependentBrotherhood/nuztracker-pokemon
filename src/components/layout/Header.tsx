"use client";

import { AppBar, Box, Container, Toolbar, Typography } from "@mui/material";
import Link from "next/link";

interface Props {
  showBack?: boolean;
  title?: string;
  subtitle?: string;
  backAction?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function Header({
  title,
  subtitle,
  backAction,
  actions,
}: Props) {
  return (
    <AppBar
      position="sticky"
      sx={{
        background:
          "linear-gradient(90deg, #FFECC8 0%, #FFD699 50%, #FFCC99 100%)",
        borderBottom: "4px solid #000",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        zIndex: 100,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
        >
          {/* Left: Back action */}
          {backAction && (
            <Box sx={{ display: "flex", mr: 2 }}>{backAction}</Box>
          )}

          {/* Center: Logo or Title */}
          {title ? (
            <Box sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#000",
                  fontSize: "1rem",
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#666",
                    textTransform: "capitalize",
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          ) : (
            <Link href="/" style={{ textDecoration: "none" }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  color: "#000",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  cursor: "pointer",
                }}
              >
                🎮 NuzTracker
              </Typography>
            </Link>
          )}

          {/* Right: Actions */}
          {actions && (
            <Box sx={{ display: "flex", gap: 2, ml: 2 }}>{actions}</Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
