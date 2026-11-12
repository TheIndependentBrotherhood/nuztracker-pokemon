"use client";

import { Alert, AlertTitle, Box, Stack, Typography } from "@mui/material";
import { SOUL_LINK_PLAYER_COLORS, type Capture, type Run } from "@/lib/types";
import { soulLinkTeamIssues } from "@/lib/tracker/run-rules";
import { getZoneDisplayName } from "@/lib/zones";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

const tr = translations.soulLinkTeamCheck;

/** Warns when a team holds a Pokémon whose SoulLink partner is not in the other player's team. */
export default function SoulLinkTeamCheck({
  run,
  compact = false,
}: {
  run: Run;
  compact?: boolean;
}) {
  const { lang } = useLanguage();
  const issues = soulLinkTeamIssues(run);
  if (!issues.length) return null;
  const label = (capture: Capture) =>
    capture.nickname ??
    capture.pokemon.names?.[lang] ??
    capture.pokemon.technicalName;
  const playerName = (index: number) =>
    run.soulLinkPlayers?.find((entry) => entry.playerIndex === index)?.name ??
    `P${index + 1}`;
  const player = (index: number) => (
    <Box
      component="span"
      sx={{ color: SOUL_LINK_PLAYER_COLORS[index], fontWeight: 700 }}
    >
      {playerName(index)}
    </Box>
  );
  const textSx = { fontSize: compact ? "0.75rem" : undefined };

  return (
    <Alert
      severity="warning"
      sx={{ mt: compact ? 1 : 0 }}
      data-testid="soul-link-team-check"
    >
      <AlertTitle sx={{ fontSize: compact ? "0.8rem" : undefined }}>
        {t(tr.title, lang)}
      </AlertTitle>
      {!compact && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t(tr.intro, lang)}
        </Typography>
      )}
      <Stack spacing={0.75}>
        {issues.map((issue) => (
          <Stack key={issue.key} sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={textSx}>
              {t(
                tr.pair,
                lang,
              )(
                getZoneDisplayName(issue.zone, lang) || issue.zone.zoneName,
              )}{" "}
              {issue.pair.map((member, position) => (
                <span key={member.id}>
                  {position > 0 && " · "}
                  {player(member.playerIndex ?? 0)} {label(member)}
                </span>
              ))}
            </Typography>
            {issue.missing.map(({ playerIndex, capture }) => (
              <Typography
                key={playerIndex}
                variant="caption"
                sx={{ color: "text.secondary", lineHeight: 1.3 }}
              >
                {!capture
                  ? t(tr.noPartner, lang)(playerName(playerIndex))
                  : capture.isDead
                    ? t(tr.deadPartner, lang)(
                        playerName(playerIndex),
                        label(capture),
                      )
                    : t(tr.missing, lang)(
                        playerName(playerIndex),
                        label(capture),
                      )}
              </Typography>
            ))}
          </Stack>
        ))}
      </Stack>
    </Alert>
  );
}
