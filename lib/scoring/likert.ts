/**
 * The rating scale, in one place.
 *
 * Four points, deliberately with no midpoint (changed 2026-08-03 on the
 * project owner's decision). Students who were unsure defaulted to the middle
 * "Neutral" option, which read as a skip button and flattened their results.
 * An even number of points forces a lean.
 *
 * Everything that renders or scores a rating question reads these constants,
 * so the scale can only ever be changed in one place. Note that scoring
 * formulas divide by (LIKERT_MAX - LIKERT_MIN), not a hardcoded 4.
 */

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 4;

/** Width of the scale — the denominator for normalising a single answer. */
export const LIKERT_RANGE = LIKERT_MAX - LIKERT_MIN;

export interface LikertPoint {
  value: number;
  emoji: string;
  label: string;
}

export const LIKERT_POINTS: LikertPoint[] = [
  { value: 1, emoji: "\u{1F612}", label: "Strongly Dislike" },
  { value: 2, emoji: "\u{1F615}", label: "Dislike" },
  { value: 3, emoji: "\u{1F642}", label: "Like" },
  { value: 4, emoji: "\u{1F929}", label: "Strongly Like" },
];

/** Clamp and round a raw response to an integer inside the scale. */
export function sanitizeLikert(v: number): number {
  const rounded = Math.round(v);
  return Math.max(LIKERT_MIN, Math.min(LIKERT_MAX, rounded));
}

/**
 * Flip a reverse-worded item onto the same direction as everything else.
 *
 * "I would rather sit in a library than work outdoors with tools" measures
 * Realistic *negatively* — strong agreement is evidence against it. Without
 * this flip such an answer was added to the score it should subtract from,
 * and since each RIASEC type has only two rating questions, half the evidence
 * for R, A, E and C was inverted.
 */
export function reverseLikert(v: number): number {
  return LIKERT_MIN + LIKERT_MAX - sanitizeLikert(v);
}
