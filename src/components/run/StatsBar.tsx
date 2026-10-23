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
  Tooltip,
} from "@mui/material";
import { Run, Zone, Capture, SOUL_LINK_PLAYER_COLORS } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";
import StyledTextField from "@/components/ui/StyledTextField";
import { encodeTeam, buildShareUrl } from "@/lib/share";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import {
  useCaptureDisplayLabel,
  useCaptureDisplayName,
} from "@/lib/pokemon-display";

interface Props {
  run: Run;
  exportShowTypes: boolean;
  exportTightTypes: boolean;
  onChangeExportOptions: (options: {
    showTypes: boolean;
    tightTypes: boolean;
  }) => void;
}

const PROGRESS_CAPTURED_BG = "linear-gradient(to right, #22c55e, #16a34a)";
const PROGRESS_DEAD_BG = "linear-gradient(to right, #4b5563, #1f2937)";
const PROGRESS_LOST_BG =
  "repeating-linear-gradient(135deg, #ef4444 0 6px, #f87171 6px 12px)";
const PROGRESS_LOST_LEGEND_BG =
  "repeating-linear-gradient(135deg, #ef4444 0 3px, #f87171 3px 6px)";

function ProgressLegendItem({
  background,
  label,
}: {
  background: string;
  label: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "2px",
          border: "1px solid #000",
          background,
          flexShrink: 0,
        }}
      />
      {label}
    </Box>
  );
}

/** Segmented zone progress bar: captured (green), dead (dark grey) and lost (red). */
function ZoneProgressBar({
  lang,
  total,
  captured,
  dead,
  lost,
  kills,
  playerName,
  playerColor,
}: {
  lang: "fr" | "en";
  total: number;
  captured: number;
  dead: number;
  lost: number;
  kills?: number;
  playerName?: string;
  playerColor?: string;
}) {
  const tr = translations;
  const toPercent = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const finished = captured + dead + lost;
  const remaining = Math.max(0, total - finished);
  const tooltipParts = [
    t(tr.statsBar.progressCaptured, lang)(captured),
    t(tr.statsBar.progressDead, lang)(dead),
    t(tr.statsBar.progressLost, lang)(lost),
    t(tr.statsBar.progressRemaining, lang)(remaining),
  ];
  if (kills !== undefined) {
    tooltipParts.push(t(tr.statsBar.progressKills, lang)(kills));
  }

  return (
    <Box
      sx={
        playerName
          ? {
              p: 1.25,
              background: "#fff",
              border: `2px solid ${playerColor ?? "#000"}`,
              borderRadius: "0.75rem",
            }
          : undefined
      }
    >
      {playerName && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 0.75,
            fontSize: "0.8rem",
            fontWeight: 900,
            color: playerColor ?? "#000",
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: playerColor ?? "#000",
              border: "1px solid #000",
            }}
          />
          {playerName}
        </Box>
      )}
      <Tooltip arrow title={tooltipParts.join(" · ")}>
        <Box
          sx={{
            height: "12px",
            background: "#fff",
            border: "2px solid #000",
            borderRadius: "999px",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <Box
            sx={{
              height: "100%",
              transition: "width 700ms ease",
              background: PROGRESS_CAPTURED_BG,
              width: `${toPercent(captured)}%`,
            }}
          />
          <Box
            sx={{
              height: "100%",
              transition: "width 700ms ease",
              background: PROGRESS_DEAD_BG,
              width: `${toPercent(dead)}%`,
            }}
          />
          <Box
            sx={{
              height: "100%",
              transition: "width 700ms ease",
              background: PROGRESS_LOST_BG,
              width: `${toPercent(lost)}%`,
            }}
          />
        </Box>
      </Tooltip>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          mt: 0.5,
          px: 0.5,
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "#475569",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <ProgressLegendItem
            background={PROGRESS_CAPTURED_BG}
            label={t(tr.statsBar.progressCaptured, lang)(captured)}
          />
          <ProgressLegendItem
            background={PROGRESS_DEAD_BG}
            label={t(tr.statsBar.progressDead, lang)(dead)}
          />
          <ProgressLegendItem
            background={PROGRESS_LOST_LEGEND_BG}
            label={t(tr.statsBar.progressLost, lang)(lost)}
          />
          {kills !== undefined && kills > 0 && (
            <Box>☠️ {t(tr.statsBar.progressKills, lang)(kills)}</Box>
          )}
        </Box>
        <Box sx={{ flexShrink: 0 }}>{Math.round(toPercent(finished))}%</Box>
      </Box>
    </Box>
  );
}

function TeamPreviewPokemonTile({
  pokemonCaptured,
  lang,
}: {
  pokemonCaptured: Capture;
  lang: "fr" | "en";
}) {
  const displayName = useCaptureDisplayName(pokemonCaptured, lang);
  const displayLabel = useCaptureDisplayLabel(pokemonCaptured, lang);

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
        src={
          pokemonCaptured.selectedSprite?.url ??
          (pokemonCaptured.isShiny
            ? pokemonCaptured.pokemon.sprites.shiny.default
            : pokemonCaptured.pokemon.sprites.normal.default)
        }
        alt={displayName}
        onError={(event) => {
          const fallbackUrl = pokemonCaptured.isShiny
            ? pokemonCaptured.pokemon.sprites.shiny.default
            : pokemonCaptured.pokemon.sprites.normal.default;
          event.currentTarget.src = fallbackUrl;
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

export default function StatsBar({
  run,
  exportShowTypes,
  exportTightTypes,
  onChangeExportOptions,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportMode, setExportMode] = useState<"png" | "url">("png");
  const [exportWidth, setExportWidth] = useState(440);
  const [exportHeight, setExportHeight] = useState(720);
  const [dialogShowTypes, setDialogShowTypes] = useState(exportShowTypes);
  const [dialogTightTypes, setDialogTightTypes] = useState(exportTightTypes);
  const { lang } = useLanguage();
  const tr = translations;

  const total = run.zones.length;
  // Count zones that are lost or captured (finished zones)
  const finished = run.zones.filter(
    (z: Zone) => z.status === "lost" || z.status === "captured",
  ).length;
  // Count zones with successful captures (not failed/loupé)
  const captured = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => !c.isDead),
  ).length;

  // Zones with regular captures and shiny captures (for stats calculation)
  // Exclude dead captures from the count
  const regularZones = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => !c.isShiny),
  ).length;
  const shinyZones = run.zones.filter((z: Zone) =>
    z.captures.some((c: Capture) => c.isShiny),
  ).length;

  // In shiny hunt mode, displayed captured count includes both regular and shiny
  const displayCaptured = captured;
  const displayMissed = finished - captured;

  // Count dead pokémons (used for both stats and missed calculation in shiny hunt)
  const deadCount = run.zones.reduce(
    (acc: number, z: Zone) =>
      acc + z.captures.filter((c: Capture) => c.isDead).length,
    0,
  );

  // Display values: count total captures slots and actual captures
  const expectedCapturesPerZone = run.isShinyHuntMode ? 2 : 1;
  const displayTotal = run.zones.length * expectedCapturesPerZone;
  const displayFinished = run.zones.reduce(
    (acc: number, z: Zone) => acc + z.captures.length,
    0,
  );

  const captureRate =
    finished > 0 ? Math.round((captured / finished) * 100) : 0;
  // Segmented progress: captured (alive), dead (captured then died) and lost zones
  const isZoneDead = (z: Zone) =>
    z.status === "captured" &&
    z.captures.length > 0 &&
    !z.captures.some((c: Capture) => !c.isDead);
  const deadZoneCount = run.zones.filter(isZoneDead).length;
  const capturedZoneCount =
    run.zones.filter((z: Zone) => z.status === "captured").length -
    deadZoneCount;
  const lostZoneCount = run.zones.filter(
    (z: Zone) => z.status === "lost",
  ).length;

  // Get last 3 dead pokémons for RIP export (sorted by death time, most recent first)
  const deadPokemon = run.zones
    .flatMap((z: Zone) => z.captures)
    .filter((c: Capture) => c.isDead)
    .sort((a, b) => (b.diedAt ?? 0) - (a.diedAt ?? 0));
  const lastThreeDeadPokemon = deadPokemon.slice(0, 3);

  // Soul Link per-player stats
  const isSoulLink = Boolean(run.isSoulLinkMode && run.soulLinkPlayers?.length);
  const soulLinkPlayers = run.soulLinkPlayers ?? [];

  const perPlayerMissed = isSoulLink
    ? soulLinkPlayers.map((player) => {
        const missed = run.zones.filter((z: Zone) => {
          const playerCaptures = z.captures.filter(
            (c: Capture) => (c.playerIndex ?? 0) === player.playerIndex,
          );

          if (playerCaptures.length === 0) {
            return false;
          }

          const hasSuccessfulCapture = playerCaptures.some(
            (c: Capture) => !c.isDead,
          );
          const hasFailedCapture = playerCaptures.some(
            (c: Capture) => c.isDead,
          );

          return !hasSuccessfulCapture && hasFailedCapture;
        }).length;

        return { player, missed };
      })
    : [];

  const perPlayerDeaths = isSoulLink
    ? soulLinkPlayers.map((player) => ({
        player,
        deaths: run.zones
          .flatMap((z: Zone) => z.captures)
          .filter(
            (c: Capture) =>
              c.isDead && (c.playerIndex ?? 0) === player.playerIndex,
          ).length,
      }))
    : [];

  // Soul Link per-player zone progress (captured / dead / lost / kills)
  const perPlayerProgress = isSoulLink
    ? soulLinkPlayers.map((player) => {
        let capturedCount = 0;
        let deadCount = 0;
        let lostCount = 0;
        run.zones.forEach((z: Zone) => {
          const playerCaptures = z.captures.filter(
            (c: Capture) => (c.playerIndex ?? 0) === player.playerIndex,
          );
          if (playerCaptures.length === 0) return;
          if (playerCaptures.some((c: Capture) => !c.isDead)) {
            capturedCount++;
          } else if (
            playerCaptures.some((c: Capture) => c.isDead && !c.failedCapture)
          ) {
            deadCount++;
          } else {
            lostCount++;
          }
        });
        const kills = run.zones
          .flatMap((z: Zone) => z.captures)
          .filter(
            (c: Capture) =>
              c.isDead && c.killedByPlayerIndex === player.playerIndex,
          ).length;
        return { player, capturedCount, deadCount, lostCount, kills };
      })
    : [];

  // Export handlers for team stats card
  async function handleOpenExportPng() {
    setExportMode("png");
    setDialogShowTypes(exportShowTypes);
    setDialogTightTypes(exportTightTypes);
    setShowExportDialog(true);
  }

  async function handleOpenGenerateUrl() {
    setExportMode("url");
    setDialogShowTypes(exportShowTypes);
    setDialogTightTypes(exportTightTypes);
    setShowExportDialog(true);
  }

  async function performExportPng() {
    setExporting(true);
    setExportError("");
    setShowExportDialog(false);
    onChangeExportOptions({
      showTypes: dialogShowTypes,
      tightTypes: dialogTightTypes,
    });

    let exportElement: HTMLElement | null = null;
    let originalWidth = "";
    let originalHeight = "";
    const replacedSprites: Array<{
      node: HTMLImageElement;
      originalSrc: string;
    }> = [];

    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(null)),
      );

      const element = document.getElementById("team-export-target");
      if (!element) {
        setExportError(t(tr.statsBar.teamViewElementNotFound, lang));
        return;
      }
      exportElement = element;

      // Always use canvas-safe fallback sprite URLs during PNG capture,
      // then restore original selected sprite URLs after export.
      const spriteNodes = element.querySelectorAll<HTMLImageElement>(
        "img[data-export-fallback-src]",
      );
      spriteNodes.forEach((spriteNode) => {
        const fallbackSrc = spriteNode.getAttribute("data-export-fallback-src");
        if (!fallbackSrc) return;

        if (spriteNode.src !== fallbackSrc) {
          replacedSprites.push({
            node: spriteNode,
            originalSrc: spriteNode.src,
          });
          spriteNode.src = fallbackSrc;
        }
      });

      // Save original dimensions
      originalWidth = element.style.width;
      originalHeight = element.style.height;

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
        imageTimeout: 15000,
      });

      // Restore original dimensions
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `team-${new Date().getTime()}.png`;
      link.click();
    } catch (error) {
      console.error("PNG export error:", error);
      setExportError(t(tr.statsBar.failedToExportPng, lang));
    } finally {
      if (exportElement) {
        exportElement.style.width = originalWidth;
        exportElement.style.height = originalHeight;
      }
      replacedSprites.forEach(({ node, originalSrc }) => {
        node.src = originalSrc;
      });
      setExporting(false);
    }
  }

  async function performGenerateUrl() {
    setShowExportDialog(false);
    onChangeExportOptions({
      showTypes: dialogShowTypes,
      tightTypes: dialogTightTypes,
    });

    try {
      const encoded = await encodeTeam(run.team);
      const shareUrl = buildShareUrl(encoded, {
        showTypes: dialogShowTypes,
        tightTypes: dialogTightTypes,
      });
      const link = document.createElement("a");
      link.href = shareUrl;
      link.target = "_blank";
      link.click();
    } catch (error) {
      console.error("URL generation error:", error);
      setExportError(t(tr.statsBar.failedToGenerateShareUrl, lang));
    }
  }

  // Export handlers for RIP
  async function handleOpenExportRipPng() {
    setExporting(true);
    setExportError("");

    let exportElement: HTMLElement | null = null;
    let originalWidth = "";
    let originalHeight = "";
    const replacedSprites: Array<{
      node: HTMLImageElement;
      originalSrc: string;
    }> = [];

    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(null)),
      );

      const element = document.getElementById("rip-export-target");
      if (!element) {
        setExportError(t(tr.statsBar.ripViewElementNotFound, lang));
        return;
      }
      exportElement = element;

      // Always use canvas-safe fallback sprite URLs during PNG capture
      const spriteNodes = element.querySelectorAll<HTMLImageElement>(
        "img[data-export-fallback-src]",
      );
      spriteNodes.forEach((spriteNode) => {
        const fallbackSrc = spriteNode.getAttribute("data-export-fallback-src");
        if (!fallbackSrc) return;

        if (spriteNode.src !== fallbackSrc) {
          replacedSprites.push({
            node: spriteNode,
            originalSrc: spriteNode.src,
          });
          spriteNode.src = fallbackSrc;
        }
      });

      // Save original dimensions
      originalWidth = element.style.width;
      originalHeight = element.style.height;

      // Apply export dimensions to the element
      const ripExportWidth = 560;
      const ripExportHeight = 200;
      element.style.width = `${ripExportWidth}px`;
      element.style.height = `${ripExportHeight}px`;

      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(element, {
        width: ripExportWidth,
        height: ripExportHeight,
        scale: 1,
        backgroundColor: "rgba(0, 0, 0, 0)",
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `rip-${new Date().getTime()}.png`;
      link.click();
    } catch (error) {
      console.error("RIP PNG export error:", error);
      setExportError(t(tr.statsBar.failedToExportPng, lang));
    } finally {
      if (exportElement) {
        exportElement.style.width = originalWidth;
        exportElement.style.height = originalHeight;
      }
      replacedSprites.forEach(({ node, originalSrc }) => {
        node.src = originalSrc;
      });
      setExporting(false);
    }
  }

  async function handleOpenGenerateRipUrl() {
    try {
      const encoded = await encodeTeam(lastThreeDeadPokemon);
      const shareUrl = buildShareUrl(encoded, {
        showTypes: false,
        tightTypes: false,
        isRip: true,
      });
      const link = document.createElement("a");
      link.href = shareUrl;
      link.target = "_blank";
      link.click();
    } catch (error) {
      console.error("RIP URL generation error:", error);
      setExportError(t(tr.statsBar.failedToGenerateShareUrl, lang));
    }
  }

  const teamActions = [
    {
      icon: "🖼️",
      title: t(tr.statsBar.exportTeamAsPng, lang),
      onClick: handleOpenExportPng,
      disabled: exporting || run.team.length === 0,
    },
    {
      icon: "🔗",
      title: t(tr.statsBar.generateShareableUrl, lang),
      onClick: handleOpenGenerateUrl,
      disabled: run.team.length === 0,
    },
  ];

  const ripActions = [
    {
      icon: "🖼️",
      title: t(tr.statsBar.exportRipAsPng, lang),
      onClick: handleOpenExportRipPng,
      disabled: exporting || deadCount === 0,
    },
    {
      icon: "🔗",
      title: t(tr.statsBar.generateRipShareUrl, lang),
      onClick: handleOpenGenerateRipUrl,
      disabled: deadCount === 0,
    },
  ];

  // RIP hover content (3 last dead pokémons)
  const ripHoverContent = (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          mb: isSoulLink && perPlayerDeaths.length > 0 ? 1.5 : 0,
        }}
      >
        {lastThreeDeadPokemon.map((pokemonCaptured: Capture, index: number) => (
          <TeamPreviewPokemonTile
            key={`rip-${index}-${pokemonCaptured.id}`}
            pokemonCaptured={pokemonCaptured}
            lang={lang}
          />
        ))}
      </Box>
      {/* Soul Link per-player death counts */}
      {isSoulLink && perPlayerDeaths.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0.5,
            borderTop: "1px solid rgba(220,38,38,0.15)",
            pt: 1,
          }}
        >
          {perPlayerDeaths.map(({ player, deaths }) => (
            <Typography
              key={player.id}
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: SOUL_LINK_PLAYER_COLORS[player.playerIndex],
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: SOUL_LINK_PLAYER_COLORS[player.playerIndex],
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              {(
                tr.statsBar.soulLinkDeathsByPlayer[lang] as (
                  n: string,
                  m: number,
                ) => string
              )(player.name, deaths)}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );

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
          {regularZones}/{total}
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
          {shinyZones}/{total}
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
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 6,
          mb: isSoulLink && perPlayerMissed.length > 0 ? 1.5 : 0,
        }}
      >
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
            {displayMissed}
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
      {/* Soul Link per-player missed counts */}
      {isSoulLink && perPlayerMissed.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0.5,
            borderTop: "1px solid rgba(0,0,0,0.1)",
            pt: 1,
          }}
        >
          {perPlayerMissed.map(({ player, missed }) => (
            <Typography
              key={player.id}
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: SOUL_LINK_PLAYER_COLORS[player.playerIndex],
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: SOUL_LINK_PLAYER_COLORS[player.playerIndex],
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              {(
                tr.statsBar.soulLinkMissedByPlayer[lang] as (
                  n: string,
                  m: number,
                ) => string
              )(player.name, missed)}
            </Typography>
          ))}
        </Box>
      )}
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
      {run.team.map((pokemonCaptured: Capture) => (
        <TeamPreviewPokemonTile
          key={pokemonCaptured.pokemon.id}
          pokemonCaptured={pokemonCaptured}
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
          value={`${displayFinished}/${displayTotal}`}
          label={t(tr.statsBar.zones, lang)}
          color="#E3F2FD"
          hoverContent={run.isShinyHuntMode ? zonesHoverContent : undefined}
        />
        <StatCard
          value={displayCaptured}
          label={t(tr.statsBar.caught, lang)}
          color="#E8F5E9"
          hoverContent={captureesHoverContent}
        />
        <StatCard
          value={deadCount}
          label={t(tr.statsBar.dead, lang)}
          color="#FEE2E2"
          subValues={
            isSoulLink && perPlayerDeaths.length > 0
              ? perPlayerDeaths.map(({ player, deaths }) => ({
                  label: player.name,
                  value: deaths,
                  color: SOUL_LINK_PLAYER_COLORS[player.playerIndex],
                }))
              : undefined
          }
          hoverContent={deadCount > 0 ? ripHoverContent : undefined}
          actions={ripActions}
        />
        <StatCard
          value={`${run.team.length}/6`}
          label={t(tr.statsBar.team, lang)}
          color="#fff7e8"
          hoverContent={equipeHoverContent}
          actions={teamActions}
        />
      </Stack>

      {/* Global progress bar: captured (green) + dead (dark) + lost (red) segments */}
      <ZoneProgressBar
        lang={lang}
        total={total}
        captured={capturedZoneCount}
        dead={deadZoneCount}
        lost={lostZoneCount}
      />

      {/* Soul Link: one progress bar per player */}
      {isSoulLink && perPlayerProgress.length > 0 && (
        <Box
          sx={{
            mt: 1.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {perPlayerProgress.map(
            ({ player, capturedCount, deadCount, lostCount, kills }) => (
              <ZoneProgressBar
                key={player.id}
                lang={lang}
                total={total}
                captured={capturedCount}
                dead={deadCount}
                lost={lostCount}
                kills={kills}
                playerName={player.name}
                playerColor={SOUL_LINK_PLAYER_COLORS[player.playerIndex]}
              />
            ),
          )}
        </Box>
      )}

      {/* Export Dialog */}
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
          {exportMode === "png"
            ? t(tr.statsBar.exportPngTitle, lang)
            : t(tr.statsBar.generateShareableUrl, lang)}
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
          {exportMode === "png" && (
            <>
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
            </>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography
              sx={{ fontSize: "0.875rem", color: "#000", fontWeight: 700 }}
            >
              {t(tr.statsBar.showTypesLabel, lang)}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                onClick={() => setDialogShowTypes(true)}
                sx={{
                  flex: 1,
                  border: "2px solid #000",
                  borderRadius: "0.75rem",
                  color: "#000",
                  background: dialogShowTypes ? "#bfdbfe" : "#fff",
                  fontWeight: 700,
                  textTransform: "none",
                }}
              >
                {t(tr.statsBar.yes, lang)}
              </Button>
              <Button
                onClick={() => {
                  setDialogShowTypes(false);
                  setDialogTightTypes(false);
                }}
                sx={{
                  flex: 1,
                  border: "2px solid #000",
                  borderRadius: "0.75rem",
                  color: "#000",
                  background: !dialogShowTypes ? "#fecaca" : "#fff",
                  fontWeight: 700,
                  textTransform: "none",
                }}
              >
                {t(tr.statsBar.no, lang)}
              </Button>
            </Box>
          </Box>

          {dialogShowTypes && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Typography
                sx={{ fontSize: "0.875rem", color: "#000", fontWeight: 700 }}
              >
                {t(tr.statsBar.tightTypesLabel, lang)}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  onClick={() => setDialogTightTypes(true)}
                  sx={{
                    flex: 1,
                    border: "2px solid #000",
                    borderRadius: "0.75rem",
                    color: "#000",
                    background: dialogTightTypes ? "#bfdbfe" : "#fff",
                    fontWeight: 700,
                    textTransform: "none",
                  }}
                >
                  {t(tr.statsBar.yes, lang)}
                </Button>
                <Button
                  onClick={() => setDialogTightTypes(false)}
                  sx={{
                    flex: 1,
                    border: "2px solid #000",
                    borderRadius: "0.75rem",
                    color: "#000",
                    background: !dialogTightTypes ? "#fecaca" : "#fff",
                    fontWeight: 700,
                    textTransform: "none",
                  }}
                >
                  {t(tr.statsBar.no, lang)}
                </Button>
              </Box>
            </Box>
          )}

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
            onClick={
              exportMode === "png" ? performExportPng : performGenerateUrl
            }
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
            {exportMode === "png"
              ? exporting
                ? t(tr.statsBar.exporting, lang)
                : t(tr.statsBar.export, lang)
              : t(tr.statsBar.generate, lang)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
