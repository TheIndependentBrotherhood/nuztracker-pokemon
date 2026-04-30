"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Button,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import {
  searchPokemon,
  getPokemonIdFromUrl,
  getSpriteUrl,
} from "@/lib/pokemon-api";
import { Capture } from "@/lib/types";

interface Props {
  runId: string;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

export default function AddCaptureModal({
  runId,
  zoneId,
  zoneName,
  onClose,
}: Props) {
  const { addCapture } = useRunStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; url: string }>>(
    [],
  );
  const [selected, setSelected] = useState<{ name: string; id: number } | null>(
    null,
  );
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState(5);
  const [gender, setGender] = useState<Capture["gender"]>("unknown");
  const [isShiny, setIsShiny] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (query.length < 2) {
        if (!cancelled) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      if (!cancelled) {
        setSearching(true);
      }

      const r = await searchPokemon(query);

      if (cancelled) return;

      setResults(r);
      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query]);

  async function handleSelect(item: { name: string; url: string }) {
    const id = getPokemonIdFromUrl(item.url);
    setSelected({ name: item.name, id });
    setQuery(item.name);
    setResults([]);
  }

  function handleAdd() {
    if (!selected) return;
    addCapture(runId, zoneId, {
      pokemonId: selected.id,
      pokemonName: selected.name,
      nickname: nickname || undefined,
      level,
      gender,
      isShiny,
    });
    onClose();
  }

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
        animation: "fadeIn 300ms ease",
        "@keyframes fadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          background: "#1e293b",
          borderRadius: "1rem",
          p: 3,
          width: "100%",
          maxWidth: "448px",
          border: "1px solid rgba(71, 85, 105, 0.6)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          animation: "slideUp 300ms ease",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}
          >
            Ajouter une capture
          </Typography>
          <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem", mt: 0.25 }}>
            📍 {zoneName}
          </Typography>
        </Box>

        {/* Pokemon search */}
        <Box sx={{ position: "relative", mb: 2 }}>
          <Typography
            component="label"
            sx={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#94a3b8",
              mb: 1.5,
            }}
          >
            Pokémon
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              placeholder="Rechercher un Pokémon..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  "& fieldset": {
                    borderColor: "#475569",
                  },
                  "&:hover fieldset": {
                    borderColor: "#475569",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.2)",
                  },
                },
                "& .MuiOutlinedInput-input::placeholder": {
                  color: "#64748b",
                  opacity: 1,
                },
              }}
            />
            {selected && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getSpriteUrl(selected.id, isShiny)}
                alt={`${isShiny ? "Shiny " : ""}${selected.name} sprite`}
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                }}
              />
            )}
          </Box>
          {results.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "0.75rem",
                mt: 0.5,
                maxHeight: "192px",
                overflowY: "auto",
                zIndex: 10,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
            >
              {results.map((r) => (
                <Box
                  key={r.url}
                  component="button"
                  onClick={() => handleSelect(r)}
                  sx={{
                    width: "100%",
                    textAlign: "left",
                    px: 1.5,
                    py: 1,
                    background: "transparent",
                    border: "none",
                    fontSize: "0.875rem",
                    textTransform: "capitalize",
                    color: "#cbd5e1",
                    cursor: "pointer",
                    transition: "background-color 200ms",
                    "&:hover": {
                      background: "rgba(71, 85, 105, 0.6)",
                    },
                    "&:first-of-type": {
                      borderTopLeftRadius: "0.75rem",
                      borderTopRightRadius: "0.75rem",
                    },
                    "&:last-of-type": {
                      borderBottomLeftRadius: "0.75rem",
                      borderBottomRightRadius: "0.75rem",
                    },
                  }}
                >
                  {r.name}
                </Box>
              ))}
            </Box>
          )}
          {searching && (
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.5 }}>
              Recherche...
            </Typography>
          )}
        </Box>

        {/* Nickname */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            component="label"
            sx={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#94a3b8",
              mb: 1.5,
            }}
          >
            Surnom (optionnel)
          </Typography>
          <TextField
            fullWidth
            placeholder="Entrez un surnom..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "rgba(15, 23, 42, 0.6)",
                color: "#fff",
                fontSize: "0.875rem",
                "& fieldset": {
                  borderColor: "#475569",
                },
                "&:hover fieldset": {
                  borderColor: "#475569",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.2)",
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                color: "#64748b",
                opacity: 1,
              },
            }}
          />
        </Box>

        {/* Level & Gender */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              component="label"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#94a3b8",
                mb: 1.5,
              }}
            >
              Niveau
            </Typography>
            <TextField
              fullWidth
              type="number"
              inputProps={{ min: 1, max: 100 }}
              value={level}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setLevel(isNaN(val) ? 1 : Math.min(100, Math.max(1, val)));
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  "& fieldset": {
                    borderColor: "#475569",
                  },
                  "&:hover fieldset": {
                    borderColor: "#475569",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.2)",
                  },
                },
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              component="label"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#94a3b8",
                mb: 1.5,
              }}
            >
              Genre
            </Typography>
            <Select
              fullWidth
              value={gender}
              onChange={(e) => setGender(e.target.value as Capture["gender"])}
              sx={{
                background: "rgba(15, 23, 42, 0.6)",
                color: "#fff",
                fontSize: "0.875rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#475569",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#475569",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.2)",
                },
                "& .MuiSvgIcon-root": {
                  color: "#cbd5e1",
                },
              }}
            >
              <MenuItem value="unknown">Inconnu</MenuItem>
              <MenuItem value="male">Mâle ♂</MenuItem>
              <MenuItem value="female">Femelle ♀</MenuItem>
            </Select>
          </Box>
        </Box>

        {/* Shiny toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={isShiny}
              onChange={(e) => setIsShiny(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase": {
                  color: "#475569",
                  "&.Mui-checked": {
                    color: "#3b82f6",
                  },
                },
                "& .MuiSwitch-track": {
                  background: "#475569",
                },
              }}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.875rem", color: "#cbd5e1" }}>
              ✨ Est Shiny ?
            </Typography>
          }
          sx={{ mb: 2.5, ml: 0 }}
        />

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            onClick={onClose}
            sx={{
              flex: 1,
              background: "#475569",
              color: "#cbd5e1",
              py: 1.5,
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "none",
              transition: "all 200ms",
              "&:hover": {
                background: "#64748b",
                color: "#fff",
              },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selected}
            sx={{
              flex: 1,
              background: "linear-gradient(to right, #3b82f6, #1d4ed8)",
              color: "#fff",
              py: 1.5,
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              textTransform: "none",
              transition: "all 200ms",
              boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.2)",
              "&:hover": {
                boxShadow: "0 15px 25px -5px rgba(59, 130, 246, 0.3)",
              },
              "&:disabled": {
                opacity: 0.4,
                cursor: "not-allowed",
                boxShadow: "none",
              },
            }}
          >
            Ajouter
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
