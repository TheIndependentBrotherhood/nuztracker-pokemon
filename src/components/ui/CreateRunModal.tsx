"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { useRouter } from "next/navigation";
import { regions } from "@/lib/zones";
import { RandomizerOptions } from "@/lib/types";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextField from "@/components/ui/StyledTextField";
import StyledSelect from "@/components/ui/StyledSelect";

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
    setRandomizerOptions((prev: RandomizerOptions) => ({
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
          <StyledTextField
            autoFocus
            label="Nom du Run"
            placeholder="ex. FireRed Nuzlocke"
            fullWidth
            value={gameName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGameName(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === "Enter" && handleCreate()
            }
          />

          {/* Region Select */}
          <StyledSelect
            label="Région"
            value={region}
            onChange={(e: any) => setRegion(e.target.value)}
            fullWidth
          >
            {regions.map((r: any) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} — {r.game}
              </MenuItem>
            ))}
          </StyledSelect>

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
        <StyledButton
          onClick={onClose}
          variant="secondary"
          sx={{ flexGrow: 1 }}
        >
          Annuler
        </StyledButton>
        <StyledButton
          onClick={handleCreate}
          disabled={!gameName.trim()}
          variant="primary"
          shape="pill"
          sx={{ flexGrow: 1 }}
        >
          🚀 Créer le Run
        </StyledButton>
      </DialogActions>
    </Dialog>
  );
}
