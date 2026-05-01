"use client";

import { useState, useEffect } from "react";
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
import { regions, loadRegions, type Region } from "@/lib/zones";
import { RandomizerOptions } from "@/lib/types";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextField from "@/components/ui/StyledTextField";
import StyledSelect from "@/components/ui/StyledSelect";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  onClose: () => void;
}

export default function CreateRunModal({ onClose }: Props) {
  const { createRun } = useRunStore();
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = translations;

  const [gameName, setGameName] = useState("");
  const [region, setRegion] = useState("kanto");
  const [typeChartGeneration, setTypeChartGeneration] = useState<
    "gen1" | "gen2-5" | "gen6+"
  >("gen6+");
  const [isShinyHuntMode, setIsShinyHuntMode] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [loadedRegions, setLoadedRegions] = useState<Region[]>(regions);

  useEffect(() => {
    loadRegions().then((r) => {
      setLoadedRegions(r);
    });
  }, []);

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

  const handleRegionChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | (Event & { target: { value: unknown; name: string } }),
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (e.target as any).value;
    setRegion(value as string);
  };

  const handleTypeChartGenerationChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | (Event & { target: { value: unknown; name: string } }),
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (e.target as any).value;
    setTypeChartGeneration(value as "gen1" | "gen2-5" | "gen6+");
  };

  function handleCreate() {
    if (!gameName.trim()) return;
    const run = createRun({
      gameName: gameName.trim(),
      region,
      typeChartGeneration,
      isShinyHuntMode,
      isRandomMode,
      randomizerOptions: isRandomMode ? randomizerOptions : undefined,
    });
    onClose();
    router.push(`/run/?id=${run.id}`);
  }

  const randomizerOptionsList = [
    { key: "randomizeTypes", label: t(tr.createRun.randomizeTypes, lang) },
    { key: "randomizeAbilities", label: t(tr.createRun.randomizeAbilities, lang) },
    { key: "randomizeEncounters", label: t(tr.createRun.randomizeEncounters, lang) },
    { key: "randomizeEvolvedForms", label: t(tr.createRun.randomizeEvolvedForms, lang) },
  ];

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
        {t(tr.createRun.title, lang)}
      </DialogTitle>

      <DialogContent sx={{ pb: 3, pt: 2 }}>
        <Stack spacing={3}>
          {/* Subtitle */}
          <Typography
            sx={{ color: "#666", fontSize: "0.95rem", fontWeight: 500 }}
          >
            {t(tr.createRun.subtitle, lang)}
          </Typography>

          {/* Game Name */}
          <StyledTextField
            autoFocus
            label={t(tr.createRun.runName, lang)}
            placeholder={t(tr.createRun.runNamePlaceholder, lang)}
            fullWidth
            value={gameName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGameName(e.target.value.substring(0, 64))
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === "Enter" && handleCreate()
            }
            helperText={`${gameName.length}/64 caractères`}
          />

          {/* Region Select */}
          <StyledSelect
            label={t(tr.createRun.region, lang)}
            value={region}
            onChange={handleRegionChange}
            fullWidth
          >
            {loadedRegions.map((r: Region) => (
              <MenuItem key={r.id} value={r.id}>
                {(lang === "fr" ? r.names?.fr : r.names?.en) ?? r.name}
              </MenuItem>
            ))}
          </StyledSelect>

          {/* Type Chart Generation Select */}
          <StyledSelect
            label={t(tr.createRun.typeChart, lang)}
            value={typeChartGeneration}
            onChange={handleTypeChartGenerationChange}
            fullWidth
          >
            <MenuItem value="gen1">{t(tr.createRun.gen1, lang)}</MenuItem>
            <MenuItem value="gen2-5">{t(tr.createRun.gen25, lang)}</MenuItem>
            <MenuItem value="gen6+">{t(tr.createRun.gen6, lang)}</MenuItem>
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
              {t(tr.createRun.gameModes, lang)}
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={isShinyHuntMode}
                  onChange={(e) => setIsShinyHuntMode(e.target.checked)}
                />
              }
              label={t(tr.createRun.shinyHuntMode, lang)}
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
              label={t(tr.createRun.randomizerMode, lang)}
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
                {t(tr.createRun.randomizerOptions, lang)}
              </Typography>

              <Stack spacing={1}>
                {randomizerOptionsList.map(({ key, label }) => (
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
          {t(tr.createRun.cancel, lang)}
        </StyledButton>
        <StyledButton
          onClick={handleCreate}
          disabled={!gameName.trim()}
          variant="primary"
          shape="pill"
          sx={{ flexGrow: 1 }}
        >
          {t(tr.createRun.createRun, lang)}
        </StyledButton>
      </DialogActions>
    </Dialog>
  );
}
