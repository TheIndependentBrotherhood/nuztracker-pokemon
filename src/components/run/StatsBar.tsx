"use client";

import { useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { Run, Zone, Capture } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";
import StyledTextField from "@/components/ui/StyledTextField";
import { getSpriteFallbackUrl, getSpriteUrl } from "@/lib/pokemon-api";
import { encodeTeam, buildShareUrl } from "@/lib/share";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import {
  useCaptureDisplayLabel,
  useCaptureDisplayName,
} from "@/lib/pokemon-display";

interface Props {
  run: Run;
}

function TeamPreviewPokemonTile({
  pokemon,
  lang,
}: {
  pokemon: Capture;
  lang: "fr" | "en";
}) {
  const displayName = useCaptureDisplayName(pokemon, lang);
  const displayLabel = useCaptureDisplayLabel(pokemon, lang);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        columnGap: 0.5,
        position: "relative",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getSpriteUrl(
          pokemon.pokemonId,
          pokemon.isShiny,
          true,
          pokemon.unownLetter,
        )}
        alt={displayName}
        onError={(event) => {
          const fallbackUrl = getSpriteFallbackUrl(
            pokemon.pokemonId,
            pokemon.isShiny,
            pokemon.unownLetter,
          );
          if (event.currentTarget.src !== fallbackUrl) {
            event.currentTarget.src = fallbackUrl;
          }
        }}
        style={{
          width: "80px",
          height: "80px",
          imageRendering: "pixelated",
        }}
      />
      {/* Badge with nickname/name */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(0, 0, 0, 0.7)",
          color: "#fff",
          padding: "4px 6px",
          borderRadius: "0 0 4px 4px",
          fontSize: "0.65rem",
          fontWeight: 700,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayLabel}
      </Box>
    </Box>
  );
}

export default function StatsBar({ run }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportWidth, setExportWidth] = useState(440);
  const [exportHeight, setExportHeight] = useState(720);
  const { lang } = useLanguage();
  const tr = translations;

  const total = run.zones.length;
  const visited = run.zones.filter(
    (z: Zone) => z.status !== "not-visited",
  ).length;
  const captured = run.zones.filter(
    (z: Zone) => z.status === "captured",
  ).length;
  const missed = visited - captured;
  const captureRate = visited > 0 ? Math.round((captured / visited) * 100) : 0;
  const progress = total > 0 ? (visited / total) * 100 : 0;

  // Count dead pokémons
  const deadCount = run.zones.reduce(
    (acc: number, z: Zone) =>
      acc + z.captures.filter((c: Capture) => c.isDead).length,
    0,
  );

  // Export handlers for team stats card
  async function handleExportPng() {
    setShowExportDialog(true);
  }

  async function performExport() {
    setExporting(true);
    setExportError("");
    setShowExportDialog(false);

    try {
      const element = document.getElementById("team-export-target");
      if (!element) {
        setExportError(t(tr.statsBar.teamViewElementNotFound, lang));
        return;
      }

      // Save original dimensions
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;

      // Apply export dimensions to the element
      element.style.width = `${exportWidth}px`;
      element.style.height = `${exportHeight}px`;

      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(element, {
        width: exportWidth,
        height: exportHeight,
        scale: 1,
        backgroundColor: "rgba(0, 0, 0, 0)",
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      });

      // Restore original dimensions
      element.style.width = originalWidth;
      element.style.height = originalHeight;

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `team-${new Date().getTime()}.png`;
      link.click();
    } catch (error) {
      console.error("PNG export error:", error);
      setExportError(t(tr.statsBar.failedToExportPng, lang));
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateUrl() {
    try {
      const encoded = await encodeTeam(run.team);
      const shareUrl = buildShareUrl(encoded);
      const link = document.createElement("a");
      link.href = shareUrl;
      link.target = "_blank";
      link.click();
    } catch (error) {
      console.error("URL generation error:", error);
      setExportError(t(tr.statsBar.failedToGenerateShareUrl, lang));
    }
  }

  const teamActions = [
    {
      icon: "🖼️",
      title: t(tr.statsBar.exportTeamAsPng, lang),
      onClick: handleExportPng,
      disabled: exporting || run.team.length === 0,
    },
    {
      icon: "🔗",
      title: t(tr.statsBar.generateShareableUrl, lang),
      onClick: handleGenerateUrl,
      disabled: run.team.length === 0,
    },
  ];

  // Zones with regular captures
  const zonesWithRegularCaptures = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => !c.isShiny),
  ).length;

  // Zones with shiny captures
  const zonesWithShinyCaptures = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => c.isShiny),
  ).length;

  // Display values (x2 total if shiny hunt mode)
  const displayVisited = visited;
  const displayTotal = run.isShinyHuntMode ? total * 2 : total;

  // Zones hover content (regular and shiny)
  const zonesHoverContent = (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 6 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {zonesWithRegularCaptures}/{total}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t(tr.statsBar.regularZones, lang)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {zonesWithShinyCaptures}/{total}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t(tr.statsBar.shinyZones, lang)}
        </Typography>
      </Box>
    </Box>
  );

  // Caught hover content (rate and missed)
  const captureesHoverContent = (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 6 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {captureRate}%
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t(tr.statsBar.rate, lang)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "2rem", sm: "3rem" },
            color: "#000",
            mb: 1,
          }}
        >
          {missed}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 700,
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t(tr.statsBar.missed, lang)}
        </Typography>
      </Box>
    </Box>
  );

  // Équipe hover content (team sprites)
  const equipeHoverContent = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        columnGap: { xs: 1, sm: 2, md: 3 },
        rowGap: 1.5,
      }}
    >
      {run.team.map((pokemon: Capture) => (
        <TeamPreviewPokemonTile
          key={pokemon.id}
          pokemon={pokemon}
          lang={lang}
        />
      ))}
      {run.team.length < 6 &&
        Array.from({ length: 6 - run.team.length }).map((_, i) => (
          <Box
            key={`empty-${i}`}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
            }}
          >
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#000" }}
            >
              ?
            </Typography>
            <Typography
              sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#000" }}
            >
              -
            </Typography>
          </Box>
        ))}
    </Box>
  );

  return (
    <Box
      sx={{
        px: 4,
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={4}
        sx={{ mb: 3, pt: 2 }}
      >
        <StatCard
          value={`${displayVisited}/${displayTotal}`}
          label={t(tr.statsBar.zones, lang)}
          color="#E3F2FD"
          hoverContent={zonesHoverContent}
        />
        <StatCard
          value={captured}
          label={t(tr.statsBar.caught, lang)}
          color="#E8F5E9"
          hoverContent={captureesHoverContent}
        />
        <StatCard
          value={deadCount}
          label={t(tr.statsBar.dead, lang)}
          color="#FEE2E2"
        />
        <StatCard
          value={`${run.team.length}/6`}
          label={t(tr.statsBar.team, lang)}
          color="#fff7e8"
          hoverContent={equipeHoverContent}
          actions={teamActions}
        />
      </Stack>

      {/* Global progress bar */}
      <Box
        sx={{
          height: "12px",
          background: "#fff",
          border: "2px solid #000",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "999px",
            transition: "width 700ms ease",
            background: "linear-gradient(to right, #3b82f6, #a855f7)",
            width: `${progress}%`,
          }}
        />
      </Box>

      {/* PNG Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "1.5rem",
              border: "3px solid #000",
              boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.3)",
              backgroundColor: "#fff",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "#000",
            borderBottom: "2px solid #000",
          }}
        >
          {t(tr.statsBar.exportPngTitle, lang)}
        </DialogTitle>
        <DialogContent
          sx={{
            pt: "24px !important",
            pb: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "calc(100vh - 300px)",
            overflow: "auto",
          }}
        >
          <StyledTextField
            label={t(tr.statsBar.width, lang)}
            type="number"
            value={exportWidth}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 440;
              setExportWidth(Math.max(440, Math.min(1920, value)));
            }}
            fullWidth
          />
          <StyledTextField
            label={t(tr.statsBar.height, lang)}
            type="number"
            value={exportHeight}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 720;
              setExportHeight(Math.max(720, Math.min(1080, value)));
            }}
            fullWidth
          />
          <Typography sx={{ fontSize: "0.875rem", color: "#666" }}>
            {t(tr.statsBar.exportDimensionsHint, lang)}
          </Typography>
          {exportError && (
            <Typography
              sx={{ fontSize: "0.875rem", color: "#dc2626", fontWeight: 700 }}
            >
              {exportError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "2px solid #000", pt: 2, gap: 2 }}>
          <Button
            onClick={() => setShowExportDialog(false)}
            sx={{
              border: "3px solid #000",
              borderRadius: "1.5rem",
              color: "#000",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "1rem",
              px: 4,
              py: 1,
              backgroundColor: "#fff",
              boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.3)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translate(-2px, -2px)",
                boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.4)",
              },
              "&:active": {
                transform: "translate(1px, 1px)",
                boxShadow: "2px 2px 0 rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            {t(tr.statsBar.cancel, lang)}
          </Button>
          <Button
            onClick={performExport}
            disabled={exporting}
            sx={{
              border: "3px solid #000",
              borderRadius: "1.5rem",
              background: "#000",
              color: "#fff",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "1rem",
              px: 4,
              py: 1,
              boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.3)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translate(-2px, -2px)",
                boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.4)",
              },
              "&:active": {
                transform: "translate(1px, 1px)",
                boxShadow: "2px 2px 0 rgba(0, 0, 0, 0.2)",
              },
              "&:disabled": {
                backgroundColor: "#ccc",
                borderColor: "#999",
                color: "#666",
                transform: "none",
                boxShadow: "2px 2px 0 rgba(0, 0, 0, 0.1)",
              },
            }}
          >
            {exporting
              ? t(tr.statsBar.exporting, lang)
              : t(tr.statsBar.export, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
