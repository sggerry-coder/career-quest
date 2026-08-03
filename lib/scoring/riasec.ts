import { LIKERT_MIN, LIKERT_RANGE, sanitizeLikert } from "@/lib/scoring/likert";

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
 * Normalize raw Likert responses for a single RIASEC type.
 * Formula: ((sum - count * LIKERT_MIN) / (count * LIKERT_RANGE)) * 100
 * Returns 0-100. Returns 0 for empty input.
 *
 * Reverse-worded items must already be flipped by the caller (see
 * reverseLikert) — this function cannot tell them apart.
 */
export function calculateRiasecType(rawScores: number[]): number {
  if (rawScores.length === 0) return 0;
  const sanitized = rawScores.map(sanitizeLikert);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return ((sum - count * LIKERT_MIN) / (count * LIKERT_RANGE)) * 100;
}

/**
 * Calculate normalized scores for all 6 RIASEC types from raw Likert data.
 * Guards against NaN: any non-finite result is replaced with 0.
 */
export function calculateAllRiasec(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    const score = calculateRiasecType(raw[type] || []);
    result[type] = Number.isFinite(score) ? score : 0;
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
