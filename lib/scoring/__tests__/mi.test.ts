import { describe, it, expect } from "vitest";
import {
  MIN_MI_SIGNALS,
  calculateMiDimension,
  calculateAllMi,
  getTopMi,
  miEndorsements,
} from "../mi";
import { warmupQuestions, miQuestions } from "@/data/questions/session-1-core";

// mi_raw holds endorsements in [0, 1]: each dimension's share of the weight
// the chosen option carried. It used to hold the bare signal weight, and
// scores were sum / (count * 2) -- so a warm-up option, which carries a total
// weight of 1, could never score its dimension above 50 however many times
// the student chose it. See miEndorsements.

describe("miEndorsements", () => {
  it("gives a whole answer to the dimension that got the whole option", () => {
    expect(miEndorsements({ linguistic: 2 })).toEqual({ linguistic: 1 });
    expect(miEndorsements({ mi_logical: 1 })).toEqual({ logical: 1 });
  });

  it("splits an option that names two dimensions", () => {
    expect(miEndorsements({ logical: 1, intrapersonal: 1 })).toEqual({
      logical: 0.5,
      intrapersonal: 0.5,
    });
  });

  it("ignores interest signals sharing the option", () => {
    expect(miEndorsements({ riasec_R: 2, mi_bodily: 1 })).toEqual({ bodily: 1 });
  });

  it("returns nothing for an option with no MI signal", () => {
    expect(miEndorsements({ riasec_R: 2 })).toEqual({});
    expect(miEndorsements({})).toEqual({});
  });

  it("scores a warm-up pick and an MI-block pick as equally wholehearted", () => {
    // The two question sets budget differently -- 1 and 2 -- which is what
    // made the raw weight unreadable on its own.
    const warmup = warmupQuestions[0].options[1].framework_signals!;
    const miBlock = miQuestions[0].options[0].framework_signals!;
    expect(Object.values(warmup)[0]).toBe(1);
    expect(Object.values(miBlock)[0]).toBe(2);

    expect(Object.values(miEndorsements(warmup))[0]).toBe(1);
    expect(Object.values(miEndorsements(miBlock))[0]).toBe(1);
  });
});

describe("calculateMiDimension", () => {
  it("scores two whole endorsements at 100", () => {
    expect(calculateMiDimension([1, 1])).toBe(100);
  });

  it("scores two half endorsements at 50", () => {
    expect(calculateMiDimension([0.5, 0.5])).toBe(50);
  });

  it("scores [0] at 0", () => {
    expect(calculateMiDimension([0])).toBe(0);
  });

  it("does not score a dimension from a single signal, even a whole one", () => {
    // One click used to score this dimension a full 100 and land it top of
    // "your strongest learning styles". A single answer is not evidence.
    expect(calculateMiDimension([1])).toBe(0);
  });

  it("averages a mix of whole and half endorsements", () => {
    // (1 + 0.5 + 0.5) / 3 = 0.667
    expect(calculateMiDimension([1, 0.5, 0.5])).toBeCloseTo(66.7, 0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateMiDimension([])).toBe(0);
  });

  it("rescores a checkpoint written before endorsements existed", () => {
    // A stale mid-session snapshot holds bare weights (1s and 2s). Clamping
    // rescores them under the current rule instead of reading a 2 as 200.
    expect(calculateMiDimension([2, 2])).toBe(100);
    expect(calculateMiDimension([1, 1])).toBe(100);
  });
});

describe("more evidence must never rank lower", () => {
  it("a dimension picked five times in the warm-up outranks one picked twice in the MI block", () => {
    // The defect, in the review's own arithmetic:
    //   logical       5 warm-up picks, weight 1 each -> 5 / (5*2) * 100 =  50
    //   intrapersonal 2 MI-block picks, weight 2 each -> 4 / (2*2) * 100 = 100
    // "Your strongest learning styles" ranked the thing they picked twice
    // above the thing they picked five times.
    const warmupSignal = { mi_logical: 1 };
    const miBlockSignal = { intrapersonal: 2 };

    const logical = Array.from(
      { length: 5 },
      () => miEndorsements(warmupSignal).logical
    );
    const intrapersonal = Array.from(
      { length: 2 },
      () => miEndorsements(miBlockSignal).intrapersonal
    );

    expect(calculateMiDimension(logical)).toBe(100);
    expect(calculateMiDimension(intrapersonal)).toBe(100);
    expect(calculateMiDimension(logical)).toBeGreaterThanOrEqual(
      calculateMiDimension(intrapersonal)
    );
  });

  it("a whole endorsement never lowers a dimension's score", () => {
    let endorsements: number[] = [1, 1];
    let previous = calculateMiDimension(endorsements);
    for (let i = 0; i < 8; i += 1) {
      endorsements = [...endorsements, 1];
      const score = calculateMiDimension(endorsements);
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
  });
});

describe("learning styles need more than one click", () => {
  it("does not score a dimension from a single signal", () => {
    expect(calculateMiDimension([1])).toBe(0);
  });

  it("scores once the minimum evidence exists", () => {
    expect(calculateMiDimension([1, 1])).toBe(100);
  });

  it("requires at least two signals", () => {
    expect(MIN_MI_SIGNALS).toBe(2);
  });
});

describe("calculateAllMi", () => {
  it("normalizes all 8 dimensions from raw data", () => {
    const raw = {
      linguistic: [1, 1],
      logical: [0.5, 0.5],
      spatial: [1, 0.5],
      musical: [],
      bodily: [0.5, 0.5, 0.5],
      interpersonal: [1, 1],
      intrapersonal: [0, 0],
      // Single signal: below MIN_MI_SIGNALS, reads 0 rather than a score
      // built on one click.
      naturalistic: [1],
    };
    const result = calculateAllMi(raw);
    expect(result.linguistic).toBe(100);
    expect(result.logical).toBe(50);
    expect(result.spatial).toBe(75);
    expect(result.musical).toBe(0);
    expect(result.bodily).toBe(50);
    expect(result.interpersonal).toBe(100);
    expect(result.intrapersonal).toBe(0);
    expect(result.naturalistic).toBe(0);
  });

  it("handles completely empty raw data", () => {
    const raw = {
      linguistic: [],
      logical: [],
      spatial: [],
      musical: [],
      bodily: [],
      interpersonal: [],
      intrapersonal: [],
      naturalistic: [],
    };
    const result = calculateAllMi(raw);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });
});

describe("getTopMi", () => {
  it("returns top 3 dimensions sorted by score descending", () => {
    const scores = {
      linguistic: 80,
      logical: 50,
      spatial: 90,
      musical: 10,
      bodily: 60,
      interpersonal: 70,
      intrapersonal: 30,
      naturalistic: 40,
    };
    const top3 = getTopMi(scores, 3);
    expect(top3).toEqual([
      { dimension: "spatial", score: 90 },
      { dimension: "linguistic", score: 80 },
      { dimension: "interpersonal", score: 70 },
    ]);
  });

  it("returns all dimensions if n exceeds total", () => {
    const scores = {
      linguistic: 80,
      logical: 50,
      spatial: 90,
      musical: 10,
      bodily: 60,
      interpersonal: 70,
      intrapersonal: 30,
      naturalistic: 40,
    };
    const top10 = getTopMi(scores, 10);
    expect(top10.length).toBe(8);
    expect(top10[0].dimension).toBe("spatial");
  });

  it("handles all zeros", () => {
    const scores = {
      linguistic: 0,
      logical: 0,
      spatial: 0,
      musical: 0,
      bodily: 0,
      interpersonal: 0,
      intrapersonal: 0,
      naturalistic: 0,
    };
    const top3 = getTopMi(scores, 3);
    expect(top3.length).toBe(3);
    expect(top3.every((t) => t.score === 0)).toBe(true);
  });
});

describe("Boundary values", () => {
  it("returns 100 for all dimensions with all-max inputs", () => {
    const raw = {
      linguistic: [1, 1, 1],
      logical: [1, 1, 1],
      spatial: [1, 1, 1],
      musical: [1, 1, 1],
      bodily: [1, 1, 1],
      interpersonal: [1, 1, 1],
      intrapersonal: [1, 1, 1],
      naturalistic: [1, 1, 1],
    };
    const result = calculateAllMi(raw);
    for (const dim of Object.keys(raw)) {
      expect(result[dim]).toBe(100);
    }
  });

  it("returns 0 for all dimensions with all-min inputs (0)", () => {
    const raw = {
      linguistic: [0, 0, 0],
      logical: [0, 0, 0],
      spatial: [0, 0, 0],
      musical: [0, 0, 0],
      bodily: [0, 0, 0],
      interpersonal: [0, 0, 0],
      intrapersonal: [0, 0, 0],
      naturalistic: [0, 0, 0],
    };
    const result = calculateAllMi(raw);
    for (const dim of Object.keys(raw)) {
      expect(result[dim]).toBe(0);
    }
  });
});
