import {
  deriveCharacterClass,
  type DerivedClass,
} from "@/lib/character/classes";

/**
 * The class as the finished chart supports it.
 *
 * Mid-quest, the class is locked: it may deepen but must never flip, so a
 * student is not renamed under their own feet question by question. That rule
 * is right while the quest is running and wrong at the end of it, because the
 * confirmatory round keeps moving the chart after the lock is set.
 *
 * `selectAdaptiveQuestions` deliberately gives the leading interest type
 * `ambiguity: Infinity` so it is never chosen, and ranks every other type by
 * how close it is to overtaking. The last five questions therefore feed the
 * class closest to taking the lead and nothing to the leader itself; with only
 * 2 rating items per type, two confirmatory answers move a type by tens of
 * points. A student locked as Guardian-Vanguard finished on a chart reading
 * E 94.2 > S 90 -- and the dashboard prints the class name *inside* those
 * bars, so the badge sat on top of the evidence against it, permanently.
 *
 * So the class is derived once more when the questions run out, before it is
 * saved. The two rules genuinely conflict here and the acceptance criterion
 * governs: the class shown must be derivable from the chart shown beside it.
 * "Must not flip" survives in substance rather than in letter -- the flip can
 * only happen after the last question, and the completion screen names the
 * change instead of letting the student discover it on the dashboard.
 *
 * The one thing a re-derivation must not do is take a name away. If the final
 * chart has no lead at all (every type under its floor, deriveCharacterClass's
 * Wanderer), the earned class stands: an unnamed student is "we don't know
 * yet", which is not something five extra answers can make true of someone who
 * has answered the whole instrument.
 */
export function resolveFinalClass(
  locked: DerivedClass,
  riasec: Record<string, number>,
  evidence?: Record<string, number>
): DerivedClass {
  const fromChart = deriveCharacterClass(riasec, evidence);
  if (!fromChart.isNamed) return locked;
  return fromChart;
}
