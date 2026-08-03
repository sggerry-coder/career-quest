import { describe, it, expect } from "vitest";
import {
  calculateRiasecType,
  calculateAllRiasec,
  mergeIpsativeScores,
  detectAcquiescenceBias,
  deriveClassLabel,
} from "../riasec";

// Scale is 1-4 with no midpoint (2026-08-03). Formula:
// ((sum - count * 1) / (count * 3)) * 100
describe("calculateRiasecType", () => {
  it("normalizes 3 responses of [4,4,4] to 100", () => {
    expect(calculateRiasecType([4, 4, 4])).toBe(100);
  });

  it("normalizes 3 responses of [1,1,1] to 0", () => {
    expect(calculateRiasecType([1, 1, 1])).toBe(0);
  });

  it("puts a balanced set at the centre", () => {
    // (2+3+2+3 - 4) / (4 * 3) * 100 = 6/12 * 100 = 50
    expect(calculateRiasecType([2, 3, 2, 3])).toBeCloseTo(50, 1);
  });

  it("handles a single mild-dislike response of [2]", () => {
    // (2 - 1) / (1 * 3) * 100 = 1/3 * 100 = 33.3
    expect(calculateRiasecType([2])).toBeCloseTo(33.3, 1);
  });

  it("handles a single mild-like response of [3]", () => {
    // (3 - 1) / (1 * 3) * 100 = 2/3 * 100 = 66.7
    expect(calculateRiasecType([3])).toBeCloseTo(66.7, 1);
  });

  it("handles two opposite extremes of [4, 1]", () => {
    // (5 - 2) / (2 * 3) * 100 = 3/6 * 100 = 50
    expect(calculateRiasecType([4, 1])).toBe(50);
  });

  it("handles four responses of [4, 3, 2, 1]", () => {
    // (10 - 4) / (4 * 3) * 100 = 6/12 * 100 = 50
    expect(calculateRiasecType([4, 3, 2, 1])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(calculateRiasecType([])).toBe(0);
  });

  it("clamps values to the 1-4 range", () => {
    // [0, 7] → clamped to [1, 4] → (5 - 2) / (2*3) * 100 = 50
    expect(calculateRiasecType([0, 7])).toBe(50);
  });

  it("clamps a legacy 5 from the old scale down to 4", () => {
    // Old checkpoints and stored rows can still hold 5s.
    expect(calculateRiasecType([5])).toBe(calculateRiasecType([4]));
  });

  it("rounds non-integer values to nearest integer", () => {
    // [2.7] → rounds to 3 → (3 - 1) / (1*3) * 100 = 66.7
    expect(calculateRiasecType([2.7])).toBeCloseTo(66.7, 1);
  });
});

describe("calculateAllRiasec", () => {
  it("normalizes all 6 types from raw scores", () => {
    const raw = {
      R: [4, 4],
      I: [1, 1],
      A: [2, 3],
      S: [4, 3],
      E: [2, 2],
      C: [4, 1],
    };
    const result = calculateAllRiasec(raw);
    expect(result.R).toBe(100);
    expect(result.I).toBe(0);
    expect(result.A).toBe(50);
    expect(result.S).toBeCloseTo(83.3, 1);
    expect(result.E).toBeCloseTo(33.3, 1);
    expect(result.C).toBe(50);
  });

  it("handles missing types (empty arrays) as 0", () => {
    const raw = {
      R: [4],
      I: [],
      A: [],
      S: [],
      E: [],
      C: [],
    };
    const result = calculateAllRiasec(raw);
    expect(result.R).toBe(100);
    expect(result.I).toBe(0);
    expect(result.A).toBe(0);
  });
});

describe("mergeIpsativeScores", () => {
  it("merges likert and ipsative with 70/30 weighting", () => {
    const likert = { R: 80, I: 60, A: 40, S: 20, E: 50, C: 70 };
    const ipsative = { R: 100, I: 50, A: 0, S: 50, E: 0, C: 100 };
    const result = mergeIpsativeScores(likert, ipsative);
    // R: 80*0.7 + 100*0.3 = 56 + 30 = 86
    expect(result.R).toBeCloseTo(86, 1);
    // I: 60*0.7 + 50*0.3 = 42 + 15 = 57
    expect(result.I).toBeCloseTo(57, 1);
    // A: 40*0.7 + 0*0.3 = 28 + 0 = 28
    expect(result.A).toBeCloseTo(28, 1);
  });

  it("uses likert-only when ipsative type has no data (null)", () => {
    const likert = { R: 80, I: 60, A: 40, S: 20, E: 50, C: 70 };
    const ipsative = { R: 100, I: null, A: null, S: null, E: null, C: null };
    const result = mergeIpsativeScores(
      likert,
      ipsative as unknown as Record<string, number | null>
    );
    expect(result.R).toBeCloseTo(86, 1);
    expect(result.I).toBe(60); // likert only
    expect(result.A).toBe(40); // likert only
  });
});

describe("detectAcquiescenceBias", () => {
  it("returns true when all 6 types are above 80", () => {
    const scores = { R: 85, I: 90, A: 81, S: 95, E: 82, C: 88 };
    expect(detectAcquiescenceBias(scores)).toBe(true);
  });

  it("returns false when any type is 80 or below", () => {
    const scores = { R: 85, I: 90, A: 80, S: 95, E: 82, C: 88 };
    expect(detectAcquiescenceBias(scores)).toBe(false);
  });

  it("returns false for low scores", () => {
    const scores = { R: 20, I: 30, A: 40, S: 50, E: 60, C: 70 };
    expect(detectAcquiescenceBias(scores)).toBe(false);
  });
});

describe("deriveClassLabel", () => {
  it("returns dominant pair when top 2 > 50 and gap to 3rd > 10", () => {
    const scores = { R: 10, I: 80, A: 70, S: 30, E: 20, C: 40 };
    // Top 2: I=80, A=70. 3rd: C=40. Gap = 70-40 = 30 > 10
    expect(deriveClassLabel(scores)).toBe("INVESTIGATOR-CREATOR");
  });

  it("returns single dominant when top 1 > 50 and leads by > 15", () => {
    const scores = { R: 10, I: 80, A: 50, S: 30, E: 20, C: 40 };
    // Top: I=80. 2nd: A=50. Gap = 80-50 = 30 > 15. But A is 50, not > 50 for pair.
    // score[0]=80 > 50, score[1]=50 not > 50, so goes to elif.
    // score[0]=80 > 50, 80-50 = 30 > 15 → single dominant
    expect(deriveClassLabel(scores)).toBe("INVESTIGATOR");
  });

  it("returns EXPLORER when top 1 > 50 but close to second", () => {
    const scores = { R: 10, I: 60, A: 55, S: 50, E: 20, C: 40 };
    // Top 2: I=60, A=55. 3rd: S=50. Gap = 55-50 = 5 < 10 → not pair
    // score[0]=60 > 50, but 60-55 = 5, not > 15 → not single
    // else → EXPLORER
    expect(deriveClassLabel(scores)).toBe("EXPLORER");
  });

  it("returns SEEKER when all scores below 40", () => {
    const scores = { R: 10, I: 20, A: 30, S: 15, E: 25, C: 35 };
    expect(deriveClassLabel(scores)).toBe("SEEKER");
  });

  it("returns EXPLORER when scores are moderate but no clear dominant", () => {
    const scores = { R: 45, I: 50, A: 48, S: 42, E: 47, C: 46 };
    // score[0]=50 > 50 is false (not strictly >50) — wait, 50 is not > 50.
    // All < 40? No (50 > 40). So else → EXPLORER.
    expect(deriveClassLabel(scores)).toBe("EXPLORER");
  });
});

describe("Boundary values", () => {
  describe("calculateAllRiasec", () => {
    it("returns 100 for all types when all responses are max (5)", () => {
      const raw = {
        R: [5, 5, 5],
        I: [5, 5, 5],
        A: [5, 5, 5],
        S: [5, 5, 5],
        E: [5, 5, 5],
        C: [5, 5, 5],
      };
      const result = calculateAllRiasec(raw);
      for (const type of ["R", "I", "A", "S", "E", "C"]) {
        expect(result[type]).toBe(100);
      }
    });

    it("returns 0 for all types when all responses are min (1)", () => {
      const raw = {
        R: [1, 1, 1],
        I: [1, 1, 1],
        A: [1, 1, 1],
        S: [1, 1, 1],
        E: [1, 1, 1],
        C: [1, 1, 1],
      };
      const result = calculateAllRiasec(raw);
      for (const type of ["R", "I", "A", "S", "E", "C"]) {
        expect(result[type]).toBe(0);
      }
    });
  });

  describe("deriveClassLabel at threshold 50/51", () => {
    it("does not qualify types at exactly 50 (strict > 50)", () => {
      // Both R and I at exactly 50 — neither qualifies as > 50
      const scores = { R: 50, I: 50, A: 0, S: 0, E: 0, C: 0 };
      const result = deriveClassLabel(scores);
      // first.score = 50, not > 50, so falls through to "all < 40?" check
      // Not all < 40 (50 >= 40), so → EXPLORER
      expect(result).toBe("EXPLORER");
    });

    it("qualifies type at 51 as primary", () => {
      // R at 51 with others far below — leads by > 15
      const scores = { R: 51, I: 0, A: 0, S: 0, E: 0, C: 0 };
      const result = deriveClassLabel(scores);
      // first.score = 51 > 50, second.score = 0 not > 50 → single check
      // 51 - 0 = 51 > 15 → single dominant
      expect(result).toBe("MAKER");
    });

    it("returns pair when both at 51 with gap to 3rd > 10", () => {
      const scores = { R: 51, I: 51, A: 0, S: 0, E: 0, C: 0 };
      const result = deriveClassLabel(scores);
      // Top 2 both > 50, gap from 2nd to 3rd = 51 - 0 = 51 > 10
      expect(result).toBe("MAKER-INVESTIGATOR");
    });
  });

  describe("mergeIpsativeScores with all-null ipsative", () => {
    it("returns base likert scores unchanged when all ipsative values are null", () => {
      const likert = { R: 80, I: 60, A: 40, S: 20, E: 50, C: 70 };
      const ipsative: Record<string, number | null> = {
        R: null,
        I: null,
        A: null,
        S: null,
        E: null,
        C: null,
      };
      const result = mergeIpsativeScores(likert, ipsative);
      expect(result.R).toBe(80);
      expect(result.I).toBe(60);
      expect(result.A).toBe(40);
      expect(result.S).toBe(20);
      expect(result.E).toBe(50);
      expect(result.C).toBe(70);
    });
  });
});
