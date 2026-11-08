"use client";

import { Box } from "@mui/material";
import { typeColors } from "@/lib/type-chart";
import type { SpriteMember } from "@/lib/tracker/overlay";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";
import PixelIcon, { SKULL_ICON } from "@/components/tracker/PixelIcon";

interface Props {
  members: SpriteMember[];
  showTypes?: boolean;
  tightTypes?: boolean;
  mirror?: boolean;
  fullHeight?: boolean;
  isRipMode?: boolean;
  ribbon?: boolean;
  onSelect?: (id: string) => void;
}

export default function SpriteTeam({
  members,
  showTypes = true,
  tightTypes = false,
  mirror = false,
  fullHeight = false,
  isRipMode = false,
  ribbon = false,
  onSelect,
}: Props) {
  const { lang } = useLanguage();
  const typeLabel = (type: string) =>
    type in translations.pokemonTypes
      ? t(
          translations.pokemonTypes[
            type as keyof typeof translations.pokemonTypes
          ],
          lang,
        )
      : type;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isRipMode || ribbon ? "row" : "column",
        width: ribbon ? "100%" : "fit-content",
        height: fullHeight ? "100%" : isRipMode ? "200px" : "auto",
        gap: isRipMode ? 2 : 0,
        p: 0,
        alignItems: isRipMode ? "center" : "flex-start",
        justifyContent: isRipMode ? "center" : "flex-start",
      }}
    >
      {members.map((member) => {
        const types = member.types.length ? member.types : ["???"];
        const name = member.names?.[lang] ?? member.name;

        return (
          <Box
            key={member.id}
            data-member-id={member.id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={name}
            onClick={onSelect ? () => onSelect(member.id) : undefined}
            onKeyDown={
              onSelect
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(member.id);
                    }
                  }
                : undefined
            }
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection:
                isRipMode || ribbon ? "column" : mirror ? "row-reverse" : "row",
              height:
                isRipMode || ribbon
                  ? "auto"
                  : fullHeight
                    ? "calc(100% / 6)"
                    : "180px",
              width: ribbon ? "100%" : "auto",
              minHeight: isRipMode || ribbon ? "auto" : "120px",
              minWidth: isRipMode || ribbon ? 0 : "200px",
              mr: !isRipMode && mirror ? 0 : !isRipMode ? 0.5 : 0,
              ml: !isRipMode && mirror ? 0.5 : 0,
              p: isRipMode || ribbon ? 0 : 1,
              py: isRipMode ? 0 : ribbon ? 1 : 2,
              cursor: onSelect ? "pointer" : undefined,
              borderRadius: ribbon ? 1 : 0,
              "&:hover, &:focus-visible": onSelect
                ? {
                    backgroundColor: "rgba(148,163,184,0.2)",
                    outline: "2px solid #94a3b8",
                  }
                : {},
            }}
          >
            {/* Sprite */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: ribbon ? "48px" : isRipMode ? "80px" : "120px",
                height: ribbon ? "48px" : isRipMode ? "80px" : "120px",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.spriteUrl || undefined}
                data-export-fallback-src={member.fallbackSpriteUrl}
                alt={name}
                onError={(event) => {
                  const fallbackUrl = member.fallbackSpriteUrl;
                  if (fallbackUrl && event.currentTarget.src !== fallbackUrl) {
                    event.currentTarget.src = fallbackUrl;
                  }
                }}
                style={{
                  width: ribbon ? "44px" : isRipMode ? "64px" : "96px",
                  height: ribbon ? "44px" : isRipMode ? "64px" : "96px",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  filter: member.isDead
                    ? "grayscale(1) brightness(0.8)"
                    : undefined,
                }}
              />
              {member.isDead && (
                <Box
                  data-testid="member-dead"
                  sx={{
                    position: "absolute",
                    left: 2,
                    bottom: 2,
                    p: "2px",
                    borderRadius: 0.5,
                    bgcolor: "#0b1218d9",
                  }}
                >
                  <PixelIcon
                    rows={SKULL_ICON}
                    color="#f1f5f9"
                    size={ribbon ? 9 : 12}
                    label={t(translations.faintedPokemon.dead, lang)}
                  />
                </Box>
              )}
            </Box>

            {/* Types - stacked vertically (hidden in RIP mode) */}
            {showTypes && !isRipMode && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ribbon ? 0.5 : 1,
                  transform: tightTypes
                    ? `translateX(${mirror ? "25px" : "-25px"})`
                    : "none",
                }}
              >
                {types.map((typeName) => (
                  <Box
                    key={typeName}
                    sx={{
                      background:
                        typeColors[typeName] ??
                        (typeName === "???" ? "#64748b" : "#888"),
                      color: "#fff",
                      padding: ribbon ? "2px 3px" : "6px 12px",
                      borderRadius: "4px",
                      fontSize: ribbon ? "0.625rem" : "0.875rem",
                      fontWeight: 700,
                      textTransform: "capitalize",
                      minWidth: ribbon ? "40px" : "80px",
                      textAlign: "center",
                    }}
                  >
                    {typeLabel(typeName)}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
