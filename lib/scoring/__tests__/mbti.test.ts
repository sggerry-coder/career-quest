import { describe, it, expect } from "vitest";
import {
  calculateMbtiDichotomy,
  calculateAllMbti,
  isStillEmerging,
  deriveEmergingType,
} from "../mbti";

describe("calculateMbtiDichotomy", () => {
  it("normalizes [-3, -3] to -100", () => {
    expect(calculateMbtiDichotomy([-3, -3])).toBe(-100);
  });

  it("normalizes [3, 3] to 100", () => {
    expect(calculateMbtiDichotomy([3, 3])).toBe(100);
  });

  it("normalizes [0, 0] to 0", () => {
    expect(calculateMbtiDichotomy([0, 0])).toBe(0);
  });

  it("normalizes [-2, -2] to approximately -67", () => {
    // sum=-4, count=2, norm = (-4 / (2*3)) * 100 = -66.67
    expect(calculateMbtiDichotomy([-2, -2])).toBeCloseTo(-66.7, 0);
  });

  it("normalizes [1, -1] to 0", () => {
    expect(calculateMbtiDichotomy([1, -1])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateMbtiDichotomy([])).toBe(0);
  });

  it("clamps values to -3 to +3 range", () => {
    // [-5, 7] → clamped to [-3, 3] → sum=0 → 0
    expect(calculateMbtiDichotomy([-5, 7])).toBe(0);
  });

  it("rounds non-integer values", () => {
    // [2.7] → rounds to 3 → (3 / (1*3)) * 100 = 100
    expect(calculateMbtiDichotomy([2.7])).toBe(100);
  });
});

describe("calculateAllMbti", () => {
  it("normalizes all 4 dichotomies", () => {
    const raw = {
      EI: [-3, -1],
      SN: [2, 2],
      TF: [0, 0],
      JP: [-2, -2],
    };
    const result = calculateAllMbti(raw);
    // EI: (-4 / 6) * 100 = -66.67
    expect(result.EI).toBeCloseTo(-66.7, 0);
    // SN: (4 / 6) * 100 = 66.67
    expect(result.SN).toBeCloseTo(66.7, 0);
    // TF: 0
    expect(result.TF).toBe(0);
    // JP: (-4 / 6) * 100 = -66.67
    expect(result.JP).toBeCloseTo(-66.7, 0);
  });

  it("handles empty raw data as 0 for all dichotomies", () => {
    const raw = { EI: [], SN: [], TF: [], JP: [] };
    const result = calculateAllMbti(raw);
    expect(result.EI).toBe(0);
    expect(result.SN).toBe(0);
    expect(result.TF).toBe(0);
    expect(result.JP).toBe(0);
  });
});

describe("isStillEmerging", () => {
  it("returns true when abs(score) < 35", () => {
    expect(isStillEmerging(0)).toBe(true);
    expect(isStillEmerging(33)).toBe(true);
    expect(isStillEmerging(-33)).toBe(true);
    expect(isStillEmerging(34)).toBe(true);
  });

  it("returns false when abs(score) >= 35", () => {
    expect(isStillEmerging(35)).toBe(false);
    expect(isStillEmerging(-35)).toBe(false);
    expect(isStillEmerging(67)).toBe(false);
    expect(isStillEmerging(-100)).toBe(false);
  });
});

describe("deriveEmergingType", () => {
  it("produces full type for strong signals: I N T J", () => {
    const scores = { EI: -67, SN: 67, TF: -67, JP: -67 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("INTJ");
    expect(result.display).toBe("I N T J");
  });

  it("shows underscore for emerging dichotomies", () => {
    const scores = { EI: -67, SN: 67, TF: 0, JP: -67 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("IN_J");
    expect(result.display).toBe("I N _ J");
  });

  it("shows all underscores when everything is emerging", () => {
    const scores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("____");
    expect(result.display).toBe("_ _ _ _");
  });

  it("handles positive scores correctly (E, N, F, P)", () => {
    const scores = { EI: 67, SN: 67, TF: 67, JP: 67 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("ENFP");
    expect(result.display).toBe("E N F P");
  });

  it("handles negative scores correctly (I, S, T, J)", () => {
    const scores = { EI: -100, SN: -100, TF: -100, JP: -100 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("ISTJ");
    expect(result.display).toBe("I S T J");
  });
});

describe("deriveEmergingType with rawCounts", () => {
  it("forces underscore when rawCounts < 3 despite strong scores", () => {
    const scores = { EI: -80, SN: 60, TF: -50, JP: 70 };
    const rawCounts = { EI: 2, SN: 1, TF: 5, JP: 4 };
    const result = deriveEmergingType(scores, rawCounts);
    // EI has 2 < 3 → underscore, SN has 1 < 3 → underscore
    // TF has 5 >= 3 and score -50 → T, JP has 4 >= 3 and score 70 → P
    expect(result.type).toBe("__TP");
    expect(result.hasEmerging).toBe(true);
  });

  it("returns full type when all rawCounts >= 3 and scores are strong", () => {
    const scores = { EI: -80, SN: 60, TF: -50, JP: 70 };
    const rawCounts = { EI: 3, SN: 3, TF: 3, JP: 3 };
    const result = deriveEmergingType(scores, rawCounts);
    // EI: -80 → I, SN: 60 → N, TF: -50 → T, JP: 70 → P
    expect(result.type).toBe("INTP");
    expect(result.hasEmerging).toBe(false);
  });

  it("returns hasEmerging true when scores are within threshold even with sufficient counts", () => {
    const scores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const rawCounts = { EI: 5, SN: 5, TF: 5, JP: 5 };
    const result = deriveEmergingType(scores, rawCounts);
    expect(result.type).toBe("____");
    expect(result.hasEmerging).toBe(true);
  });

  it("returns hasEmerging false when no rawCounts provided and scores are strong", () => {
    const scores = { EI: -80, SN: 60, TF: -50, JP: 70 };
    const result = deriveEmergingType(scores);
    // EI: -80 → I, SN: 60 → N, TF: -50 → T, JP: 70 → P
    expect(result.type).toBe("INTP");
    expect(result.hasEmerging).toBe(false);
  });
});
