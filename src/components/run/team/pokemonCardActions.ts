import translations, { t, type Lang } from "@/i18n/translations";

export interface CardAction {
  icon: string;
  title: string;
  className: string;
  onClick: () => void;
  sx: Record<string, unknown>;
}

interface GetPokemonCardActionsProps {
  lang: Lang;
  onEvolve?: () => void;
  onToggleDead?: (captureId: string) => void;
  captureId: string;
  primaryAction?: {
    icon: string;
    title: string;
    className: string;
    onClick: () => void;
  };
}

export function getPokemonCardActions({
  lang,
  onEvolve,
  onToggleDead,
  captureId,
  primaryAction,
}: GetPokemonCardActionsProps): CardAction[] {
  const tr = translations;

  const baseActionStyles = {
    position: "absolute" as const,
    width: "1.75rem",
    height: "1.75rem",
    minWidth: "1.75rem",
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: "0.9rem",
    background: "rgba(255, 255, 255, 0.9)",
    borderRadius: "0.25rem",
    cursor: "pointer",
    fontWeight: 600,
    zIndex: 10,
  };

  const actions: CardAction[] = [];

  // Add evolve button if handler is provided
  if (onEvolve) {
    const evolveAction: CardAction = {
      icon: "⬆",
      title: t(tr.pokemonCard.evolveButton, lang),
      className: "evolve-btn",
      onClick: onEvolve,
      sx: {
        ...baseActionStyles,
        top: 3,
        left: 3,
        color: "#10b981",
        border: "1px solid rgba(16, 185, 129, 0.3)",
        "&:hover": {
          color: "#047857",
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(16, 185, 129, 0.5)",
        },
      },
    };
    actions.push(evolveAction);
  }

  // Add dead button if handler is provided
  if (onToggleDead) {
    const deadAction: CardAction = {
      icon: "⚰️",
      title: t(tr.capturedPokemonCard.markAsDead, lang),
      className: "mark-dead-btn",
      onClick: () => onToggleDead(captureId),
      sx: {
        ...baseActionStyles,
        bottom: 3,
        left: 3,
        color: "#ef4444",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        "&:hover": {
          color: "#dc2626",
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(239, 68, 68, 0.5)",
        },
      },
    };
    actions.push(deadAction);
  }

  // Add primary action if provided (always positioned at top-right)
  if (primaryAction) {
    const isGreenButton =
      primaryAction.className === "add-to-team-btn" ||
      primaryAction.className === "resurrect-btn";

    const primaryActionWithStyles: CardAction = {
      ...primaryAction,
      sx: {
        ...baseActionStyles,
        top: 3,
        right: 3,
        ...(isGreenButton
          ? {
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              "&:hover": {
                color: "#047857",
                background: "rgba(255, 255, 255, 0.95)",
                borderColor: "rgba(16, 185, 129, 0.5)",
              },
            }
          : {
              color: "#dc2626",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              "&:hover": {
                color: "#991b1b",
                background: "rgba(255, 255, 255, 0.95)",
                borderColor: "rgba(220, 38, 38, 0.5)",
              },
            }),
      },
    };
    actions.push(primaryActionWithStyles);
  }

  return actions;
}
