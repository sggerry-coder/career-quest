/**
 * Straight-lining -- the same answer, over and over -- is the most common form
 * of disengaged answering in a classroom, and the branch that (correctly)
 * added reverse scoring broke the only check built to catch it.
 *
 * detectAcquiescenceBias asks the scores whether all six types came out above
 * 80. Reverse scoring flips four of the twelve rating items, so uniform
 * tapping no longer produces that shape: it produces a confident-looking
 * profile with two clear leaders. The check went quiet exactly where it was
 * needed, and a student who tapped "Strongly Like" twelve times was told, with
 * naming screen, palette, description and relics, that they were a
 * Mage-Guardian.
 */
import { describe, it, expect } from "vitest";
import {
  calculateAllRiasec,
  deriveClassLabel,
  detectAcquiescenceBias,
  detectStraightLining,
  STRAIGHT_LINING_RUN,
} from "@/lib/scoring/riasec";
import { scoredValue } from "@/hooks/use-scores";
import { riasecLikertQuestions } from "@/data/questions/session-1-core";
import { LIKERT_MAX, LIKERT_MIN } from "@/lib/scoring/likert";

describe("detectStraightLining", () => {
  it("flags a run of identical answers at the threshold", () => {
    const run = Array(STRAIGHT_LINING_RUN).fill(4);
    expect(detectStraightLining(run)).toBe(true);
  });

  it("does not flag one answer short of the threshold", () => {
    const run = Array(STRAIGHT_LINING_RUN - 1).fill(4);
    expect(detectStraightLining(run)).toBe(false);
  });

  it("flags a run anywhere in the sequence, not only at the end", () => {
    const values = [1, 3, ...Array(STRAIGHT_LINING_RUN).fill(2), 4, 1];
    expect(detectStraightLining(values)).toBe(true);
  });

  it("does not flag a broken run, however many of one value there are", () => {
    // Ten 4s, but never more than four in a row.
    const values = [4, 4, 4, 4, 1, 4, 4, 4, 4, 1, 4, 4];
    expect(detectStraightLining(values)).toBe(false);
  });

  it("flags the low end as readily as the high end", () => {
    expect(detectStraightLining(Array(STRAIGHT_LINING_RUN).fill(1))).toBe(true);
  });

  it("is not fooled by an empty or short response set", () => {
    expect(detectStraightLining([])).toBe(false);
    expect(detectStraightLining([4])).toBe(false);
  });

  it("only claims a run that really is one", () => {
    // The longest stretch of Session 1's rating items containing no
    // reverse-worded question is three, so a genuinely consistent student
    // cannot reach the threshold without contradicting themselves.
    const reverseIndices = riasecLikertQuestions
      .map((q, i) => (q.reverse_scored ? i : -1))
      .filter((i) => i >= 0);
    let longestGap = reverseIndices[0];
    for (let i = 1; i < reverseIndices.length; i += 1) {
      longestGap = Math.max(longestGap, reverseIndices[i] - reverseIndices[i - 1] - 1);
    }
    longestGap = Math.max(
      longestGap,
      riasecLikertQuestions.length - 1 - reverseIndices[reverseIndices.length - 1]
    );
    expect(STRAIGHT_LINING_RUN).toBeGreaterThan(longestGap);
  });
});

describe("a student who taps the same button every time", () => {
  /** Drive every real rating item at one value, through the real scoring path. */
  function answerEverything(value: number): {
    raw: Record<string, number[]>;
    ratingResponses: number[];
  } {
    const raw: Record<string, number[]> = { R: [], I: [], A: [], S: [], E: [], C: [] };
    const ratingResponses: number[] = [];
    for (const q of riasecLikertQuestions) {
      raw[q.framework_target].push(
        scoredValue({
          question_id: q.id,
          response_value: value,
          response_label: "",
          framework: q.framework,
          framework_target: q.framework_target,
          answered_at: 0,
          reverse_scored: q.reverse_scored,
        })
      );
      ratingResponses.push(value);
    }
    return { raw, ratingResponses };
  }

  it("is caught, and would not have been by the score-shape check alone", () => {
    const { raw, ratingResponses } = answerEverything(LIKERT_MAX);
    const scores = calculateAllRiasec(raw);

    // Reverse scoring rearranges uniform tapping into a confident profile:
    // I and S have no reverse item, so they stay at the top of the scale
    // while R, A, E and C get one 4 and one flipped 1.
    expect(scores).toEqual({ R: 50, I: 100, A: 50, S: 100, E: 50, C: 50 });
    expect(deriveClassLabel(scores)).toBe("INVESTIGATOR-HELPER");

    // The old check cannot fire on that shape...
    expect(detectAcquiescenceBias(scores)).toBe(false);
    // ...and the new one does not need to be able to.
    expect(detectStraightLining(ratingResponses)).toBe(true);
  });

  it("is caught at the bottom of the scale too", () => {
    const { ratingResponses } = answerEverything(LIKERT_MIN);
    expect(detectStraightLining(ratingResponses)).toBe(true);
  });
});
