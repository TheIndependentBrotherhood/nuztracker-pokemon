"use client";

import { useState } from "react";
import {
  Box,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { useGameText } from "@/lib/game-text";
import type { MartId } from "@/lib/games/platinum/marts";
import { martItemRows } from "@/lib/tracker/marts";
import type { VisitedMart } from "@/lib/tracker/types";

export default function MartsPanel({
  marts,
  onClose,
}: {
  marts: VisitedMart[];
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const gameText = useGameText();
  const [city, setCity] = useState<MartId | "all">("all");
  const [query, setQuery] = useState("");
  const text = translations.marts;
  const selectedCity =
    city !== "all" && marts.some((mart) => mart.id === city) ? city : "all";
  const rows = martItemRows(
    marts,
    selectedCity,
    query,
    (itemId) =>
      gameText?.itemName(itemId, lang) ?? text.unknownItem[lang](itemId),
  );
  return (
    <Box
      id="light-marts-panel"
      data-testid="marts-panel"
      role="region"
      aria-label={t(text.title, lang)}
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        zIndex: 11,
        bgcolor: "#1b2937",
        border: "1px solid #7890a5",
        borderRadius: 1,
        p: 0.75,
        boxShadow: "0 8px 20px #0008",
        maxHeight:
          "min(420px, calc(var(--window-content-height, 100vh) - 80px))",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
        <Typography
          title={t(text.hint, lang)}
          sx={{ fontSize: "0.75rem", fontWeight: 700, flex: 1 }}
        >
          {t(text.title, lang)}
        </Typography>
        <IconButton
          size="small"
          aria-label={t(text.close, lang)}
          onClick={onClose}
          sx={{ color: "#b8c7d5", p: 0.25 }}
        >
          ×
        </IconButton>
      </Stack>
      {marts.length ? (
        <>
          <Stack direction="row" sx={{ gap: 0.5 }}>
            <TextField
              select
              size="small"
              label={t(text.city, lang)}
              value={selectedCity}
              onChange={(event) => setCity(event.target.value as MartId)}
              sx={{ flex: 1, minWidth: 0 }}
            >
              <MenuItem value="all">{t(text.allCities, lang)}</MenuItem>
              {marts.map((mart) => (
                <MenuItem value={mart.id} key={mart.id}>
                  {t(text.cities[mart.id], lang)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="search"
              label={t(text.search, lang)}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              sx={{ flex: 1, minWidth: 0 }}
            />
          </Stack>
          <Box
            component="ul"
            data-testid="mart-items"
            sx={{ m: 0, p: 0, listStyle: "none", overflowY: "auto" }}
          >
            {rows.map((row) => (
              <Box
                component="li"
                key={row.itemId}
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 0.75,
                  py: 0.25,
                  borderBottom: "1px solid #ffffff14",
                  fontSize: "0.75rem",
                }}
              >
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {row.name}
                </Box>
                {selectedCity === "all" && (
                  <Box
                    component="span"
                    title={text.soldIn[lang](row.marts.length)}
                    sx={{
                      ml: "auto",
                      color: "#b8c7d5",
                      fontSize: "0.65rem",
                      textAlign: "right",
                    }}
                  >
                    {row.marts.map((id) => t(text.cities[id], lang)).join(", ")}
                  </Box>
                )}
              </Box>
            ))}
            {!rows.length && (
              <Typography
                component="li"
                sx={{ fontSize: "0.7rem", color: "#b8c7d5" }}
              >
                {t(text.noMatch, lang)}
              </Typography>
            )}
          </Box>
        </>
      ) : (
        <Typography sx={{ fontSize: "0.7rem", color: "#b8c7d5" }}>
          {t(text.none, lang)}
        </Typography>
      )}
    </Box>
  );
}
