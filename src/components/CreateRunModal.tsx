"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { useRouter } from "next/navigation";
import { regions } from "@/lib/zones";
import { RandomizerOptions } from "@/lib/types";

interface Props {
  onClose: () => void;
}

export default function CreateRunModal({ onClose }: Props) {
  const { createRun } = useRunStore();
  const router = useRouter();

  const [gameName, setGameName] = useState("");
  const [region, setRegion] = useState("kanto");
  const [isShinyHuntMode, setIsShinyHuntMode] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);

  const [randomizerOptions, setRandomizerOptions] = useState<RandomizerOptions>(
    {
      randomizeTypes: true,
      randomizeAbilities: false,
      randomizeEncounters: false,
      randomizeEvolvedForms: false,
    },
  );

  function toggleRandomizerOption<K extends keyof RandomizerOptions>(key: K) {
    setRandomizerOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleCreate() {
    if (!gameName.trim()) return;
    const run = createRun({
      gameName: gameName.trim(),
      region,
      isShinyHuntMode,
      isRandomMode,
      randomizerOptions: isRandomMode ? randomizerOptions : undefined,
    });
    onClose();
    router.push(`/run/?id=${run.id}`);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: "#FEF3E2",
            border: "3px solid #000",
            borderRadius: "1.5rem",
            boxShadow: "0 20px 25px rgba(0, 0, 0, 0.2)",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 900,
          fontSize: "1.5rem",
          color: "#000",
          pb: 1,
        }}
      >
        🎮 Nouveau Run
      </DialogTitle>

      <DialogContent sx={{ pb: 3, pt: 2 }}>
        <Stack spacing={3}>
          {/* Subtitle */}
          <Typography
            sx={{ color: "#666", fontSize: "0.95rem", fontWeight: 500 }}
          >
            Créez votre aventure Nuzlocke et lancez le défi
          </Typography>

          {/* Game Name */}
          <TextField
            autoFocus
            label="Nom du Run"
            placeholder="ex. FireRed Nuzlocke"
            fullWidth
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "1.5rem",
                backgroundColor: "#fff",
                border: "2px solid #000",
                "& fieldset": { border: "none" },
                "&:hover": { backgroundColor: "#fff" },
                "&.Mui-focused": {
                  backgroundColor: "#fff",
                  "& fieldset": { border: "none" },
                },
              },
              "& .MuiOutlinedInput-input": {
                color: "#000",
                fontWeight: 500,
                padding: "16.5px 14px",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#aaa",
                opacity: 1,
                paddingLeft: "2px",
                marginY: "2px",
              },
              "& .MuiInputLabel-root": {
                color: "#666",
                fontWeight: 600,
                paddingLeft: "2px",
                marginY: "2px",
                "&.Mui-focused": {
                  color: "#000",
                  transform: "translate(14px, -17px) scale(0.75)",
                },
                "&.MuiInputLabel-shrink": {
                  transform: "translate(14px, -17px) scale(0.75)",
                },
              },
            }}
          />

          {/* Region Select */}
          <Select
            label="Région"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            fullWidth
            sx={{
              borderRadius: "1.5rem",
              backgroundColor: "#fff",
              border: "2px solid #000",
              color: "#000",
              fontWeight: 600,
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              "& svg": { color: "#000" },
              "& .MuiInputLabel-root": {
                color: "#666",
                fontWeight: 600,
                "&.Mui-focused": {
                  color: "#000",
                },
              },
            }}
          >
            {regions.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} — {r.game}
              </MenuItem>
            ))}
          </Select>

          {/* Toggles */}
          <Stack spacing={1}>
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#000",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ Modes de Jeu
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={isShinyHuntMode}
                  onChange={(e) => setIsShinyHuntMode(e.target.checked)}
                />
              }
              label="✨ Mode Shiny Hunt"
              sx={{
                color: "#000",
                fontWeight: 600,
                p: 1.5,
                border: "2px solid #000",
                borderRadius: "1rem",
                m: 0,
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isRandomMode}
                  onChange={(e) => setIsRandomMode(e.target.checked)}
                />
              }
              label="🎲 Mode Randomizer"
              sx={{
                color: "#000",
                fontWeight: 600,
                p: 1.5,
                border: "2px solid #000",
                borderRadius: "1rem",
                m: 0,
              }}
            />
          </Stack>

          {/* Randomizer Options */}
          {isRandomMode && (
            <Box
              sx={{
                background: "linear-gradient(135deg, #F3E5F5 0%, #FCE4EC 100%)",
                border: "2px solid #8b5cf6",
                borderRadius: "1rem",
                p: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#8b5cf6",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  mb: 2,
                }}
              >
                🎛️ Options Randomizer
              </Typography>

              <Stack spacing={1}>
                {[
                  { key: "randomizeTypes", label: "Types aléatoires" },
                  { key: "randomizeAbilities", label: "Talents aléatoires" },
                  {
                    key: "randomizeEncounters",
                    label: "Rencontres aléatoires",
                  },
                  {
                    key: "randomizeEvolvedForms",
                    label: "Évolutions aléatoires",
                  },
                ].map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={
                          randomizerOptions[key as keyof RandomizerOptions]
                        }
                        onChange={() =>
                          toggleRandomizerOption(key as keyof RandomizerOptions)
                        }
                        size="small"
                      />
                    }
                    label={label}
                    sx={{ color: "#000", fontWeight: 500, m: 0 }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            border: "2px solid #000",
            color: "#000",
            fontWeight: 700,
            borderRadius: "2rem",
            textTransform: "none",
            flexGrow: 1,
            py: 1.2,
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!gameName.trim()}
          variant="contained"
          sx={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "3px solid #000",
            color: "#fff",
            fontWeight: 700,
            borderRadius: "2rem",
            textTransform: "none",
            flexGrow: 1,
            py: 1.2,
            boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.3)",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translate(-2px, -2px)",
              boxShadow: "6px 6px 0 rgba(0, 0, 0, 0.4)",
            },
            "&:disabled": {
              opacity: 0.5,
              cursor: "not-allowed",
            },
          }}
        >
          🚀 Démarrer !
        </Button>
      </DialogActions>
    </Dialog>
  );
}
