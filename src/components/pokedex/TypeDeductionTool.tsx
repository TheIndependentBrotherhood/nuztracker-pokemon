"use client";

import { useState } from "react";
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
import { deducePossibleTypes } from "@/lib/type-deduction";
import { typeColors, TYPES } from "@/lib/type-chart";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

interface Props {
  observations: TypeObservation[];
  abilityPanel: string[];
  notes: string;
  onObservationsChange: (observations: TypeObservation[]) => void;
  onNotesChange: (notes: string) => void;
}

type ObservationType = "immunity" | "weakness" | "resistance";

export default function TypeDeductionTool({
  observations,
  abilityPanel,
  notes,
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
  const { lang } = useLanguage();
  const tr = translations;

  const possibleTypes = deducePossibleTypes(observations, abilityPanel);

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

  const obsTypeLabels: Record<ObservationType, string> = {
    immunity: lang === "fr" ? "Immunité à" : "Immune to",
    weakness: lang === "fr" ? "Faible à" : "Weak to",
    resistance: lang === "fr" ? "Résistant à" : "Resistant to",
  };

  const obsTypeColors: Record<ObservationType, string> = {
    immunity: "#10b981",
    weakness: "#ef4444",
    resistance: "#3b82f6",
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
          {(["immunity", "weakness", "resistance"] as const).map((obsType) => (
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
          ))}
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
          {selectedType || (lang === "fr" ? "Choisir un type" : "Choose type")}
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
                {type.charAt(0).toUpperCase() + type.slice(1)}
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
                label={`${obsTypeLabels[obs.type]} ${obs.observationType}`}
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
                label={ability}
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
                    {type}
                  </Box>
                ))}
              </Box>
              {abilityPanel.length > 0 && (
                <Typography
                  sx={{ fontSize: "0.75rem", color: "#059669", mt: 0.5 }}
                >
                  {lang === "fr"
                    ? `+ ${abilityPanel.length} talent(s) du panel`
                    : `+ ${abilityPanel.length} ability(ies) in panel`}
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
                          .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
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
