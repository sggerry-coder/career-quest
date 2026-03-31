import { describe, it, expect } from "vitest";
import { calculateValuesDimension, calculateAllValues } from "../values";

describe("calculateValuesDimension", () => {
  it("normalizes [-3, -3] to -100", () => {
    expect(calculateValuesDimension([-3, -3])).toBe(-100);
  });

  it("normalizes [3, 3] to 100", () => {
    expect(calculateValuesDimension([3, 3])).toBe(100);
  });

  it("normalizes [0, 0] to 0", () => {
    expect(calculateValuesDimension([0, 0])).toBe(0);
  });

  it("normalizes [-2] to approximately -67", () => {
    // (-2 / (1*3)) * 100 = -66.67
    expect(calculateValuesDimension([-2])).toBeCloseTo(-66.7, 0);
  });

  it("normalizes [1, -1] to 0", () => {
    expect(calculateValuesDimension([1, -1])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateValuesDimension([])).toBe(0);
  });

  it("clamps to -3 to +3 range", () => {
    // [-5, 7] → clamped to [-3, 3] → sum=0 → 0
    expect(calculateValuesDimension([-5, 7])).toBe(0);
  });

  it("rounds non-integer values", () => {
    // [2.6] → rounds to 3 → (3 / (1*3)) * 100 = 100
    expect(calculateValuesDimension([2.6])).toBe(100);
  });
});

describe("calculateAllValues", () => {
  it("normalizes all 5 value dimensions", () => {
    const raw = {
      security_adventure: [-3],
      income_impact: [3],
      prestige_fulfilment: [],
      structure_flexibility: [0],
      solo_team: [-1],
    };
    const result = calculateAllValues(raw);
    expect(result.security_adventure).toBeCloseTo(-100, 1);
    expect(result.income_impact).toBeCloseTo(100, 1);
    expect(result.prestige_fulfilment).toBe(0);
    expect(result.structure_flexibility).toBe(0);
    expect(result.solo_team).toBeCloseTo(-33.3, 0);
  });

  it("handles all empty arrays as 0", () => {
    const raw = {
      security_adventure: [],
      income_impact: [],
      prestige_fulfilment: [],
      structure_flexibility: [],
      solo_team: [],
    };
    const result = calculateAllValues(raw);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });
});
