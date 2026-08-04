/**
 * How much evidence the app needs before it will name a student.
 *
 * The class used to be derived at the first block boundary -- question 6 --
 * from five ice-breaker answers, and then locked, so the ~20 interest
 * questions that followed could never displace it. A student who picked
 * "help someone out" four times and "build something" once was named
 * Warsmith, permanently, because a single pick saturated the scale and the
 * tie broke on internal ordering.
 */

/**
 * Interest answers required before a class may be named. The interest block
 * contributes 14 Likert items; this threshold sits inside it, so a student is
 * named partway through the questions that actually measure interests.
 */
export const MIN_INTEREST_RESPONSES = 10;

/** Total interest answers recorded so far, across all six types. */
export function countInterestResponses(
  riasecRaw: Record<string, number[]>
): number {
  return Object.values(riasecRaw).reduce(
    (total, answers) => total + (Array.isArray(answers) ? answers.length : 0),
    0
  );
}
