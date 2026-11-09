"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { learnProgress, type OverlayMember } from "@/lib/tracker/overlay";
import {
  STAT_STAGE_NAMES,
  type LiveMove,
  type MoveCategory,
  type StatStageName,
} from "@/lib/tracker/types";
import { typeColors } from "@/lib/type-chart";
import { POKEMON_STAT_NAMES, type PokemonData } from "@/lib/types";
import { getGameVersion, type GameVersionId } from "@/lib/game-catalog";
import {
  getAvailableCaptureSpriteOptions,
  getLocalizedPokemonName,
  getPokemonList,
  type CaptureSpriteOption,
} from "@/lib/pokemon-data";
import { useGameText } from "@/lib/game-text";
import { hpColor } from "@/lib/tracker/hp";
import { evolutionSummary } from "@/lib/tracker/evolution";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t, type Lang } from "@/i18n/translations";
import PixelIcon, {
  HEART_ICON,
  PHYSICAL_ICON,
  SKULL_ICON,
  SPECIAL_ICON,
  STATUS_ICON,
} from "./PixelIcon";

const text = translations.focusCard;
type StatusKey = keyof typeof text.statusShort;
type StatKey = keyof typeof text.stats;

const statusColors: Record<StatusKey, string> = {
  sleep: "#94a3b8",
  poison: "#c084fc",
  toxic: "#9333ea",
  burn: "#f97316",
  freeze: "#38bdf8",
  paralysis: "#eab308",
  fainted: "#ef4444",
};

const muted = "#a5b6c8";
const VISIBLE_MOVES = 4;
const MOVE_ROW_PX = 18;
const MOVE_HEADER_PX = 16;
// Friendship needed by friendship evolutions from Gen 2 to Gen 7.
const FRIENDSHIP_EVOLUTION = 220;

/** Damage stats use (2 + n) / 2, accuracy and evasion (3 + n) / 3. */
function stageMultiplier(stat: StatStageName, stage: number, lang: Lang) {
  const base = stat === "accuracy" || stat === "evasion" ? 3 : 2;
  const ratio = stage >= 0 ? (base + stage) / base : base / (base - stage);
  return ratio.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 2,
  });
}

function StageMark({ stage }: { stage?: number }) {
  return (
    <Box
      component="span"
      sx={{
        textAlign: "right",
        fontWeight: 800,
        fontSize: "0.62rem",
        color: stage ? (stage > 0 ? "#86efac" : "#fda4af") : undefined,
      }}
    >
      {stage ? (stage > 0 ? `▲${stage}` : `▼${-stage}`) : ""}
    </Box>
  );
}

function CategoryIcon({
  category,
  lang,
}: {
  category?: MoveCategory;
  lang: Lang;
}) {
  if (category === "physical")
    return (
      <PixelIcon
        rows={PHYSICAL_ICON}
        color="#fb923c"
        label={t(text.categories.physical, lang)}
      />
    );
  if (category === "special")
    return (
      <PixelIcon
        rows={SPECIAL_ICON}
        color="#60a5fa"
        label={t(text.categories.special, lang)}
      />
    );
  if (category === "status")
    return (
      <PixelIcon
        rows={STATUS_ICON}
        color="#cbd5e1"
        label={t(text.categories.status, lang)}
      />
    );
  // Unknown category: keep the column aligned.
  return <Box sx={{ width: 11, flex: "none" }} />;
}

function Hint({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactElement;
}) {
  if (!title) return children;
  return (
    <Tooltip
      title={title}
      arrow
      enterTouchDelay={0}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: "min(260px, calc(100vw - 16px))",
            fontSize: "0.7rem",
            lineHeight: 1.35,
            bgcolor: "#0b1218",
            border: "1px solid #526173",
          },
        },
        arrow: { sx: { color: "#0b1218" } },
        popper: {
          modifiers: [
            { name: "preventOverflow", options: { padding: 8 } },
            { name: "flip", options: { padding: 8 } },
          ],
        },
      }}
    >
      {children}
    </Tooltip>
  );
}

function TooltipBody({
  title,
  lines,
}: {
  title: string;
  lines: (string | undefined)[];
}) {
  return (
    <>
      <Box component="strong" sx={{ display: "block" }}>
        {title}
      </Box>
      {lines.filter(Boolean).map((line) => (
        <Box key={line} sx={{ mt: 0.25 }}>
          {line}
        </Box>
      ))}
    </>
  );
}

const ellipsis = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

function SpriteBox({
  member,
  status,
  lang,
  onSpriteChange,
}: {
  member: OverlayMember;
  status?: StatusKey;
  lang: Lang;
  onSpriteChange?: (sprite: CaptureSpriteOption) => void;
}) {
  const [options, setOptions] = useState<CaptureSpriteOption[]>();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const browsing = Boolean(options && options.length > 1);
  const preview = browsing ? options![index] : undefined;
  const name = member.names?.[lang] ?? member.name;

  async function startBrowsing() {
    if (!onSpriteChange || loading) return;
    setLoading(true);
    try {
      const loaded = await getAvailableCaptureSpriteOptions({
        pokemonId: member.pokemonId,
        isShiny: Boolean(member.isShiny),
      });
      const current = loaded.findIndex(
        (option) => option.url === member.spriteUrl,
      );
      setIndex(Math.max(current, 0));
      setOptions(loaded);
    } finally {
      setLoading(false);
    }
  }
  function cancel() {
    setOptions(undefined);
  }
  function step(delta: number) {
    if (!options) return;
    setIndex((value) => (value + delta + options.length) % options.length);
  }
  function confirm() {
    if (preview && preview.url !== member.spriteUrl) onSpriteChange?.(preview);
    cancel();
  }
  const arrow = (delta: number, label: string, side: "left" | "right") => (
    <Box
      component="button"
      type="button"
      aria-label={label}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        step(delta);
      }}
      sx={{
        position: "absolute",
        top: "50%",
        [side]: 0,
        transform: "translateY(-50%)",
        width: 16,
        height: 28,
        p: 0,
        border: 0,
        borderRadius: 0.5,
        bgcolor: "#0b1218cc",
        color: "#edf4fa",
        cursor: "pointer",
        fontSize: "0.9rem",
        lineHeight: 1,
      }}
    >
      {delta < 0 ? "‹" : "›"}
    </Box>
  );
  const canBrowse = Boolean(onSpriteChange);
  const hint = browsing
    ? t(text.confirmSprite, lang)
    : options?.length === 1
      ? t(text.noOtherSprite, lang)
      : canBrowse
        ? t(text.changeSprite, lang)
        : "";

  return (
    <Hint title={hint}>
      <Box
        role={canBrowse ? "button" : undefined}
        tabIndex={canBrowse ? 0 : undefined}
        aria-label={canBrowse ? t(text.changeSprite, lang) : undefined}
        data-testid="focus-sprite"
        onClick={() => (browsing ? confirm() : void startBrowsing())}
        onKeyDown={(event) => {
          if (!canBrowse) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (browsing) confirm();
            else void startBrowsing();
          } else if (browsing && event.key === "Escape") {
            event.stopPropagation();
            cancel();
          } else if (browsing && event.key === "ArrowLeft") step(-1);
          else if (browsing && event.key === "ArrowRight") step(1);
        }}
        onBlur={cancel}
        sx={{
          position: "relative",
          width: 68,
          height: 68,
          borderRadius: 1,
          bgcolor: "#0f1922",
          border: "1px solid",
          borderColor: browsing ? "#8ed6f8" : "#2c3b4a",
          cursor: canBrowse ? "pointer" : "default",
          outline: "none",
          "&:focus-visible": { borderColor: "#8ed6f8" },
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview?.url ?? (member.spriteUrl || undefined)}
          alt={name}
          width={64}
          height={64}
          onError={(event) => {
            if (
              !preview &&
              member.fallbackSpriteUrl &&
              event.currentTarget.src !== member.fallbackSpriteUrl
            )
              event.currentTarget.src = member.fallbackSpriteUrl;
          }}
          style={{
            display: "block",
            margin: 1,
            objectFit: "contain",
            imageRendering: "pixelated",
            filter: member.isDead ? "grayscale(1) brightness(0.8)" : undefined,
            opacity: loading ? 0.6 : 1,
          }}
        />
        {status && (
          <Hint title={t(text.statusFull[status], lang)}>
            <Box
              data-testid="focus-status"
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                px: 0.4,
                borderRadius: 0.5,
                bgcolor: statusColors[status],
                color: "#0b1218",
                fontSize: "0.55rem",
                fontWeight: 800,
                lineHeight: 1.5,
              }}
            >
              {t(text.statusShort[status], lang)}
            </Box>
          </Hint>
        )}
        {member.isDead && (
          <Hint title={t(text.deadInParty, lang)}>
            <Box
              data-testid="focus-dead"
              sx={{
                position: "absolute",
                left: 2,
                bottom: 2,
                p: 0.35,
                borderRadius: 0.5,
                bgcolor: "#0b1218d9",
              }}
            >
              <PixelIcon
                rows={SKULL_ICON}
                color="#f1f5f9"
                size={12}
                label={t(translations.faintedPokemon.dead, lang)}
              />
            </Box>
          </Hint>
        )}
        {browsing && (
          <>
            {arrow(-1, t(text.previousSprite, lang), "left")}
            {arrow(1, t(text.nextSprite, lang), "right")}
            <Box
              sx={{
                position: "absolute",
                bottom: 1,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: "0.55rem",
                color: "#edf4fa",
                textShadow: "0 0 2px #000",
              }}
            >
              {index + 1}/{options!.length}
            </Box>
          </>
        )}
      </Box>
    </Hint>
  );
}

/** Species list, loaded only once a card needs evolution target names. */
function useSpeciesNames(enabled: boolean) {
  const [species, setSpecies] = useState<Map<number, PokemonData>>();
  useEffect(() => {
    if (!enabled || species) return;
    let active = true;
    void getPokemonList().then((list) => {
      if (active) setSpecies(new Map(list.map((entry) => [entry.id, entry])));
    });
    return () => {
      active = false;
    };
  }, [enabled, species]);
  return species;
}

export default function FocusCard({
  member,
  gameVersion,
  onSpriteChange,
  actions,
  opponentLevel,
}: {
  member: OverlayMember;
  gameVersion?: GameVersionId;
  onSpriteChange?: (sprite: CaptureSpriteOption) => void;
  actions?: ReactNode;
  opponentLevel?: number;
}) {
  const { lang } = useLanguage();
  const gameText = useGameText();
  const live = member.live;
  const generation = getGameVersion(gameVersion)?.generation ?? 4;
  const singleSpecial = generation === 1;
  const base = new Map(
    member.baseStats?.map((stat) => [stat.stat.name, stat.base_stat]),
  );
  const stats = POKEMON_STAT_NAMES.filter(
    (stat) => !singleSpecial || stat !== "special-defense",
  );
  const name = member.names?.[lang] ?? member.name;
  const status =
    live && live.status in text.statusShort
      ? (live.status as StatusKey)
      : undefined;
  const nature = live && gameText?.nature(live, lang);
  const ability = live && gameText?.ability(live, lang);
  const item = live && gameText?.item(live, lang, generation);
  // Opponents only show abilities the game announced in battle.
  const seenAbilities = live
    ? []
    : (member.seenAbilities ?? []).map(
        (id) =>
          (member.customSeen?.abilities[id] !== undefined
            ? { name: member.customSeen.abilities[id] }
            : gameText?.abilityById(id, lang)) ?? { name: `#${id}` },
      );
  const neutral =
    nature && (!nature.increased || nature.increased === nature.decreased);
  const statName = (stat?: string) =>
    stat && stat in text.statNames
      ? t(text.statNames[stat as keyof typeof text.statNames], lang)
      : (stat ?? "?");
  const natureLine = nature
    ? neutral
      ? t(text.neutralNature, lang)
      : text.natureEffect[lang](
          statName(nature.increased),
          statName(nature.decreased),
        )
    : undefined;
  const typeName = (type: string) =>
    type in translations.pokemonTypes
      ? t(
          translations.pokemonTypes[
            type as keyof typeof translations.pokemonTypes
          ],
          lang,
        )
      : type;

  const detail = (
    label: string,
    value: string | undefined,
    tooltip: ReactNode,
  ) => (
    <Hint title={value ? tooltip : ""}>
      <Box
        tabIndex={value ? 0 : undefined}
        sx={{ ...ellipsis, fontSize: "0.68rem", lineHeight: 1.45 }}
      >
        <Box component="span" sx={{ color: muted }}>
          {label}{" "}
        </Box>
        {value ?? t(text.unknown, lang)}
      </Box>
    </Hint>
  );

  const level = live?.level ?? opponentLevel;
  const gender = live?.gender ?? member.gender;
  const friendship = live?.friendship;
  const stages = live ? live.statStages : member.statStages;
  const stageEntries = STAT_STAGE_NAMES.flatMap((stat) =>
    stages?.[stat] ? [[stat, stages[stat]] as const] : [],
  );
  const evolutions = live?.evolutions ?? member.evolutions;
  const species = useSpeciesNames(Boolean(evolutions?.length));
  const evolution = evolutionSummary(
    evolutions,
    level,
    generation,
    lang,
    {
      item: (id) => gameText?.itemName(id, lang, generation),
      move: (id) => gameText?.move({ id, pp: 0 }, lang, generation).name,
      species: (id) => {
        const entry = species?.get(id);
        return entry && getLocalizedPokemonName(entry, lang);
      },
    },
    member.hideEvolutionTargets,
  );
  const progress = learnProgress(
    live?.learnLevels ?? member.learnLevels,
    level,
  );
  // Opponents never reveal their moveset: only the moves seen in battle are listed.
  const seenOnly = !live && Boolean(member.seenMoves);
  const moveRows: LiveMove[] = live
    ? live.moves
    : (member.seenMoves ?? []).map(
        (id) => member.customSeen?.moves[id] ?? { id, pp: 0 },
      );

  const statValue = (stat: string) =>
    live
      ? stat === "hp"
        ? live.maxHp
        : live.stats?.[stat]
      : member.randomStats
        ? undefined
        : (base.get(stat) ??
          (stat === "special-attack" ? base.get("special") : undefined));

  return (
    <Box
      data-testid="focus-card"
      sx={{
        bgcolor: "#17212b",
        color: "#edf4fa",
        border: "1px solid #526173",
        borderRadius: 1,
        p: 1,
        fontFamily: '"Segoe UI", sans-serif',
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "68px minmax(0, 1fr) auto",
          columnGap: 1,
          alignItems: "start",
        }}
      >
        <Box sx={{ width: 68 }}>
          <SpriteBox
            key={member.id}
            member={member}
            status={status}
            lang={lang}
            onSpriteChange={onSpriteChange}
          />
          {actions}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
            <Typography
              sx={{ ...ellipsis, fontWeight: 800, fontSize: "0.95rem" }}
            >
              {name}
            </Typography>
            {(gender === "male" || gender === "female") && (
              <Typography
                data-testid="focus-gender"
                role="img"
                aria-label={t(text.gender[gender], lang)}
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  flex: "none",
                  color: gender === "male" ? "#60a5fa" : "#f472b6",
                }}
              >
                {gender === "male" ? "♂" : "♀"}
              </Typography>
            )}
            {(live || opponentLevel !== undefined) && (
              <Typography
                sx={{ fontSize: "0.72rem", color: muted, flex: "none" }}
              >
                {t(text.level, lang)} {level}
              </Typography>
            )}
            {evolution && (
              <Hint
                title={
                  <TooltipBody
                    title={t(text.evolution.title, lang)}
                    lines={[
                      ...evolution.details,
                      ...(evolution.ready
                        ? [t(text.evolution.ready, lang)]
                        : []),
                    ]}
                  />
                }
              >
                <Typography
                  tabIndex={0}
                  data-testid="focus-evolution"
                  sx={{
                    ...ellipsis,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: evolution.ready ? "#7bd88f" : muted,
                  }}
                >
                  ({evolution.label})
                </Typography>
              </Hint>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 0.4, my: 0.35, flexWrap: "nowrap" }}>
            {(member.types.length ? member.types : ["???"]).map((type) => (
              <Box
                key={type}
                sx={{
                  ...ellipsis,
                  bgcolor: typeColors[type] ?? "#526173",
                  fontSize: "0.6rem",
                  borderRadius: 0.5,
                  px: 0.6,
                  lineHeight: 1.6,
                  fontWeight: 700,
                  textShadow: "0 1px 1px #0008",
                }}
              >
                {typeName(type)}
              </Box>
            ))}
            {friendship !== undefined && (
              <Hint
                title={
                  <TooltipBody
                    title={t(text.friendship, lang)}
                    lines={[
                      text.friendshipDetail[lang](
                        friendship,
                        FRIENDSHIP_EVOLUTION,
                      ),
                    ]}
                  />
                }
              >
                <Box
                  tabIndex={0}
                  data-testid="focus-friendship"
                  sx={{
                    ml: "auto",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    lineHeight: 1.6,
                    fontVariantNumeric: "tabular-nums",
                    color:
                      friendship >= FRIENDSHIP_EVOLUTION ? "#f9a8d4" : muted,
                  }}
                >
                  <PixelIcon
                    rows={HEART_ICON}
                    size={10}
                    color={
                      friendship >= FRIENDSHIP_EVOLUTION ? "#f472b6" : "#64748b"
                    }
                    label={t(text.friendship, lang)}
                  />
                  {friendship}
                </Box>
              </Hint>
            )}
          </Box>
          {live ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.68rem",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Box component="span" sx={{ color: muted }}>
                  {t(text.stats.hp, lang)}
                </Box>
                <span>
                  {live.hp}/{live.maxHp}
                </span>
              </Box>
              <Box
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={live.maxHp}
                aria-valuenow={live.hp}
                sx={{
                  height: 5,
                  borderRadius: 1,
                  bgcolor: "#2c3b4a",
                  overflow: "hidden",
                  mb: 0.35,
                }}
              >
                <Box
                  data-testid="focus-hp-bar"
                  sx={{
                    height: "100%",
                    width: `${live.maxHp ? (100 * live.hp) / live.maxHp : 0}%`,
                    bgcolor: hpColor(live.hp, live.maxHp),
                    transition: "width 300ms ease",
                  }}
                />
              </Box>
              {detail(
                t(text.nature, lang),
                nature?.name ?? live.nature,
                nature && (
                  <TooltipBody title={nature.name} lines={[natureLine]} />
                ),
              )}
              {detail(
                t(text.ability, lang),
                ability?.name ?? live.ability,
                ability && (
                  <TooltipBody
                    title={ability.name}
                    lines={[ability.description]}
                  />
                ),
              )}
              {detail(
                t(text.item, lang),
                item?.name ?? live.heldItem ?? t(text.noItem, lang),
                item && (
                  <TooltipBody title={item.name} lines={[item.description]} />
                ),
              )}
            </>
          ) : (
            <>
              {seenAbilities.length > 0 &&
                detail(
                  t(text.ability, lang),
                  seenAbilities.map((ability) => ability.name).join(" / "),
                  <TooltipBody
                    title={t(text.revealedAbility, lang)}
                    lines={seenAbilities.map((ability) =>
                      ability.description
                        ? text.abilityLine[lang](
                            ability.name,
                            ability.description,
                          )
                        : ability.name,
                    )}
                  />,
                )}
              <Typography sx={{ fontSize: "0.68rem", color: "#b8c7d5" }}>
                {t(
                  opponentLevel === undefined ? text.manual : text.opponentInfo,
                  lang,
                )}
              </Typography>
            </>
          )}
        </Box>
        <Hint
          title={
            <TooltipBody
              title={t(
                live
                  ? text.inGameStats
                  : member.randomStats
                    ? text.estimates
                    : text.baseStats,
                lang,
              )}
              lines={
                stageEntries.length
                  ? [
                      `${t(text.statStages, lang)} :`,
                      ...stageEntries.map(([stat, stage]) =>
                        text.stageLine[lang](
                          statName(stat),
                          stage > 0 ? `+${stage}` : `−${-stage}`,
                          stageMultiplier(stat, stage, lang),
                        ),
                      ),
                    ]
                  : []
              }
            />
          }
        >
          <Box
            tabIndex={0}
            data-testid="focus-stats"
            sx={{
              display: "grid",
              gridTemplateColumns: stageEntries.length
                ? "auto auto auto"
                : "auto auto",
              columnGap: 0.75,
              fontSize: "0.68rem",
              lineHeight: 1.45,
              fontVariantNumeric: "tabular-nums",
              borderLeft: "1px solid #3f4e5f",
              pl: 0.75,
            }}
          >
            {stats.map((stat) => {
              const key: StatKey =
                singleSpecial && stat === "special-attack"
                  ? "special"
                  : (stat as StatKey);
              const boosted = !neutral && nature?.increased === stat;
              const lowered = !neutral && nature?.decreased === stat;
              const estimate = member.annotations?.[stat];
              return [
                <Box
                  key={`${stat}-label`}
                  component="span"
                  sx={{
                    color: boosted ? "#86efac" : lowered ? "#fda4af" : muted,
                  }}
                >
                  {t(text.stats[key], lang)}
                  {boosted ? "+" : lowered ? "−" : ""}
                </Box>,
                <Box
                  key={`${stat}-value`}
                  component="span"
                  sx={{ textAlign: "right", fontWeight: 700 }}
                >
                  {statValue(stat) ?? "?"}
                  {member.randomStats && estimate && (
                    <Box
                      component="span"
                      sx={{
                        ml: 0.25,
                        color: estimate === "high" ? "#86efac" : "#fda4af",
                      }}
                    >
                      {estimate === "high" ? "+" : "−"}
                    </Box>
                  )}
                </Box>,
                ...(stageEntries.length
                  ? [
                      <StageMark
                        key={`${stat}-stage`}
                        stage={
                          stat === "hp"
                            ? undefined
                            : stages?.[stat as StatStageName]
                        }
                      />,
                    ]
                  : []),
              ];
            })}
            {(["accuracy", "evasion"] as const).map((stat) =>
              stages?.[stat]
                ? [
                    <Box
                      key={`${stat}-label`}
                      component="span"
                      sx={{ color: muted }}
                    >
                      {t(text.stats[stat], lang)}
                    </Box>,
                    <span key={`${stat}-value`} />,
                    <StageMark key={`${stat}-stage`} stage={stages[stat]} />,
                  ]
                : null,
            )}
            <Box component="span" sx={{ color: muted }}>
              {t(text.stats.total, lang)}
            </Box>
            <Box component="span" sx={{ textAlign: "right", fontWeight: 700 }}>
              {member.bst || "?"}
            </Box>
            {stageEntries.length > 0 && <span />}
          </Box>
        </Hint>
      </Box>
      {member.bst === 0 && (
        <Typography sx={{ color: "#fcd34d", fontSize: "0.65rem", mt: 0.5 }}>
          {t(text.noReference, lang)}
        </Typography>
      )}
      {moveRows.length > 0 || member.seenMoves ? (
        <Box
          data-testid="focus-moves"
          sx={{
            mt: 0.75,
            borderTop: "1px solid #3f4e5f",
            pt: 0.5,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
            columnGap: 1,
            fontSize: "0.72rem",
            lineHeight: `${MOVE_ROW_PX}px`,
            fontVariantNumeric: "tabular-nums",
            alignItems: "center",
            ...(moveRows.length > VISIBLE_MOVES
              ? {
                  maxHeight: MOVE_HEADER_PX + VISIBLE_MOVES * MOVE_ROW_PX,
                  overflowY: "auto",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#526173 transparent",
                }
              : {}),
          }}
        >
          {[text.moves, text.pp, text.power, text.accuracy].map(
            (header, column) => {
              const cell = (
                <Box
                  key={header.en}
                  tabIndex={!column && (progress || seenOnly) ? 0 : undefined}
                  sx={{
                    ...ellipsis,
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    bgcolor: "#17212b",
                    color: muted,
                    fontSize: "0.6rem",
                    lineHeight: `${MOVE_HEADER_PX}px`,
                    textTransform: "uppercase",
                    textAlign: column ? "right" : "left",
                  }}
                >
                  {t(header, lang)}
                  {!column && progress && (
                    <Box
                      component="span"
                      data-testid="focus-learn-progress"
                      sx={{ ml: 0.5, color: "#edf4fa", textTransform: "none" }}
                    >
                      {progress.learned}/{progress.total}
                      {progress.next !== undefined && ` (${progress.next})`}
                    </Box>
                  )}
                </Box>
              );
              return column || !(progress || seenOnly) ? (
                cell
              ) : (
                <Hint
                  key={header.en}
                  title={
                    <TooltipBody
                      title={t(text.moves, lang)}
                      lines={[
                        progress &&
                          text.learnProgress[lang](
                            progress.learned,
                            progress.total,
                            progress.next,
                          ),
                        seenOnly ? t(text.seenMoves, lang) : undefined,
                      ]}
                    />
                  }
                >
                  {cell}
                </Hint>
              );
            },
          )}
          {moveRows.length === 0 && (
            <Box
              sx={{ gridColumn: "1 / -1", color: muted, fontSize: "0.68rem" }}
            >
              {t(text.noMovesSeen, lang)}
            </Box>
          )}
          {moveRows.map((move, slot) => {
            const word = gameText?.move(move, lang, generation) ?? {
              name: move.name ?? `#${move.id}`,
              category: move.category,
              type: move.type,
              power: move.power,
              accuracy: move.accuracy,
            };
            const typeColor = word.type ? typeColors[word.type] : undefined;
            const tooltip = (
              <TooltipBody
                title={word.name}
                lines={[
                  [
                    word.type && typeName(word.type),
                    word.category && t(text.categories[word.category], lang),
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  `${t(text.powerFull, lang)} ${word.power || "—"} · ${t(text.accuracyFull, lang)} ${word.accuracy || "—"}`,
                  word.description,
                ]}
              />
            );
            const low = move.maxPp && move.pp * 4 <= move.maxPp;
            return [
              <Hint key={`${slot}-name`} title={tooltip}>
                <Box
                  tabIndex={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    minWidth: 0,
                  }}
                >
                  <CategoryIcon category={word.category} lang={lang} />
                  <Box
                    component="span"
                    sx={{ ...ellipsis, color: typeColor ?? "#edf4fa" }}
                  >
                    {word.name}
                  </Box>
                </Box>
              </Hint>,
              <Box
                key={`${slot}-pp`}
                sx={{
                  textAlign: "right",
                  color: seenOnly
                    ? muted
                    : move.pp === 0
                      ? "#ef4444"
                      : low
                        ? "#facc15"
                        : "#c6d4e1",
                }}
              >
                {seenOnly ? "—" : move.pp}
                {!seenOnly && move.maxPp ? `/${move.maxPp}` : ""}
              </Box>,
              <Box key={`${slot}-power`} sx={{ textAlign: "right" }}>
                {word.power || "—"}
              </Box>,
              <Box key={`${slot}-accuracy`} sx={{ textAlign: "right" }}>
                {word.accuracy || "—"}
              </Box>,
            ];
          })}
        </Box>
      ) : null}
    </Box>
  );
}
