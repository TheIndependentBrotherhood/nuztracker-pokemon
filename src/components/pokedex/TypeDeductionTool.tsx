"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  TextField,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import { TypeObservation } from "@/lib/types";
import {
  deducePossibleTypes,
  type TypePossibility,
} from "@/lib/type-deduction";
import { typeColors, TYPES, getTypeTranslation } from "@/lib/type-chart";
import { useLanguage } from "@/context/LanguageContext";
import { useCache } from "@/context/CacheContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  observations: TypeObservation[];
  abilityPanel: string[];
  notes: string;
  typeChartGeneration: "gen1" | "gen2-5" | "gen6+";
  onObservationsChange: (observations: TypeObservation[]) => void;
  onNotesChange: (notes: string) => void;
}

type ObservationType = "immunity" | "weakness" | "resistance" | "neutral";

export default function TypeDeductionTool({
  observations,
  abilityPanel,
  notes,
  typeChartGeneration,
  onObservationsChange,
  onNotesChange,
}: Props) {
  const [observationTypeAnchor, setObservationTypeAnchor] =
    useState<HTMLElement | null>(null);
  const [selectedObsType, setSelectedObsType] =
    useState<ObservationType>("weakness");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [typeAnchor, setTypeAnchor] = useState<HTMLElement | null>(null);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [possibleTypes, setPossibleTypes] = useState<TypePossibility[]>([]);
  const { lang } = useLanguage();
  const { abilities: abilitiesCache } = useCache();
  const tr = translations;

  useEffect(() => {
    const loadPossibleTypes = async () => {
      const types = await deducePossibleTypes(
        observations,
        abilityPanel,
        typeChartGeneration,
      );
      setPossibleTypes(types);
    };

    loadPossibleTypes();
  }, [observations, abilityPanel, typeChartGeneration]);

  function addObservation() {
    if (!selectedType) return;

    const newObs: TypeObservation = {
      id: `obs-${Date.now()}`,
      type: selectedObsType,
      observationType: selectedType,
      createdAt: Date.now(),
    };

    onObservationsChange([...observations, newObs]);
    setSelectedType(null);
    setSelectedObsType("weakness");
  }

  function removeObservation(obsId: string) {
    onObservationsChange(observations.filter((o) => o.id !== obsId));
  }

  function getAbilityDisplayName(abilityName: string): string {
    const entry = abilitiesCache.abilities.find((a) => a.name === abilityName);
    return entry ? (entry.names?.[lang] ?? abilityName) : abilityName;
  }

  const obsTypeLabels: Record<ObservationType, string> = {
    immunity: t(tr.pokemonDetail.observationTypes.immunity, lang),
    weakness: t(tr.pokemonDetail.observationTypes.weakness, lang),
    resistance: t(tr.pokemonDetail.observationTypes.resistance, lang),
    neutral: t(tr.pokemonDetail.observationTypes.neutral, lang),
  };

  const obsTypeColors: Record<ObservationType, string> = {
    immunity: "#10b981",
    weakness: "#ef4444",
    resistance: "#3b82f6",
    neutral: "#8b5cf6",
  };

  return (
    <Box
      sx={{
        p: 2,
        background: "#f9fafb",
        borderRadius: "0.75rem",
        gap: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Global Notes */}
      <Box>
        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 700,
            mb: 0.75,
            color: "#666",
          }}
        >
          {t(tr.pokemonDetail.speciesNotes, lang)}
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder={t(tr.pokemonDetail.speciesNotesPlaceholder, lang)}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          multiline
          rows={2}
          sx={{
            "& .MuiOutlinedInput-root": {
              background: "#fff",
              fontSize: "0.875rem",
            },
          }}
        />
      </Box>

      {/* Observations Input */}
      <Box
        sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
      >
        {/* Observation Type Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={(e) => setObservationTypeAnchor(e.currentTarget)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
            borderColor: obsTypeColors[selectedObsType],
            color: obsTypeColors[selectedObsType],
            display: "flex",
            gap: 0.5,
            "&:hover": {
              borderColor: obsTypeColors[selectedObsType],
              background: `${obsTypeColors[selectedObsType]}11`,
            },
          }}
        >
          {obsTypeLabels[selectedObsType]}
          <span style={{ fontSize: "0.65rem", marginLeft: "4px" }}>▼</span>
        </Button>
        <Menu
          anchorEl={observationTypeAnchor}
          open={!!observationTypeAnchor}
          onClose={() => setObservationTypeAnchor(null)}
        >
          {(["immunity", "weakness", "resistance", "neutral"] as const).map(
            (obsType) => (
              <MenuItem
                key={obsType}
                onClick={() => {
                  setSelectedObsType(obsType);
                  setObservationTypeAnchor(null);
                }}
                selected={obsType === selectedObsType}
              >
                {obsTypeLabels[obsType]}
              </MenuItem>
            ),
          )}
        </Menu>

        {/* Type Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={(e) => setTypeAnchor(e.currentTarget)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
            borderColor: selectedType
              ? typeColors[selectedType as keyof typeof typeColors] || "#999"
              : "#ccc",
            color: selectedType
              ? typeColors[selectedType as keyof typeof typeColors] || "#999"
              : "#999",
            display: "flex",
            gap: 0.5,
            "&:hover": {
              background: selectedType
                ? `${typeColors[selectedType as keyof typeof typeColors]}11`
                : undefined,
            },
          }}
        >
          {selectedType
            ? getTypeTranslation(selectedType, lang)
            : t(tr.pokemonDetail.chooseType, lang)}
          <span style={{ fontSize: "0.65rem", marginLeft: "4px" }}>▼</span>
        </Button>
        <Menu
          anchorEl={typeAnchor}
          open={!!typeAnchor}
          onClose={() => setTypeAnchor(null)}
        >
          {TYPES.map((type) => (
            <MenuItem
              key={type}
              onClick={() => {
                setSelectedType(type);
                setTypeAnchor(null);
              }}
              selected={type === selectedType}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background:
                      typeColors[type as keyof typeof typeColors] ?? "#888",
                    border: "1px solid #000",
                  }}
                />
                {getTypeTranslation(type, lang)}
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* Add Button */}
        <Button
          variant="contained"
          size="small"
          onClick={addObservation}
          disabled={!selectedType}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.75rem",
            minWidth: "32px",
            width: "32px",
            height: "32px",
            p: 0,
          }}
        >
          +
        </Button>
      </Box>

      {/* Observations List */}
      {observations.length > 0 && (
        <Box>
          <Typography
            sx={{ fontSize: "0.875rem", fontWeight: 700, mb: 1, color: "#666" }}
          >
            {t(tr.pokemonDetail.observations, lang)}:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {observations.map((obs) => (
              <Chip
                key={obs.id}
                label={`${obsTypeLabels[obs.type]} ${getTypeTranslation(obs.observationType, lang)}`}
                onDelete={() => removeObservation(obs.id)}
                icon={
                  <Box
                    sx={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "2px",
                      background: obsTypeColors[obs.type],
                    }}
                  />
                }
                sx={{
                  background: `${obsTypeColors[obs.type]}22`,
                  borderColor: obsTypeColors[obs.type],
                  border: "1px solid",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Ability Panel Info */}
      {abilityPanel.length > 0 && (
        <Box>
          <Typography
            sx={{ fontSize: "0.875rem", fontWeight: 700, mb: 1, color: "#666" }}
          >
            {t(tr.pokemonDetail.abilityPanelLabel, lang)}:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {abilityPanel.map((ability) => (
              <Chip
                key={ability}
                label={getAbilityDisplayName(ability)}
                size="small"
                sx={{
                  background: "#e0e7ff",
                  borderColor: "#6366f1",
                  border: "1px solid",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  color: "#4f46e5",
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Possible Types */}
      {possibleTypes.length > 0 && (
        <Box>
          <Typography
            sx={{ fontSize: "0.875rem", fontWeight: 700, mb: 1, color: "#666" }}
          >
            {(
              tr.pokemonDetail.possibleTypesLabel[lang] as (n: number) => string
            )(possibleTypes.length)}
            :
          </Typography>

          {possibleTypes.length === 1 ? (
            <Box
              sx={{
                p: 1.5,
                background: "#ecfdf5",
                border: "2px solid #10b981",
                borderRadius: "0.5rem",
                textAlign: "center",
              }}
            >
              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                {possibleTypes[0].types.map((type) => (
                  <Box
                    key={type}
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#fff",
                      textTransform: "capitalize",
                      background:
                        typeColors[type as keyof typeof typeColors] || "#888",
                      border: "1px solid rgba(0,0,0,0.2)",
                    }}
                  >
                    {getTypeTranslation(type, lang)}
                  </Box>
                ))}
              </Box>
              {abilityPanel.length > 0 && (
                <Typography
                  sx={{ fontSize: "0.75rem", color: "#059669", mt: 0.5 }}
                >
                  {(
                    tr.pokemonDetail.abilityPanelCount[lang] as (
                      n: number,
                    ) => string
                  )(abilityPanel.length)}
                </Typography>
              )}
            </Box>
          ) : (
            <Grid container spacing={1}>
              {(showAllTypes ? possibleTypes : possibleTypes.slice(0, 8)).map(
                (possibility, idx) => {
                  const color1 =
                    typeColors[
                      possibility.types[0] as keyof typeof typeColors
                    ] || "#888";
                  const color2 =
                    possibility.types[1] &&
                    (typeColors[
                      possibility.types[1] as keyof typeof typeColors
                    ] ||
                      "#888");

                  return (
                    <Grid sx={{ xs: 6, sm: 4 }} key={idx} component="div">
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: "0.5rem",
                          textAlign: "center",
                          background: color2
                            ? `linear-gradient(90deg, ${color1} 50%, ${color2} 50%)`
                            : color1,
                          border: "1px solid rgba(0,0,0,0.1)",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      >
                        {possibility.types
                          .map((t) => getTypeTranslation(t, lang))
                          .join(" / ")}
                      </Box>
                    </Grid>
                  );
                },
              )}
              {!showAllTypes && possibleTypes.length > 8 && (
                <Grid sx={{ xs: 12 }} component="div">
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowAllTypes(true)}
                    sx={{
                      width: "100%",
                      fontSize: "0.75rem",
                      color: "#666",
                      textTransform: "none",
                      "&:hover": {
                        background: "#f0f0f0",
                      },
                    }}
                  >
                    {(
                      tr.pokemonDetail.otherPossibilities[lang] as (
                        n: number,
                      ) => string
                    )(possibleTypes.length - 8)}
                  </Button>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}
