export const VALUES_DIMENSIONS = [
  "security_adventure",
  "income_impact",
  "prestige_fulfilment",
  "structure_flexibility",
  "solo_team",
] as const;

export type ValuesDimension = (typeof VALUES_DIMENSIONS)[number];

/**
 * Clamp and round a raw spectrum value to integer -3 to +3.
 */
function sanitizeValue(v: number): number {
  const rounded = Math.round(v);
  return Math.max(-3, Math.min(3, rounded));
}

/**
 * Normalize raw responses for a single values dimension.
 * Same formula as MBTI: (sum / (count * 3)) * 100
 * Returns -100 to +100. Returns 0 for empty input.
 */
export function calculateValuesDimension(rawValues: number[]): number {
  if (rawValues.length === 0) return 0;
  const sanitized = rawValues.map(sanitizeValue);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return (sum / (count * 3)) * 100;
}

/**
 * Calculate normalized scores for all values dimensions.
 * Guards against NaN: any non-finite result is replaced with 0.
 *
 * 0 here is ambiguous in a way the other frameworks' 0 is not: on a spectrum
 * it is the exact centre, so an unanswered dimension and a genuinely balanced
 * one produce the same number, and 0 is the *most confident* thing this scale
 * can say about balance. hasValuesReading is how a caller tells them apart.
 */
export function calculateAllValues(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of VALUES_DIMENSIONS) {
    const score = calculateValuesDimension(raw[dim] || []);
    result[dim] = Number.isFinite(score) ? score : 0;
  }
  return result;
}

/**
 * Build per-dimension response counts from raw values response arrays.
 *
 * The counterpart of buildMbtiRawCounts, and for the same reason: the score
 * alone cannot say whether anyone answered.
 */
export function buildValuesRawCounts(
  raw: Record<string, number[]>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const dim of VALUES_DIMENSIONS) {
    counts[dim] = raw[dim]?.length ?? 0;
  }
  return counts;
}

/**
 * Whether a dimension has any answer behind it at all.
 *
 * Session 1 asks one question per values dimension, so one answer is the
 * whole reading and zero answers is nothing. An unanswered dimension scores
 * exactly 0, which the compass renders as a centred dot and the words
 * "Balanced for now" — a claim about the student, stated confidently, on no
 * evidence. This is what a caller checks before saying anything about a
 * dimension.
 *
 * No counts at all — a legacy persisted row that predates them — reads as
 * "assume answered", in the spirit of deriveEmergingType's fallback: an old
 * row is silent about what it recorded, and silently blanking every dimension
 * of a finished profile would be a worse lie than the one this guards
 * against. A missing key *within* a counts record is different, and reads as
 * no answer: buildValuesRawCounts always emits all five dimensions, so a gap
 * in one of its records is an absence it recorded, not an absence of records.
 */
export function hasValuesReading(
  dimension: string,
  rawCounts?: Record<string, number>
): boolean {
  if (!rawCounts) return true;
  return (rawCounts[dimension] ?? 0) > 0;
}
