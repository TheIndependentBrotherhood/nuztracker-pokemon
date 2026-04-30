"use client";

import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { Run } from "@/lib/types";
import { encodeTeam, buildShareUrl } from "@/lib/share";

interface Props {
  run: Run;
  teamViewId: string;
}

export default function ExportPanel({ run, teamViewId }: Props) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  /**
   * Ensure all images in the DOM are loaded and CORS-safe before capturing
   * Replaces images with fallback colors if they fail to load
   */
  async function preloadImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll("img");
    const loadPromises: Promise<void>[] = [];

    images.forEach((img) => {
      const loadPromise = new Promise<void>((resolve) => {
        // Skip if already loaded and has natural dimensions
        if (img.complete && img.naturalHeight > 0) {
          resolve();
          return;
        }

        // Set CORS attribute for cross-origin images
        img.crossOrigin = "anonymous";

        // Handle success
        const onLoad = () => {
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
          resolve();
        };

        // Handle error with fallback
        const onError = () => {
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
          console.warn(`Failed to load image: ${img.src}, using fallback`);

          // Create fallback: solid color based on alt text
          const typeColorMap: Record<string, string> = {
            normal: "#A8A878",
            fire: "#F08030",
            water: "#6890F0",
            electric: "#F8D030",
            grass: "#78C850",
            ice: "#98D8D8",
            fighting: "#C03028",
            poison: "#A040A0",
            ground: "#E0C068",
            flying: "#A890F0",
            psychic: "#F85888",
            bug: "#A8B820",
            rock: "#B8A038",
            ghost: "#705898",
            dragon: "#7038F8",
            dark: "#705848",
            steel: "#B8B8D0",
            fairy: "#EE99AC",
          };

          const typeMatch = img.alt?.toLowerCase();
          const bgColor = typeColorMap[typeMatch] || "#808080";

          img.style.backgroundColor = bgColor;
          img.style.objectFit = "contain";
          img.style.opacity = "0.5";

          resolve();
        };

        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);

        // Retry loading with explicit trigger
        img.src = img.src;
      });

      loadPromises.push(loadPromise);
    });

    // Wait for all images to load or fail gracefully
    await Promise.all(loadPromises);
  }

  async function handleExportPng() {
    setExporting(true);
    setExportError("");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = document.getElementById(teamViewId);

      if (!el) {
        setExportError("Export element not found");
        return;
      }

      // Preload and setup images for CORS
      await preloadImages(el);

      // Capture with CORS-safe options
      const canvas = await html2canvas(el, {
        backgroundColor: "#FEF3E2",
        scale: 2,
        useCORS: true, // Enable CORS image loading
        allowTaint: true, // Allow tainted canvas (fallback)
        logging: false, // Reduce console noise
        imageTimeout: 5000, // Wait up to 5s for images
        onclone: (clonedDocument) => {
          // Ensure all cloned images have crossOrigin set
          const clonedImages = clonedDocument.querySelectorAll("img");
          clonedImages.forEach((img) => {
            img.crossOrigin = "anonymous";
          });
        },
      });

      // Export PNG
      const link = document.createElement("a");
      link.download = `${run.gameName}-team.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setExportError(`Export failed: ${message}`);
      console.error("PNG export error:", error);
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateUrl() {
    if (run.team.length === 0) return;
    const base64 = await encodeTeam(run.team);
    const url = buildShareUrl(base64, { showTypes: true, showLevels: true });
    const full = `${window.location.origin}${url}`;
    setShareUrl(full);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Box
      sx={{
        background: "linear-gradient(to right, #fef3c7, #fed7aa)",
        borderRadius: "1rem",
        p: 2,
        border: "2px solid #000",
      }}
    >
      <Typography sx={{ fontWeight: 700, color: "#000", mb: 1.5 }}>
        📤 Export &amp; Share
      </Typography>

      {/* Error message */}
      {exportError && (
        <Box
          sx={{
            mb: 1.5,
            p: 1.5,
            background: "#fee2e2",
            border: "2px solid #ef4444",
            borderRadius: "0.75rem",
            color: "#7f1d1d",
            fontSize: "0.875rem",
            fontWeight: 700,
          }}
        >
          ⚠️ {exportError}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
        <Button
          onClick={handleExportPng}
          disabled={exporting || run.team.length === 0}
          title={
            run.team.length === 0
              ? "Add Pokémon to team first"
              : "Export team as PNG (1280x720)"
          }
          sx={{
            background: "#3b82f6",
            color: "#fff",
            px: 2,
            py: 1,
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            border: "2px solid #000",
            transition: "all 300ms ease",
            "&:hover": {
              background: "#2563eb",
            },
            "&:disabled": {
              opacity: 0.5,
              cursor: "not-allowed",
            },
            "&:active": {
              transform: "translateY(2px)",
            },
          }}
        >
          {exporting ? "⏳ Exporting..." : "🖼 Export PNG"}
        </Button>
        <Button
          onClick={handleGenerateUrl}
          disabled={run.team.length === 0}
          title={
            run.team.length === 0
              ? "Add Pokémon to team first"
              : "Generate shareable URL (gzip+base64)"
          }
          sx={{
            background: "#a855f7",
            color: "#fff",
            px: 2,
            py: 1,
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            border: "2px solid #000",
            transition: "all 300ms ease",
            "&:hover": {
              background: "#9333ea",
            },
            "&:disabled": {
              opacity: 0.5,
              cursor: "not-allowed",
            },
            "&:active": {
              transform: "translateY(2px)",
            },
          }}
        >
          🔗 Generate Share URL
        </Button>
      </Box>

      {shareUrl && (
        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          <TextField
            fullWidth
            value={shareUrl}
            slotProps={{ input: { readOnly: true } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "#fff",
                border: "2px solid #000",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "#000",
                "& fieldset": {
                  border: "none",
                },
              },
            }}
          />
          <Button
            onClick={handleCopy}
            aria-label={copied ? "Copied!" : "Copy share URL to clipboard"}
            sx={{
              background: "#4b5563",
              color: "#fff",
              px: 1.5,
              py: 0.75,
              borderRadius: "0.25rem",
              fontSize: "0.875rem",
              transition: "all 300ms ease",
              "&:hover": {
                background: "#3d4654",
              },
            }}
          >
            {copied ? "✓" : "📋"}
          </Button>
        </Box>
      )}

      {/* Info message */}
      <Typography sx={{ mt: 1.5, fontSize: "0.75rem", color: "#6b7280" }}>
        💡 <strong>Note:</strong> PNG export works best with local sprites. If
        sprites don&apos;t appear, they&apos;ll show as colored placeholders.
      </Typography>
    </Box>
  );
}
