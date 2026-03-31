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
 * Normalize raw signal weights for a single MI dimension.
 * Formula: (sum / (count * max_weight)) * 100
 * Returns 0-100. Returns 0 for empty input.
 */
export function calculateMiDimension(
  rawSignals: number[],
  maxWeight: number
): number {
  if (rawSignals.length === 0 || maxWeight === 0) return 0;
  const count = rawSignals.length;
  const sum = rawSignals.reduce((a, b) => a + b, 0);
  return (sum / (count * maxWeight)) * 100;
}

/**
 * Calculate normalized scores for all 8 MI dimensions.
 */
export function calculateAllMi(
  raw: Record<string, number[]>,
  maxWeight: number = 2
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of MI_DIMENSIONS) {
    result[dim] = calculateMiDimension(raw[dim] || [], maxWeight);
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
