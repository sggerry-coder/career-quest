export const MI_DIMENSIONS = [
  "linguistic",
  "logical",
  "spatial",
  "musical",
  "bodily",
  "interpersonal",
  "intrapersonal",
  "naturalistic",
] as const;

export type MiDimension = (typeof MI_DIMENSIONS)[number];

/**
 * Minimum number of signals required before a dimension is scored at all.
 * One click used to be enough to put a dimension at a full 100 and land it
 * top of "your strongest learning styles" -- a single answer is not evidence
 * of a strongest anything. Below this, the dimension reads as 0 (no
 * reading yet) rather than a confident score built on one data point.
 */
export const MIN_MI_SIGNALS = 2;

/**
 * Normalize raw signal weights for a single MI dimension.
 * Formula: (sum / (count * max_weight)) * 100
 * Returns 0-100. Returns 0 for empty input or fewer than MIN_MI_SIGNALS
 * signals.
 */
export function calculateMiDimension(
  rawSignals: number[],
  maxWeight: number
): number {
  if (rawSignals.length < MIN_MI_SIGNALS || maxWeight === 0) return 0;
  const count = rawSignals.length;
  const sum = rawSignals.reduce((a, b) => a + b, 0);
  return (sum / (count * maxWeight)) * 100;
}

/**
 * Calculate normalized scores for all 8 MI dimensions.
 * Guards against NaN: any non-finite result is replaced with 0.
 */
export function calculateAllMi(
  raw: Record<string, number[]>,
  maxWeight: number = 2
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of MI_DIMENSIONS) {
    const score = calculateMiDimension(raw[dim] || [], maxWeight);
    result[dim] = Number.isFinite(score) ? score : 0;
  }
  return result;
}

/**
 * Get top N MI dimensions sorted by score descending.
 */
export function getTopMi(
  scores: Record<string, number>,
  n: number
): Array<{ dimension: string; score: number }> {
  return Object.entries(scores)
    .map(([dimension, score]) => ({ dimension, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
