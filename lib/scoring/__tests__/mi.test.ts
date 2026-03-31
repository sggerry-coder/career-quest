import { describe, it, expect } from "vitest";
import { calculateMiDimension, calculateAllMi, getTopMi } from "../mi";

describe("calculateMiDimension", () => {
  it("normalizes [2, 2] with max_weight 2 to 100", () => {
    expect(calculateMiDimension([2, 2], 2)).toBe(100);
  });

  it("normalizes [1, 1] with max_weight 2 to 50", () => {
    expect(calculateMiDimension([1, 1], 2)).toBe(50);
  });

  it("normalizes [0] with max_weight 2 to 0", () => {
    expect(calculateMiDimension([0], 2)).toBe(0);
  });

  it("normalizes [2] with max_weight 2 to 100", () => {
    expect(calculateMiDimension([2], 2)).toBe(100);
  });

  it("normalizes [1, 2, 1] with max_weight 2 to approximately 66.7", () => {
    // sum=4, count=3, max=2 → 4/(3*2)*100 = 66.67
    expect(calculateMiDimension([1, 2, 1], 2)).toBeCloseTo(66.7, 0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateMiDimension([], 2)).toBe(0);
  });
});

describe("calculateAllMi", () => {
  it("normalizes all 8 dimensions from raw data", () => {
    const raw = {
      linguistic: [2],
      logical: [1],
      spatial: [2, 1],
      musical: [],
      bodily: [1],
      interpersonal: [2],
      intrapersonal: [0],
      naturalistic: [1],
    };
    const result = calculateAllMi(raw, 2);
    expect(result.linguistic).toBe(100);
    expect(result.logical).toBe(50);
    expect(result.spatial).toBe(75);
    expect(result.musical).toBe(0);
    expect(result.bodily).toBe(50);
    expect(result.interpersonal).toBe(100);
    expect(result.intrapersonal).toBe(0);
    expect(result.naturalistic).toBe(50);
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
    const result = calculateAllMi(raw, 2);
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
