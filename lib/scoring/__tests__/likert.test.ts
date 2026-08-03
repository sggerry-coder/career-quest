import { describe, it, expect } from "vitest";
import {
  LIKERT_MIN,
  LIKERT_MAX,
  LIKERT_POINTS,
  sanitizeLikert,
  reverseLikert,
} from "../likert";
import { calculateRiasecType } from "../riasec";

describe("the scale itself", () => {
  it("has four points and no midpoint", () => {
    expect(LIKERT_POINTS).toHaveLength(4);
    // An even number of points is the whole reason for the change: there is
    // no option a student can pick that expresses no lean at all.
    expect(LIKERT_POINTS.length % 2).toBe(0);
    expect(LIKERT_POINTS.map((p) => p.value)).toEqual([1, 2, 3, 4]);
  });

  it("has no option labelled Neutral", () => {
    expect(LIKERT_POINTS.some((p) => /neutral/i.test(p.label))).toBe(false);
  });

  it("spans exactly LIKERT_MIN to LIKERT_MAX", () => {
    const values = LIKERT_POINTS.map((p) => p.value);
    expect(Math.min(...values)).toBe(LIKERT_MIN);
    expect(Math.max(...values)).toBe(LIKERT_MAX);
  });
});

describe("sanitizeLikert", () => {
  it("clamps below and above the scale", () => {
    expect(sanitizeLikert(0)).toBe(1);
    expect(sanitizeLikert(-4)).toBe(1);
    expect(sanitizeLikert(9)).toBe(4);
  });

  it("clamps a legacy 5 from the old five-point scale", () => {
    expect(sanitizeLikert(5)).toBe(4);
  });

  it("rounds fractions", () => {
    expect(sanitizeLikert(2.7)).toBe(3);
    expect(sanitizeLikert(3.2)).toBe(3);
  });
});

describe("reverseLikert", () => {
  it("mirrors each point onto its opposite", () => {
    expect(reverseLikert(1)).toBe(4);
    expect(reverseLikert(2)).toBe(3);
    expect(reverseLikert(3)).toBe(2);
    expect(reverseLikert(4)).toBe(1);
  });

  it("is its own inverse", () => {
    for (const p of LIKERT_POINTS) {
      expect(reverseLikert(reverseLikert(p.value))).toBe(p.value);
    }
  });

  it("clamps before flipping, so a legacy 5 mirrors like a 4", () => {
    expect(reverseLikert(5)).toBe(1);
  });
});

describe("reverse-worded items score the opposite way", () => {
  // "I would rather sit in a library than work outdoors with tools" measures
  // Realistic negatively. Strong agreement is evidence AGAINST Realistic.
  // Before 2026-08-03 nothing read the reverse_scored flag, so an answer like
  // this was added to the score it should have pulled down.
  it("strong agreement with a reverse item scores as strong disagreement", () => {
    const agreedStrongly = 4;
    expect(calculateRiasecType([reverseLikert(agreedStrongly)])).toBe(0);
    // Which is the opposite of what it used to produce:
    expect(calculateRiasecType([agreedStrongly])).toBe(100);
  });

  it("a consistent student now lands at an extreme instead of the middle", () => {
    // Two questions on the same type: one worded forward, one worded backward.
    // A student who genuinely likes Realistic answers 4 to the forward item
    // and 1 to the backward one ("I'd rather be in a library" — no).
    const forward = 4;
    const backwardAsAnswered = 1;

    const scoredCorrectly = calculateRiasecType([
      forward,
      reverseLikert(backwardAsAnswered),
    ]);
    const scoredTheOldBrokenWay = calculateRiasecType([
      forward,
      backwardAsAnswered,
    ]);

    expect(scoredCorrectly).toBe(100);
    // The old behaviour averaged a real preference away to the midpoint.
    expect(scoredTheOldBrokenWay).toBe(50);
  });
});
