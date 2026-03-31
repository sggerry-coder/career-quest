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
 */
export function calculateAllValues(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of VALUES_DIMENSIONS) {
    result[dim] = calculateValuesDimension(raw[dim] || []);
  }
  return result;
}
