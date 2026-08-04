import { accumulateStrengths } from "@/lib/scoring/strengths";

/**
 * Relics are earned representations of traits the student demonstrated.
 *
 * They are displayed, never applied. A relic that raised a score would make
 * the profile a measure of the student's loot instead of the student, and two
 * identical sets of answers would produce different results.
 */

export const RELIC_THRESHOLD = 2;

export interface Relic {
  id: string;
  name: string;
  icon: string;
  strength: string;
  /** How many times the student showed this trait. Used for the "why". */
  timesShown: number;
}

const RELIC_BY_STRENGTH: Record<string, { id: string; name: string; icon: string }> = {
  Achiever: { id: "finishers_seal", name: "Finisher's Seal", icon: "\u{1F3C5}" },
  Ideation: { id: "spark_stone", name: "Spark Stone", icon: "\u{1F4A0}" },
  Empathy: { id: "healers_kit", name: "Healer's Kit", icon: "\u{1F9EA}" },
  Command: { id: "rallying_banner", name: "Rallying Banner", icon: "\u{1F6A9}" },
  Creativity: { id: "dreamers_brush", name: "Dreamer's Brush", icon: "\u{1F58C}\u{FE0F}" },
  Analytical: { id: "truthseekers_lens", name: "Truthseeker's Lens", icon: "\u{1F50D}" },
  Communication: { id: "orators_ring", name: "Orator's Ring", icon: "\u{1F48D}" },
  Adaptability: { id: "travellers_boots", name: "Traveller's Boots", icon: "\u{1F97E}" },
};

/**
 * The self_map key the per-strength counts are persisted under.
 *
 * self_map is jsonb, so this needs no migration. It exists because the
 * `strengths` column holds the *deduped* top five -- every entry appears
 * exactly once, so a threshold of 2 can never be met from it and the shelf
 * would always be empty.
 */
export const STRENGTH_COUNTS_KEY = "strength_counts";

/**
 * Relics from a per-strength count map -- the shape that survives a save.
 *
 * Values are validated rather than trusted: self_map is jsonb and could hold
 * anything from an older or hand-edited row.
 */
export function relicsFromCounts(counts: Record<string, unknown>): Relic[] {
  return Object.entries(counts)
    .filter(
      ([strength, count]) =>
        typeof count === "number" &&
        Number.isFinite(count) &&
        count >= RELIC_THRESHOLD &&
        RELIC_BY_STRENGTH[strength] !== undefined
    )
    .map(([strength, count]) => ({
      ...RELIC_BY_STRENGTH[strength],
      strength,
      timesShown: count as number,
    }))
    .sort((a, b) => b.timesShown - a.timesShown);
}

/**
 * Relics from a student's persisted self_map -- what the dashboard actually
 * has to work with after a reload. Anything unexpected yields no relics
 * rather than throwing.
 */
export function relicsFromSelfMap(selfMap: unknown): Relic[] {
  if (!selfMap || typeof selfMap !== "object") return [];
  const counts = (selfMap as Record<string, unknown>)[STRENGTH_COUNTS_KEY];
  if (!counts || typeof counts !== "object") return [];
  return relicsFromCounts(counts as Record<string, unknown>);
}

/**
 * Relics from the raw, repeated signal list as it exists in memory during a
 * quest. The list is not persisted, so the dashboard uses relicsFromSelfMap.
 */
export function earnedRelics(strengthSignals: string[]): Relic[] {
  return relicsFromCounts(accumulateStrengths(strengthSignals));
}
