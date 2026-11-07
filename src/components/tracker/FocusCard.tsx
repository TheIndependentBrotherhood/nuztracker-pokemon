"use client";

import { Box, LinearProgress, Typography } from "@mui/material";
import type { OverlayMember } from "@/lib/tracker/overlay";
import { typeColors } from "@/lib/type-chart";
import { POKEMON_STAT_NAMES } from "@/lib/types";
import { getGameVersion, type GameVersionId } from "@/lib/game-catalog";

const labels: Record<string, string> = {
  hp: "HP", attack: "Atk", defense: "Def", "special-attack": "SpA",
  "special-defense": "SpD", special: "Spc", speed: "Spe",
};

export default function FocusCard({ member, gameVersion }: { member: OverlayMember; gameVersion?: GameVersionId }) {
  const live = member.live;
  const base = new Map(member.baseStats?.map((stat) => [stat.stat.name, stat.base_stat]));
  const singleSpecial = getGameVersion(gameVersion)?.generation === 1;
  const stats = POKEMON_STAT_NAMES.filter((stat) => !singleSpecial || stat !== "special-defense");
  return (
    <Box data-testid="focus-card" sx={{ bgcolor: "#17212b", color: "#edf4fa", border: "1px solid #526173", borderRadius: 1, p: 1.25, fontFamily: '"Segoe UI", sans-serif' }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "baseline" }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</Typography>
        <Typography sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>BST {member.bst || "?"}{live && ` / Lv. ${live.level}`}</Typography>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "86px minmax(0, 1fr)", gap: 1.25, mt: 0.75 }}>
        <Box sx={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={member.spriteUrl || undefined} alt={member.name} width={80} height={80}
            onError={(event) => {
              if (member.fallbackSpriteUrl && event.currentTarget.src !== member.fallbackSpriteUrl)
                event.currentTarget.src = member.fallbackSpriteUrl;
            }}
            style={{ objectFit: "contain", imageRendering: "pixelated" }} />
          {(member.types.length ? member.types : ["???"]).map((type) => (
            <Box key={type} sx={{ bgcolor: typeColors[type] ?? "#526173", fontSize: "0.65rem", borderRadius: 0.5, px: 0.75, py: 0.2, mt: 0.35, textTransform: "capitalize", fontWeight: 700 }}>{type}</Box>
          ))}
        </Box>
        <Box>
          {live ? <>
            <Typography sx={{ fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{live.hp} / {live.maxHp} HP <Box component="span" sx={{ color: "#a5b6c8" }}> / {live.status}</Box></Typography>
            <LinearProgress variant="determinate" value={100 * live.hp / live.maxHp} sx={{ my: 0.5, height: 5, borderRadius: 1 }} />
          </> : <Typography sx={{ fontSize: "0.7rem", color: "#b8c7d5", mb: 0.5 }}>Manual / no in-game values</Typography>}
          <Typography sx={{ fontSize: "0.6rem", color: "#a5b6c8", textTransform: "uppercase" }}>{live ? "In-game stats" : member.randomStats ? "Your stat estimates" : "Reference base stats"}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.6, mt: 0.5 }}>
            {stats.map((stat) => {
              const value = live
                ? stat === "hp" ? live.maxHp : live.stats?.[stat]
                : member.randomStats ? undefined : base.get(stat) ?? (stat === "special-attack" ? base.get("special") : undefined);
              const estimate = member.annotations?.[stat];
              return <Box key={stat} sx={{ fontSize: "0.7rem", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                <Box component="span" sx={{ color: "#a5b6c8" }}>{singleSpecial && stat === "special-attack" ? "Spc" : labels[stat]} </Box>
                <strong>{value ?? "?"}</strong>
                {member.randomStats && estimate && <Box component="span" sx={{ ml: 0.25, color: estimate === "high" ? "#86efac" : "#fda4af" }}>{estimate === "high" ? "+" : "-"}</Box>}
              </Box>;
            })}
          </Box>
          {member.bst === 0 && <Typography sx={{ color: "#fcd34d", fontSize: "0.65rem", mt: 0.5 }}>No base-stat reference for the selected game.</Typography>}
        </Box>
      </Box>
      {live && <Typography sx={{ fontSize: "0.7rem", my: 1, color: "#c6d4e1", textTransform: "capitalize" }}>
        {live.nature ?? "Nature unknown"} / {live.ability ?? "Ability unknown"} / {live.heldItem ?? "No item"}
      </Typography>}
      {live && <Box sx={{ borderTop: "1px solid #3f4e5f", pt: 0.5 }}>
        {live.moves.map((move) => <Box key={move.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: "0.75rem", py: 0.4 }}>
          <Box component="span" sx={{ color: move.type ? typeColors[move.type] ?? "#edf4fa" : "#edf4fa" }}>{move.name ?? `Move #${move.id}`}</Box>
          <Box component="span" sx={{ color: "#b8c7d5", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{move.power !== undefined && `${move.power || "-"} PWR / `}{move.pp} PP</Box>
        </Box>)}
      </Box>}
    </Box>
  );
}
