"use client";

import { Alert, Box, Typography } from "@mui/material";
import { isOverlayTeamLive, type OverlayData } from "@/lib/tracker/overlay";
import { currentOverlayView } from "@/lib/tracker/overlay-control";
import SpriteTeam from "@/components/share/SpriteTeam";
import FocusCard from "./FocusCard";
import { useLanguage } from "@/context/LanguageContext";
import translations, { t } from "@/i18n/translations";

export default function OverlayPresentation({
  data,
  error,
  now,
  compact,
}: {
  data: OverlayData | null;
  error: string;
  now: number;
  compact: boolean;
}) {
  const { lang } = useLanguage();
  const text = translations.liveView;
  const view = data ? currentOverlayView(data.control, now) : undefined;
  const teams =
    data?.teams.filter(
      (team) => !view?.playerId || team.playerId === view.playerId,
    ) ?? [];
  const team = teams[0];
  const member =
    view?.mode === "pokemon"
      ? view.slot
        ? team?.members[view.slot - 1]
        : team?.members.find((entry) => entry.id === view.captureId)
      : (team?.members.find(
          (entry) => entry.identity && entry.identity === team.activeIdentity,
        ) ?? team?.members[0]);
  const hidden = view?.mode === "hidden";
  const columns = teams.length === 1 ? [teams[0], teams[0]] : teams;
  const stale = team && !isOverlayTeamLive(team, now);
  const staleTeams = teams.filter(
    (entry) => entry.lastSeenAt > 0 && !isOverlayTeamLive(entry, now),
  );
  return (
    <>
      <style>{`
        html, body { background: transparent !important; overflow: hidden; }
        @keyframes nuz-overlay-reveal { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <Box
        key={`${view?.mode}-${data?.control.revision}`}
        data-testid="obs-overlay"
        data-mode={view?.mode ?? "loading"}
        aria-hidden={hidden}
        sx={{
          visibility: hidden ? "hidden" : "visible",
          position: "relative",
          opacity: error && data ? 0.6 : 1,
          animation: hidden ? "none" : "nuz-overlay-reveal 160ms ease-out",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {error && !hidden && <Alert severity="warning">{error}</Alert>}
        {(view?.mode === "team" || hidden) &&
          (compact ? (
            <Box
              sx={{
                maxWidth: 520,
                bgcolor: "#17212be8",
                border: "1px solid #526173",
                borderRadius: 1,
                px: 1,
              }}
            >
              {teams.map((entry) => (
                <SpriteTeam
                  key={entry.playerId}
                  members={entry.members}
                  ribbon
                />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                height: "100vh",
                width: "100vw",
              }}
            >
              {columns.map((entry, index) => (
                <SpriteTeam
                  key={`${entry.playerId}-${index}`}
                  members={entry.members}
                  mirror={index % 2 === 1}
                  fullHeight
                />
              ))}
            </Box>
          ))}
        {(view?.mode === "live" || view?.mode === "pokemon") && (
          <Box sx={{ width: 400, maxWidth: "100vw" }}>
            {member ? (
              <FocusCard member={member} gameVersion={data?.gameVersion} />
            ) : (
              <Alert severity="info">{t(text.noMatchingMember, lang)}</Alert>
            )}
            {stale && (
              <Typography
                sx={{
                  bgcolor: "#17212b",
                  color: "#fcd34d",
                  fontSize: "0.7rem",
                  px: 1,
                }}
              >
                {t(
                  team.suspended ? text.timelinePaused : text.statusManual,
                  lang,
                )}
              </Typography>
            )}
          </Box>
        )}
        {view?.mode === "team" && staleTeams.length > 0 && (
          <Typography
            sx={{
              position: compact ? "static" : "absolute",
              bottom: 8,
              left: 8,
              width: "fit-content",
              maxWidth: "100%",
              bgcolor: "#17212be8",
              color: "#fcd34d",
              fontSize: "0.65rem",
              px: 1,
              borderRadius: 0.5,
            }}
          >
            {t(
              text.lastKnownState,
              lang,
            )(staleTeams.map((entry) => entry.name).join(", "))}
          </Typography>
        )}
      </Box>
    </>
  );
}
