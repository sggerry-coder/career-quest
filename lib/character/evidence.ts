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
 * Interest answers required before a class may be named. Derivation only
 * happens at block boundaries, and the interest block's 14 Likert items are
 * all inside a single block, so in the normal flow this threshold is cleared
 * all at once: first naming happens at the riasec -> riasec_mi boundary with
 * all 14 answers already in hand, not "partway through" anything. Where 10
 * (rather than 14, or 1) actually matters is a quit-and-resume: the hook
 * re-mounts and re-derives at whatever block the student resumes into, which
 * can land mid-interest-block with only some of the 14 answered. Set below
 * 14, a resume with most-but-not-all interest answers can still be named;
 * set above 5, the five (now interest-free) warm-up answers alone can't.
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
