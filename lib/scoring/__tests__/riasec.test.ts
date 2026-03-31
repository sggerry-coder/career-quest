import { describe, it, expect } from "vitest";
import {
  calculateRiasecType,
  calculateAllRiasec,
  mergeIpsativeScores,
  detectAcquiescenceBias,
  deriveClassLabel,
} from "../riasec";

describe("calculateRiasecType", () => {
  it("normalizes 3 responses of [5,5,5] to 100", () => {
    expect(calculateRiasecType([5, 5, 5])).toBe(100);
  });

  it("normalizes 3 responses of [1,1,1] to 0", () => {
    expect(calculateRiasecType([1, 1, 1])).toBe(0);
  });

  it("normalizes [3,4,2] to approximately 41.7", () => {
    // (9 - 3) / (3 * 4) * 100 = 6/12 * 100 = 50
    expect(calculateRiasecType([3, 4, 2])).toBeCloseTo(50, 1);
  });

  it("handles a single response of [3]", () => {
    // (3 - 1) / (1 * 4) * 100 = 2/4 * 100 = 50
    expect(calculateRiasecType([3])).toBe(50);
  });

  it("handles two responses of [4, 2]", () => {
    // (6 - 2) / (2 * 4) * 100 = 4/8 * 100 = 50
    expect(calculateRiasecType([4, 2])).toBe(50);
  });

  it("handles four responses of [5, 4, 3, 2]", () => {
    // (14 - 4) / (4 * 4) * 100 = 10/16 * 100 = 62.5
    expect(calculateRiasecType([5, 4, 3, 2])).toBe(62.5);
  });

  it("handles five responses of [1, 2, 3, 4, 5]", () => {
    // (15 - 5) / (5 * 4) * 100 = 10/20 * 100 = 50
    expect(calculateRiasecType([1, 2, 3, 4, 5])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(calculateRiasecType([])).toBe(0);
  });

  it("clamps values to 1-5 range", () => {
    // [0, 7] → clamped to [1, 5] → (6 - 2) / (2*4) * 100 = 50
    expect(calculateRiasecType([0, 7])).toBe(50);
  });

  it("rounds non-integer values to nearest integer", () => {
    // [2.7] → rounds to 3 → (3 - 1) / (1*4) * 100 = 50
    expect(calculateRiasecType([2.7])).toBe(50);
  });
});

describe("calculateAllRiasec", () => {
  it("normalizes all 6 types from raw scores", () => {
    const raw = {
      R: [5, 5],
      I: [1, 1],
      A: [3, 3],
      S: [4, 4],
      E: [2, 2],
      C: [5, 1],
    };
    const result = calculateAllRiasec(raw);
    expect(result.R).toBe(100);
    expect(result.I).toBe(0);
    expect(result.A).toBe(50);
    expect(result.S).toBe(75);
    expect(result.E).toBe(25);
    expect(result.C).toBe(50);
  });

  it("handles missing types (empty arrays) as 0", () => {
    const raw = {
      R: [5],
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
