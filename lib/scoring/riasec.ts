const RIASEC_TYPES = ["R", "I", "A", "S", "E", "C"] as const;
export type RiasecType = (typeof RIASEC_TYPES)[number];

const RIASEC_DISPLAY_NAMES: Record<RiasecType, string> = {
  R: "MAKER",
  I: "INVESTIGATOR",
  A: "CREATOR",
  S: "HELPER",
  E: "LEADER",
  C: "ORGANIZER",
};

/**
 * Clamp and round a raw Likert/ipsative response value to integer 1-5.
 */
function sanitizeValue(v: number): number {
  const rounded = Math.round(v);
  return Math.max(1, Math.min(5, rounded));
}

/**
 * Normalize raw Likert responses for a single RIASEC type.
 * Formula: ((sum - count) / (count * 4)) * 100
 * Returns 0-100. Returns 0 for empty input.
 */
export function calculateRiasecType(rawScores: number[]): number {
  if (rawScores.length === 0) return 0;
  const sanitized = rawScores.map(sanitizeValue);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return ((sum - count) / (count * 4)) * 100;
}

/**
 * Calculate normalized scores for all 6 RIASEC types from raw Likert data.
 */
export function calculateAllRiasec(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    result[type] = calculateRiasecType(raw[type] || []);
  }
  return result;
}

/**
 * Merge Likert (70%) and ipsative (30%) normalized scores.
 * If ipsative score is null/undefined for a type, use Likert alone.
 */
export function mergeIpsativeScores(
  likert: Record<string, number>,
  ipsative: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    const likertScore = likert[type] ?? 0;
    const ipsativeScore = ipsative[type];
    if (ipsativeScore != null) {
      result[type] = likertScore * 0.7 + ipsativeScore * 0.3;
    } else {
      result[type] = likertScore;
    }
  }
  return result;
}

/**
 * Detect acquiescence bias: returns true if all 6 types score above 80.
 */
export function detectAcquiescenceBias(
  scores: Record<string, number>
): boolean {
  return RIASEC_TYPES.every((type) => (scores[type] ?? 0) > 80);
}

/**
 * Derive a CLASS label from RIASEC scores.
 *
 * Rules:
 * 1. Top 2 both > 50 and gap from 2nd to 3rd > 10 → "TYPE1-TYPE2"
 * 2. Top 1 > 50 and leads 2nd by > 15 → single "TYPE1"
 * 3. All < 40 → "SEEKER"
 * 4. Otherwise → "EXPLORER"
 */
export function deriveClassLabel(scores: Record<string, number>): string {
  const sorted = RIASEC_TYPES.map((type) => ({
    type,
    score: scores[type] ?? 0,
  })).sort((a, b) => b.score - a.score);

  const [first, second, third] = sorted;

  if (
    first.score > 50 &&
    second.score > 50 &&
    second.score - third.score > 10
  ) {
    return `${RIASEC_DISPLAY_NAMES[first.type]}-${RIASEC_DISPLAY_NAMES[second.type]}`;
  }

  if (first.score > 50) {
    if (first.score - second.score > 15) {
      return RIASEC_DISPLAY_NAMES[first.type];
    }
    return "EXPLORER";
  }

  if (sorted.every((s) => s.score < 40)) {
    return "SEEKER";
  }

  return "EXPLORER";
}
