"use client";

import { useState } from "react";
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
        backgroundColor: "#1f2937",
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
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mt-4">
      <h3 className="font-bold text-white mb-3">Export &amp; Share</h3>

      {/* Error message */}
      {exportError && (
        <div className="mb-3 p-2 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
          ⚠️ {exportError}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleExportPng}
          disabled={exporting || run.team.length === 0}
          title={
            run.team.length === 0
              ? "Add Pokémon to team first"
              : "Export team as PNG (1280x720)"
          }
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? "⏳ Exporting..." : "🖼 Export PNG"}
        </button>
        <button
          onClick={handleGenerateUrl}
          disabled={run.team.length === 0}
          title={
            run.team.length === 0
              ? "Add Pokémon to team first"
              : "Generate shareable URL (gzip+base64)"
          }
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔗 Generate Share URL
        </button>
      </div>

      {shareUrl && (
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
            value={shareUrl}
            readOnly
          />
          <button
            onClick={handleCopy}
            aria-label={copied ? "Copied!" : "Copy share URL to clipboard"}
            className="bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-sm transition-colors"
          >
            {copied ? "✓" : "📋"}
          </button>
        </div>
      )}

      {/* Info message */}
      <p className="mt-3 text-xs text-gray-400">
        💡 <strong>Note:</strong> PNG export works best with local sprites. If
        sprites don't appear, they'll show as colored placeholders.
      </p>
    </div>
  );
}
