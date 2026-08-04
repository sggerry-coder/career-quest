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
 * Split one answer into per-dimension endorsements, each in [0, 1].
 *
 * An option's MI signals share out that option's whole weight, and different
 * questions budget differently: a warm-up option carries a single signal of
 * weight 1, an MI-block option carries 2 -- either all on one dimension
 * (`{ linguistic: 2 }`) or split across two (`{ logical: 1, intrapersonal: 1 }`).
 * So a weight of 1 means "all of this answer" in the warm-up and "half of it"
 * in the MI block, and the raw weight on its own cannot tell the two apart.
 *
 * Dividing by the option's own total is what recovers the difference, and it
 * is the fix for a normalisation that punished evidence: scores were computed
 * as sum / (count * 2), so a warm-up pick could never exceed 50 however many
 * times the student made it. A dimension chosen five times in the warm-up
 * (5 / (5*2) = 50) ranked below one chosen twice in the MI block
 * (4 / (2*2) = 100), and "your strongest learning styles" put the thing they
 * picked twice above the thing they picked five times.
 *
 * riasec_* keys on the same option belong to the interest instrument and take
 * no part in the MI budget.
 */
export function miEndorsements(
  frameworkSignals: Record<string, number>
): Record<string, number> {
  const weights: Record<string, number> = {};
  let total = 0;
  for (const [key, weight] of Object.entries(frameworkSignals)) {
    if (key.startsWith("riasec_")) continue;
    // Either "mi_spatial" or a bare dimension key ("spatial"); both forms
    // appear in the question data.
    const dim = key.startsWith("mi_") ? key.slice("mi_".length) : key;
    weights[dim] = (weights[dim] ?? 0) + weight;
    total += weight;
  }

  if (total <= 0) return {};

  const endorsements: Record<string, number> = {};
  for (const [dim, weight] of Object.entries(weights)) {
    endorsements[dim] = weight / total;
  }
  return endorsements;
}

/**
 * Normalize a dimension's endorsements into a 0-100 score.
 *
 * The mean of the endorsements: what share of the answers that touched this
 * dimension went to it wholly. Returns 0 for fewer than MIN_MI_SIGNALS
 * signals -- a single answer is not evidence of a strongest anything.
 *
 * Values are clamped into [0, 1] first. A mid-session checkpoint written
 * before endorsements replaced raw weights holds 1s and 2s; clamping rescores
 * it under the current rule rather than letting a stored 2 read as 200.
 */
export function calculateMiDimension(endorsements: number[]): number {
  if (endorsements.length < MIN_MI_SIGNALS) return 0;
  const clamped = endorsements.map((v) =>
    Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
  );
  const sum = clamped.reduce((a, b) => a + b, 0);
  return (sum / clamped.length) * 100;
}

/**
 * Calculate normalized scores for all 8 MI dimensions.
 * Guards against NaN: any non-finite result is replaced with 0.
 */
export function calculateAllMi(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of MI_DIMENSIONS) {
    const score = calculateMiDimension(raw[dim] || []);
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
