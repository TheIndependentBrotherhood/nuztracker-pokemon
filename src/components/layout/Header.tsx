"use client";

import { AppBar, Box, Container, Toolbar, Typography } from "@mui/material";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

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
  const { lang, toggleLang } = useLanguage();
  const tr = translations;
  const switchLabel =
    lang === "fr"
      ? t(tr.language.switchToEnglish, lang)
      : t(tr.language.switchToFrench, lang);

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
      <Container maxWidth={false} sx={{ px: 0, mx: 0 }}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "center",
            p: 1,
            position: "relative",
          }}
        >
          {/* Left: Back action */}
          {backAction && (
            <Box sx={{ display: "flex", position: "absolute", left: 16 }}>
              {backAction}
            </Box>
          )}

          {/* Center: Title */}
          {title && (
            <Box sx={{ textAlign: "center" }}>
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
          )}

          {/* Right: Actions + Language toggle */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              position: "absolute",
              right: 16,
              alignItems: "center",
            }}
          >
            {actions}
            {/* Language flag button */}
            <Box
              component="button"
              onClick={toggleLang}
              title={switchLabel}
              aria-label={switchLabel}
              sx={{
                fontSize: "1.4rem",
                lineHeight: 1,
                background: "rgba(255,255,255,0.6)",
                border: "2px solid #000",
                borderRadius: "0.5rem",
                px: 0.75,
                py: 0.25,
                cursor: "pointer",
                transition: "all 200ms ease",
                "&:hover": {
                  background: "rgba(255,255,255,0.9)",
                  transform: "scale(1.05)",
                },
              }}
            >
              {lang === "fr" ? "🇬🇧" : "🇫🇷"}
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
