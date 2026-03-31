export const MBTI_DICHOTOMIES = ["EI", "SN", "TF", "JP"] as const;
export type MbtiDichotomy = (typeof MBTI_DICHOTOMIES)[number];

/**
 * Maps dichotomy to [negative_letter, positive_letter].
 * Negative score (-100) = first letter, positive score (+100) = second letter.
 */
const DICHOTOMY_POLES: Record<MbtiDichotomy, [string, string]> = {
  EI: ["I", "E"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

const STILL_EMERGING_THRESHOLD = 35;

/**
 * Clamp and round a raw spectrum value to integer -3 to +3.
 */
function sanitizeValue(v: number): number {
  const rounded = Math.round(v);
  return Math.max(-3, Math.min(3, rounded));
}

/**
 * Normalize raw responses for a single MBTI dichotomy.
 * Formula: (sum / (count * 3)) * 100
 * Returns -100 to +100. Returns 0 for empty input.
 */
export function calculateMbtiDichotomy(rawValues: number[]): number {
  if (rawValues.length === 0) return 0;
  const sanitized = rawValues.map(sanitizeValue);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return (sum / (count * 3)) * 100;
}

/**
 * Calculate normalized scores for all 4 MBTI dichotomies.
 */
export function calculateAllMbti(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dichotomy of MBTI_DICHOTOMIES) {
    result[dichotomy] = calculateMbtiDichotomy(raw[dichotomy] || []);
  }
  return result;
}

/**
 * Determine if a dichotomy score is too close to center to be definitive.
 * With 2 questions per dichotomy, scores of -33, 0, +33 are "still emerging".
 */
export function isStillEmerging(score: number): boolean {
  return Math.abs(score) < STILL_EMERGING_THRESHOLD;
}

/**
 * Derive the emerging MBTI type string from all dichotomy scores.
 * Returns type (e.g. "IN_J") and display (e.g. "I N _ J").
 */
export function deriveEmergingType(scores: Record<string, number>): {
  type: string;
  display: string;
} {
  const letters: string[] = [];

  for (const dichotomy of MBTI_DICHOTOMIES) {
    const score = scores[dichotomy] ?? 0;
    if (isStillEmerging(score)) {
      letters.push("_");
    } else {
      const [negativeLetter, positiveLetter] = DICHOTOMY_POLES[dichotomy];
      letters.push(score < 0 ? negativeLetter : positiveLetter);
    }
  }

  return {
    type: letters.join(""),
    display: letters.join(" "),
  };
}
