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
  IconButton,
} from "@mui/material";
import { useRunStore } from "@/store/runStore";
import { useRouter } from "next/navigation";
import { regions, loadRegions, type Region } from "@/lib/zones";
import { RandomizerOptions, SoulLinkPlayer, SOUL_LINK_PLAYER_COLORS } from "@/lib/types";
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
  const [isSoulLinkMode, setIsSoulLinkMode] = useState(false);
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [player3Name, setPlayer3Name] = useState<string | null>(null);
  const [player4Name, setPlayer4Name] = useState<string | null>(null);
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

  const soulLinkValid =
    !isSoulLinkMode || (player1Name.trim() && player2Name.trim());

  function buildSoulLinkPlayers(): SoulLinkPlayer[] {
    const players: SoulLinkPlayer[] = [
      { id: "p1", name: player1Name.trim(), playerIndex: 0 },
      { id: "p2", name: player2Name.trim(), playerIndex: 1 },
    ];
    if (player3Name !== null) {
      players.push({
        id: "p3",
        name: player3Name.trim() || "P3",
        playerIndex: 2,
      });
    }
    if (player4Name !== null) {
      players.push({
        id: "p4",
        name: player4Name.trim() || "P4",
        playerIndex: 3,
      });
    }
    return players;
  }

  function handleCreate() {
    if (!gameName.trim()) return;
    if (!soulLinkValid) return;
    const run = createRun({
      gameName: gameName.trim(),
      region,
      typeChartGeneration,
      isShinyHuntMode,
      isRandomMode,
      randomizerOptions: isRandomMode ? randomizerOptions : undefined,
      ...(isSoulLinkMode
        ? { isSoulLinkMode: true, soulLinkPlayers: buildSoulLinkPlayers() }
        : {}),
    });
    onClose();
    router.push(`/run/?id=${run.id}`);
  }

  const randomizerOptionsList = [
    { key: "randomizeTypes", label: t(tr.createRun.randomizeTypes, lang) },
    { key: "randomizeAbilities", label: t(tr.createRun.randomizeAbilities, lang) },
    { key: "randomizeEvolvedForms", label: t(tr.createRun.randomizeEvolvedForms, lang) },
  ];

  const playerColors = SOUL_LINK_PLAYER_COLORS;

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

            <FormControlLabel
              control={
                <Checkbox
                  checked={isSoulLinkMode}
                  onChange={(e) => setIsSoulLinkMode(e.target.checked)}
                />
              }
              label={t(tr.createRun.soulLinkMode, lang)}
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

          {/* Soul Link Players */}
          {isSoulLinkMode && (
            <Box
              sx={{
                background: "linear-gradient(135deg, #EFF6FF 0%, #E0E7FF 100%)",
                border: "2px solid #3b82f6",
                borderRadius: "1rem",
                p: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#3b82f6",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  mb: 2,
                }}
              >
                {t(tr.createRun.soulLinkPlayers, lang)}
              </Typography>
              <Stack spacing={1.5}>
                {/* P1 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: playerColors[0],
                      flexShrink: 0,
                    }}
                  />
                  <StyledTextField
                    label={t(tr.createRun.player1Name, lang)}
                    placeholder={t(tr.createRun.player1Placeholder, lang)}
                    fullWidth
                    value={player1Name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPlayer1Name(e.target.value.substring(0, 24))
                    }
                  />
                </Box>
                {/* P2 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: playerColors[1],
                      flexShrink: 0,
                    }}
                  />
                  <StyledTextField
                    label={t(tr.createRun.player2Name, lang)}
                    placeholder={t(tr.createRun.player2Placeholder, lang)}
                    fullWidth
                    value={player2Name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPlayer2Name(e.target.value.substring(0, 24))
                    }
                  />
                </Box>
                {/* P3 */}
                {player3Name !== null ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: playerColors[2],
                        flexShrink: 0,
                      }}
                    />
                    <StyledTextField
                      label={t(tr.createRun.player3Name, lang)}
                      placeholder={t(tr.createRun.player3Placeholder, lang)}
                      fullWidth
                      value={player3Name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPlayer3Name(e.target.value.substring(0, 24))
                      }
                    />
                    <IconButton
                      onClick={() => {
                        setPlayer3Name(null);
                        setPlayer4Name(null);
                      }}
                      size="small"
                      sx={{
                        border: "2px solid #dc2626",
                        borderRadius: "0.5rem",
                        color: "#dc2626",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    component="button"
                    onClick={() => setPlayer3Name("")}
                    sx={{
                      alignSelf: "flex-start",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: playerColors[2],
                      background: "rgba(249, 115, 22, 0.1)",
                      border: `2px solid ${playerColors[2]}`,
                      borderRadius: "0.75rem",
                      px: 1.5,
                      py: 0.75,
                      cursor: "pointer",
                      "&:hover": { background: "rgba(249, 115, 22, 0.2)" },
                    }}
                  >
                    {t(tr.createRun.addPlayer3, lang)}
                  </Box>
                )}
                {/* P4 – only when P3 is added */}
                {player3Name !== null && (
                  <>
                    {player4Name !== null ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: playerColors[3],
                            flexShrink: 0,
                          }}
                        />
                        <StyledTextField
                          label={t(tr.createRun.player4Name, lang)}
                          placeholder={t(tr.createRun.player4Placeholder, lang)}
                          fullWidth
                          value={player4Name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPlayer4Name(e.target.value.substring(0, 24))
                          }
                        />
                        <IconButton
                          onClick={() => setPlayer4Name(null)}
                          size="small"
                          sx={{
                            border: "2px solid #dc2626",
                            borderRadius: "0.5rem",
                            color: "#dc2626",
                            flexShrink: 0,
                          }}
                        >
                          ✕
                        </IconButton>
                      </Box>
                    ) : (
                      <Box
                        component="button"
                        onClick={() => setPlayer4Name("")}
                        sx={{
                          alignSelf: "flex-start",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: playerColors[3],
                          background: "rgba(34, 197, 94, 0.1)",
                          border: `2px solid ${playerColors[3]}`,
                          borderRadius: "0.75rem",
                          px: 1.5,
                          py: 0.75,
                          cursor: "pointer",
                          "&:hover": { background: "rgba(34, 197, 94, 0.2)" },
                        }}
                      >
                        {t(tr.createRun.addPlayer4, lang)}
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            </Box>
          )}

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
          disabled={!gameName.trim() || !soulLinkValid}
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
