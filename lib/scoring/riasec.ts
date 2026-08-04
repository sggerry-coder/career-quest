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
 *
 * This is a check on the *shape of the result*: a profile where everything
 * leads is a profile that discriminates nothing, and is no more usable for
 * career guidance than a blank one. It is no longer a check on how the
 * student answered -- see detectStraightLining for that. Reverse-worded items
 * mean the two came apart: a student who taps "Strongly Like" on all twelve
 * rating items scores {R:65, I:100, A:55, S:90, E:35, C:35}, which this
 * function correctly reports as false while being exactly the behaviour the
 * flag exists to catch.
 */
export function detectAcquiescenceBias(
  scores: Record<string, number>
): boolean {
  return RIASEC_TYPES.every((type) => (scores[type] ?? 0) > 80);
}

/**
 * How many identical answers in a row count as straight-lining.
 *
 * Session 1 asks 12 rating items, four of them reverse-worded (R-02, A-01,
 * E-01, C-02). In the order they are asked, the longest stretch containing no
 * reverse item is three questions, so any run of 8 spans at least two reverse
 * items -- meaning the student agreed just as strongly with a statement and
 * with its opposite, at least twice. That is not an answer, it is a tapping
 * pattern. Below 8 the run is reachable by a genuinely consistent student and
 * flagging them would be worse than not flagging anyone.
 */
export const STRAIGHT_LINING_RUN = 8;

/**
 * Detect straight-lining: the same answer, over and over, on rating items.
 *
 * Works on the responses rather than the scores, because the scores can no
 * longer show it. Reverse scoring (correctly) flips four of the twelve items,
 * so uniform tapping now produces a lopsided-looking profile -- the branch
 * that added reverse scoring broke the one check built to catch the most
 * common form of disengaged answering in a classroom, and a student who
 * tapped "Strongly Like" 12 times was told with full confidence that they
 * were a Mage-Guardian.
 *
 * Values are the raw answers exactly as given, never the flipped ones: it is
 * the student's finger that repeats, not the scored value.
 */
export function detectStraightLining(
  ratingValues: number[],
  run: number = STRAIGHT_LINING_RUN
): boolean {
  if (run <= 0 || ratingValues.length < run) return false;

  let streak = 1;
  for (let i = 1; i < ratingValues.length; i += 1) {
    streak = ratingValues[i] === ratingValues[i - 1] ? streak + 1 : 1;
    if (streak >= run) return true;
  }
  return false;
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
