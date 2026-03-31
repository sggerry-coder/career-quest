/**
 * Count frequency of each strength signal from warm-up responses.
 * Returns a map of strength category → count.
 */
export function accumulateStrengths(
  signals: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const signal of signals) {
    counts[signal] = (counts[signal] || 0) + 1;
  }
  return counts;
}

/**
 * Get top N strength categories sorted by frequency descending.
 * Ties are broken by first-seen order (stable sort).
 */
export function getTopStrengths(signals: string[], n: number): string[] {
  const counts = accumulateStrengths(signals);

  // Preserve first-seen order for tie-breaking
  const seen: string[] = [];
  for (const signal of signals) {
    if (!seen.includes(signal)) {
      seen.push(signal);
    }
  }

  return seen
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, n);
}
