/**
 * Probability (0..1) to catch a Pokémon with a single Poké Ball at full HP
 * without status, using the Gen III+ capture formula.
 */
export function getCatchProbability(captureRate: number): number {
  if (captureRate <= 0) return 0;
  // Full HP: (3 × maxHP − 2 × HP) / (3 × maxHP) = 1/3; Poké Ball multiplier = 1
  const a = captureRate / 3;
  if (a >= 255) return 1;
  const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
  return Math.pow(b / 65536, 4);
}

export type CaptureDifficulty =
  "veryEasy" | "easy" | "medium" | "hard" | "veryHard";

/** Qualitative bucket for a capture rate, used for colors and labels */
export function getCaptureDifficulty(captureRate: number): CaptureDifficulty {
  if (captureRate >= 200) return "veryEasy";
  if (captureRate >= 120) return "easy";
  if (captureRate >= 60) return "medium";
  if (captureRate >= 30) return "hard";
  return "veryHard";
}

export const CAPTURE_DIFFICULTY_COLORS: Record<CaptureDifficulty, string> = {
  veryEasy: "#16a34a",
  easy: "#65a30d",
  medium: "#ca8a04",
  hard: "#ea580c",
  veryHard: "#dc2626",
};

export function formatCatchProbability(
  probability: number,
  lang: "fr" | "en",
): string {
  const percent = probability * 100;
  const digits = percent < 10 ? 1 : 0;
  return `${percent.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}
