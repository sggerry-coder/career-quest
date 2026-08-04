import { LIKERT_MIN, LIKERT_RANGE, sanitizeLikert } from "@/lib/scoring/likert";

const RIASEC_TYPES = ["R", "I", "A", "S", "E", "C"] as const;
export type RiasecType = (typeof RIASEC_TYPES)[number];

const RIASEC_DISPLAY_NAMES: Record<RiasecType, string> = {
  R: "MAKER",
  I: "INVESTIGATOR",
  A: "CREATOR",
  S: "HELPER",
  E: "LEADER",
  C: "ORGANIZER",
};

/**
 * Normalize raw Likert responses for a single RIASEC type.
 * Formula: ((sum - count * LIKERT_MIN) / (count * LIKERT_RANGE)) * 100
 * Returns 0-100. Returns 0 for empty input.
 *
 * Reverse-worded items must already be flipped by the caller (see
 * reverseLikert) — this function cannot tell them apart.
 */
export function calculateRiasecType(rawScores: number[]): number {
  if (rawScores.length === 0) return 0;
  const sanitized = rawScores.map(sanitizeLikert);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return ((sum - count * LIKERT_MIN) / (count * LIKERT_RANGE)) * 100;
}

/**
 * Normalized scores for all 6 types, keeping "nobody answered for this type"
 * apart from "answered, and it came out 0".
 *
 * calculateAllRiasec collapses the two into the same 0, and downstream that
 * difference is the whole question: a type with no answers must not be
 * merged, ranked or compared as though the student had put it at the bottom
 * of the scale. A type with even one answer always gets a number, including
 * 0 -- "strongly dislike, twice" is a reading, and an honest one.
 *
 * Guards against NaN: a non-finite result from a non-empty array is still 0,
 * because that is a broken input rather than a missing one.
 */
export function calculateAllRiasecOrNull(
  raw: Record<string, number[]>
): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const type of RIASEC_TYPES) {
    const answers = raw[type] || [];
    if (answers.length === 0) {
      result[type] = null;
      continue;
    }
    const score = calculateRiasecType(answers);
    result[type] = Number.isFinite(score) ? score : 0;
  }
  return result;
}

/**
 * Calculate normalized scores for all 6 RIASEC types from raw Likert data.
 * Guards against NaN: any non-finite result is replaced with 0.
 *
 * A type nobody answered for also reads 0 here. That is deliberate — every
 * consumer of a score record wants a number — but it means this function
 * cannot be used to decide anything that depends on whether the answer
 * exists. Use calculateAllRiasecOrNull for that.
 */
export function calculateAllRiasec(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [type, score] of Object.entries(calculateAllRiasecOrNull(raw))) {
    result[type] = score ?? 0;
  }
  return result;
}

/**
 * How many interest answers stand behind each type.
 *
 * Both instruments count: a rating item and a place in a ranking each say
 * something about one type. 0 means the student was never asked, or skipped
 * everything that would have said anything — which is not the same as a low
 * score and must not be ranked as one. See deriveClassLabel.
 */
export function buildRiasecEvidence(
  likertRaw: Record<string, number[]>,
  ipsativeRaw: Record<string, number[]>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    counts[type] =
      (likertRaw[type]?.length ?? 0) + (ipsativeRaw[type]?.length ?? 0);
  }
  return counts;
}

/**
 * Whether a type has any interest answer behind it at all.
 *
 * The counterpart of hasValuesReading, and the same trap in a different
 * shape. On this scale 0 is the bottom rather than the centre, so it looks
 * safer than a values 0 — but "rated at the bottom" and "never asked" still
 * arrive as the same number, and the chart printed both as a labelled row
 * with an empty bar and a hard 0. That is a claim about the student, and on
 * the type nobody asked about it is a false one. It matters more here than
 * anywhere: the class badge is read straight off these six rows, so a student
 * can see a name derived from evidence the chart is misrepresenting.
 *
 * No evidence at all reads as "assume answered", exactly as hasValuesReading
 * does, and for the same reason: a caller that cannot tell must not blank a
 * finished profile. The dashboard is that caller for a row written before
 * migration 00006 added the counts column. A missing key *within* an evidence
 * record is an absence that buildRiasecEvidence recorded — it always emits all
 * six — so that reads as no answer.
 */
export function hasRiasecReading(
  type: string,
  evidence?: Record<string, number>
): boolean {
  if (!evidence) return true;
  return (evidence[type] ?? 0) > 0;
}

/**
 * Merge the two interest instruments into one score per type:
 * 70% rating items, 30% forced ranking.
 *
 * The weights only mean anything where both instruments actually got an
 * answer about that type. `null` on either side means "not answered", and a
 * missing side is dropped rather than folded in as a 0 — whichever side
 * exists carries the whole score.
 *
 * Reading a missing side as 0 is the defect this exists to prevent. The two
 * rankings cover three types each (R/A/E and I/S/C), so skipping one of them
 * left three types on likert * 0.7 + 0 * 0.3: a flat 30% cut applied to the
 * types the student was never asked about rather than to anything they said.
 * Enough, on its own, to move the lead from one class to another. The same
 * held in reverse for a type whose rating items were skipped but which the
 * student did rank — "the most enjoyable thing here" scored 30 out of 100.
 */
export function mergeIpsativeScores(
  likert: Record<string, number | null>,
  ipsative: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    const likertScore = likert[type];
    const ipsativeScore = ipsative[type];
    if (likertScore != null && ipsativeScore != null) {
      result[type] = likertScore * 0.7 + ipsativeScore * 0.3;
    } else {
      // One side or neither. 0 for neither keeps the function total (see
      // nan-guard.test.ts); buildRiasecEvidence is what tells that 0 apart
      // from a scored one.
      result[type] = likertScore ?? ipsativeScore ?? 0;
    }
  }
  return result;
}

/**
 * Detect acquiescence bias: returns true if all 6 types score above 80.
 *
 * This is a check on the *shape of the result*: a profile where everything
 * leads is a profile that discriminates nothing, and is no more usable for
 * career guidance than a blank one. It is no longer a check on how the
 * student answered -- see detectStraightLining for that. Reverse-worded items
 * mean the two came apart: a student who taps "Strongly Like" on all twelve
 * rating items scores {R:65, I:100, A:55, S:90, E:35, C:35}, which this
 * function correctly reports as false while being exactly the behaviour the
 * flag exists to catch.
 */
export function detectAcquiescenceBias(
  scores: Record<string, number>
): boolean {
  return RIASEC_TYPES.every((type) => (scores[type] ?? 0) > 80);
}

/**
 * How many identical answers in a row count as straight-lining.
 *
 * Session 1 asks 12 rating items, four of them reverse-worded (R-02, A-01,
 * E-01, C-02). In the order they are asked, the longest stretch containing no
 * reverse item is three questions, so any run of 8 spans at least two reverse
 * items -- meaning the student agreed just as strongly with a statement and
 * with its opposite, at least twice. That is not an answer, it is a tapping
 * pattern. Below 8 the run is reachable by a genuinely consistent student and
 * flagging them would be worse than not flagging anyone.
 */
export const STRAIGHT_LINING_RUN = 8;

/**
 * Detect straight-lining: the same answer, over and over, on rating items.
 *
 * Works on the responses rather than the scores, because the scores can no
 * longer show it. Reverse scoring (correctly) flips four of the twelve items,
 * so uniform tapping now produces a lopsided-looking profile -- the branch
 * that added reverse scoring broke the one check built to catch the most
 * common form of disengaged answering in a classroom, and a student who
 * tapped "Strongly Like" 12 times was told with full confidence that they
 * were a Mage-Guardian.
 *
 * Values are the raw answers exactly as given, never the flipped ones: it is
 * the student's finger that repeats, not the scored value.
 */
export function detectStraightLining(
  ratingValues: number[],
  run: number = STRAIGHT_LINING_RUN
): boolean {
  if (run <= 0 || ratingValues.length < run) return false;

  let streak = 1;
  for (let i = 1; i < ratingValues.length; i += 1) {
    streak = ratingValues[i] === ratingValues[i - 1] ? streak + 1 : 1;
    if (streak >= run) return true;
  }
  return false;
}

/**
 * Derive a CLASS label from RIASEC scores.
 *
 * Rules, applied to the types the student actually answered for:
 * 1. Top 2 both > 50 and gap from 2nd to 3rd > 10 → "TYPE1-TYPE2"
 * 2. Top 1 > 50 and leads 2nd by > 15 → single "TYPE1"
 * 3. All < 40 → "SEEKER"
 * 4. Otherwise → "EXPLORER"
 *
 * @param evidence - Optional answer count per type, from buildRiasecEvidence.
 *   Every rule above is a comparison, and an unanswered type scores 0 — so
 *   without this a hole in the data reads as the strongest possible evidence
 *   of dislike and manufactures exactly the gaps rules 1 and 2 look for. A
 *   student who answered the two Helper items and skipped the rest was named
 *   HELPER outright, leading five types by 100 points on questions nobody had
 *   asked them. Types with no evidence are dropped from the ranking instead,
 *   and fewer than two types left means there is no comparison left to make:
 *   SEEKER, "still forming", which is the honest answer to a mostly blank
 *   instrument. Omit the argument and every type counts, as before.
 */
export function deriveClassLabel(
  scores: Record<string, number>,
  evidence?: Record<string, number>
): string {
  const sorted = RIASEC_TYPES.map((type) => ({
    type,
    score: scores[type] ?? 0,
  }))
    .filter((entry) => (evidence?.[entry.type] ?? 1) > 0)
    .sort((a, b) => b.score - a.score);

  // One type answered, or none: nothing leads anything.
  if (sorted.length < 2) {
    return "SEEKER";
  }

  const [first, second, third] = sorted;

  // Rule 1 needs a real third type to stand apart from. With only two
  // answered types there is no rest-of-the-profile for the top two to lead.
  if (
    third &&
    first.score > 50 &&
    second.score > 50 &&
    second.score - third.score > 10
  ) {
    return `${RIASEC_DISPLAY_NAMES[first.type]}-${RIASEC_DISPLAY_NAMES[second.type]}`;
  }

  if (first.score > 50) {
    if (first.score - second.score > 15) {
      return RIASEC_DISPLAY_NAMES[first.type];
    }
    return "EXPLORER";
  }

  if (sorted.every((s) => s.score < 40)) {
    return "SEEKER";
  }

  return "EXPLORER";
}
