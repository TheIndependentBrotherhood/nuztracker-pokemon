import { useState } from "react";
import { Box, Button, TextField, Tooltip, IconButton } from "@mui/material";
import { Capture } from "@/lib/types";
import PokemonDetailModal from "./PokemonDetailModal";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import { useWindowSize } from "@/hooks/useWindowSize";
import { useCaptureDisplayNames } from "@/lib/pokemon-display";

interface Props {
  pokemonCaptured: Capture;
  runId?: string;
  allCaptures?: Capture[];
  onClose: () => void;
}

export default function AdvancedComparisonModal({
  pokemonCaptured,
  runId,
  allCaptures = [],
  onClose,
}: Props) {
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedCaptureLeft, setSelectedCaptureLeft] =
    useState(pokemonCaptured);
  const [selectedCaptureRight, setSelectedCaptureRight] =
    useState<Capture | null>(null);
  const [showLeftSearch, setShowLeftSearch] = useState(false);
  const [leftSearchQuery, setLeftSearchQuery] = useState("");
  const [showRightSearch, setShowRightSearch] = useState(false);
  const [rightSearchQuery, setRightSearchQuery] = useState("");

  const windowSize = useWindowSize();
  const canUseAdvancedMode = windowSize.width >= 1500;
  const { lang } = useLanguage();
  const tr = translations;

  // Use custom hook to get all display names at once
  const captureDisplayNames = useCaptureDisplayNames(allCaptures, lang);

  // Build search results for both sides
  const getFilteredCaptures = (query: string) => {
    if (!query.trim()) return [];
    const queryLower = query.toLowerCase();
    return allCaptures.filter((capture) => {
      const name = captureDisplayNames[capture.id].toLowerCase();
      const id = capture.pokemon.id.toString();
      return name.includes(queryLower) || id.includes(queryLower);
    });
  };

  const leftSearchResults = getFilteredCaptures(leftSearchQuery);
  const rightSearchResults = getFilteredCaptures(rightSearchQuery);

  const handleExitAdvancedMode = () => {
    setAdvancedMode(false);
    setSelectedCaptureRight(null);
    setRightSearchQuery("");
  };

  if (!advancedMode || !canUseAdvancedMode) {
    return (
      <PokemonDetailModal
        pokemonCaptured={pokemonCaptured}
        runId={runId}
        onClose={onClose}
        advancedModeButtonEnabled={canUseAdvancedMode}
        onEnterAdvancedMode={() => setAdvancedMode(true)}
      />
    );
  }

  // Advanced mode: two-column layout
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          background: "#FEF3E2",
          borderRadius: "1.5rem",
          p: 3,
          width: "100%",
          maxWidth: "1300px",
          border: "3px solid #000",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "slideUp 300ms ease",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#000" }}>
            {t(tr.pokemonDetail.advancedComparison, lang)}
          </Box>
          <Button
            onClick={handleExitAdvancedMode}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              px: 1.5,
              py: 0.5,
              background: "#fff",
              border: "2px solid #000",
              color: "#000",
              "&:hover": {
                background: "#f0f0f0",
              },
            }}
          >
            {t(tr.pokemonDetail.exitAdvancedMode, lang)}
          </Button>
        </Box>

        {/* Two-column layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
          }}
        >
          {/* Left: First pokémon with change option */}
          <Box>
            {!showLeftSearch && (
              <Button
                onClick={() => setShowLeftSearch(true)}
                size="small"
                sx={{
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  background: "#fff",
                  border: "2px solid #000",
                  color: "#000",
                  mb: 1,
                  "&:hover": {
                    background: "#f0f0f0",
                  },
                }}
              >
                {t(tr.pokemonDetail.changeSecondPokemon, lang)}
              </Button>
            )}
            {showLeftSearch && (
              <>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={t(tr.pokemonDetail.searchPokemon, lang)}
                    value={leftSearchQuery}
                    onChange={(e) => setLeftSearchQuery(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "#fff",
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                  <Button
                    onClick={() => {
                      setShowLeftSearch(false);
                      setLeftSearchQuery("");
                    }}
                    size="small"
                    sx={{
                      textTransform: "none",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      px: 1,
                      background: "#fff",
                      border: "2px solid #000",
                      color: "#000",
                      "&:hover": {
                        background: "#f0f0f0",
                      },
                    }}
                  >
                    {t(tr.pokemonDetail.exitAdvancedMode, lang)}
                  </Button>
                </Box>
                {leftSearchResults.length > 0 && (
                  <Box
                    sx={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      mb: 1,
                    }}
                  >
                    {leftSearchResults.map((capture) => (
                      <Box
                        key={capture.id}
                        component="button"
                        onClick={() => {
                          setSelectedCaptureLeft(capture);
                          setShowLeftSearch(false);
                          setLeftSearchQuery("");
                        }}
                        sx={{
                          width: "100%",
                          p: 1,
                          textAlign: "left",
                          background: "#fff",
                          border: "none",
                          borderBottom: "1px solid #f0f0f0",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          "&:hover": {
                            background: "#f9fafb",
                          },
                        }}
                      >
                        #{capture.pokemon.id} {captureDisplayNames[capture.id]}
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
            <Box sx={{ maxHeight: "calc(90vh - 200px)", overflowY: "auto" }}>
              <PokemonDetailModal
                pokemonCaptured={selectedCaptureLeft}
                runId={runId}
                onClose={() => {}} // Don't close when clicking inside
                hiddenInAdvancedMode
              />
            </Box>
          </Box>

          {/* Right: Search or second pokemon */}
          <Box>
            {!selectedCaptureRight && !showRightSearch && (
              <Button
                onClick={() => setShowRightSearch(true)}
                size="small"
                sx={{
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  background: "#fff",
                  border: "2px solid #000",
                  color: "#000",
                  mb: 1,
                  "&:hover": {
                    background: "#f0f0f0",
                  },
                }}
              >
                {t(tr.pokemonDetail.selectSecondPokemon, lang)}
              </Button>
            )}
            {showRightSearch && (
              <>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={t(tr.pokemonDetail.searchPokemon, lang)}
                    value={rightSearchQuery}
                    onChange={(e) => setRightSearchQuery(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "#fff",
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                  <Button
                    onClick={() => {
                      setShowRightSearch(false);
                      setRightSearchQuery("");
                    }}
                    size="small"
                    sx={{
                      textTransform: "none",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      px: 1,
                      background: "#fff",
                      border: "2px solid #000",
                      color: "#000",
                      "&:hover": {
                        background: "#f0f0f0",
                      },
                    }}
                  >
                    {t(tr.pokemonDetail.exitAdvancedMode, lang)}
                  </Button>
                </Box>
                {rightSearchResults.length > 0 && (
                  <Box
                    sx={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      mb: 1,
                    }}
                  >
                    {rightSearchResults.map((capture) => (
                      <Box
                        key={capture.id}
                        component="button"
                        onClick={() => {
                          setSelectedCaptureRight(capture);
                          setShowRightSearch(false);
                          setRightSearchQuery("");
                        }}
                        sx={{
                          width: "100%",
                          p: 1,
                          textAlign: "left",
                          background: "#fff",
                          border: "none",
                          borderBottom: "1px solid #f0f0f0",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          "&:hover": {
                            background: "#f9fafb",
                          },
                        }}
                      >
                        #{capture.pokemon.id} {captureDisplayNames[capture.id]}
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
            {selectedCaptureRight && (
              <>
                <Button
                  onClick={() => {
                    setSelectedCaptureRight(null);
                    setShowRightSearch(true);
                    setRightSearchQuery("");
                  }}
                  size="small"
                  sx={{
                    textTransform: "none",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    px: 1.5,
                    py: 0.5,
                    background: "#fff",
                    border: "2px solid #000",
                    color: "#000",
                    mb: 1,
                    "&:hover": {
                      background: "#f0f0f0",
                    },
                  }}
                >
                  {t(tr.pokemonDetail.changeSecondPokemon, lang)}
                </Button>
                <Box
                  sx={{ maxHeight: "calc(90vh - 200px)", overflowY: "auto" }}
                >
                  <PokemonDetailModal
                    pokemonCaptured={selectedCaptureRight}
                    runId={runId}
                    onClose={() => {}} // Don't close when clicking inside
                    hiddenInAdvancedMode
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* Footer */}
        <Button
          onClick={onClose}
          fullWidth
          sx={{
            mt: 2,
            background: "#e5e5e5",
            color: "#000",
            py: 1.5,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "none",
            transition: "all 200ms",
            border: "2px solid #000",
            "&:hover": {
              background: "#ccc",
              color: "#000",
            },
          }}
        >
          {t(tr.pokemonDetail.close, lang)}
        </Button>
      </Box>
    </Box>
  );
}
