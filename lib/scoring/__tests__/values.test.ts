import { describe, it, expect } from "vitest";
import {
  calculateValuesDimension,
  calculateAllValues,
  buildValuesRawCounts,
  hasValuesReading,
} from "../values";

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

describe("Boundary values", () => {
  it("returns +100 for all dimensions with all extreme positive inputs (+3)", () => {
    const raw = {
      security_adventure: [3, 3, 3],
      income_impact: [3, 3, 3],
      prestige_fulfilment: [3, 3, 3],
      structure_flexibility: [3, 3, 3],
      solo_team: [3, 3, 3],
    };
    const result = calculateAllValues(raw);
    for (const dim of Object.keys(raw)) {
      expect(result[dim]).toBe(100);
    }
  });

  it("returns -100 for all dimensions with all extreme negative inputs (-3)", () => {
    const raw = {
      security_adventure: [-3, -3, -3],
      income_impact: [-3, -3, -3],
      prestige_fulfilment: [-3, -3, -3],
      structure_flexibility: [-3, -3, -3],
      solo_team: [-3, -3, -3],
    };
    const result = calculateAllValues(raw);
    for (const dim of Object.keys(raw)) {
      expect(result[dim]).toBe(-100);
    }
  });

  it("produces no NaN with mixed extreme inputs", () => {
    const raw = {
      security_adventure: [3, -3],
      income_impact: [-3, 3, -3],
      prestige_fulfilment: [3],
      structure_flexibility: [-3],
      solo_team: [0, 0, 0],
    };
    const result = calculateAllValues(raw);
    for (const [key, value] of Object.entries(result)) {
      expect(Number.isFinite(value), `${key} should be finite`).toBe(true);
    }
    // Mixed +3 and -3 should cancel: (3 + -3) / (2*3) * 100 = 0
    expect(result.security_adventure).toBe(0);
    expect(result.solo_team).toBe(0);
  });
});

/**
 * On a spectrum, 0 is not "nothing" — it is the exact centre, and the most
 * confident thing the scale can say about balance. So an unanswered dimension
 * and a perfectly balanced one produce the same number, and the compass reads
 * "Balanced for now" over both. These are what let a caller tell them apart.
 */
describe("telling an unanswered dimension from a balanced one", () => {
  it("scores an unanswered dimension identically to a balanced one", () => {
    // The whole problem, stated: skipped and dead-centre are the same number.
    expect(calculateValuesDimension([])).toBe(0);
    expect(calculateValuesDimension([0])).toBe(0);
  });

  it("counts what was actually answered per dimension", () => {
    const counts = buildValuesRawCounts({
      security_adventure: [3],
      income_impact: [],
      prestige_fulfilment: [-2],
      structure_flexibility: [],
      solo_team: [0],
    });
    expect(counts).toEqual({
      security_adventure: 1,
      income_impact: 0,
      prestige_fulfilment: 1,
      structure_flexibility: 0,
      solo_team: 1,
    });
  });

  it("emits all five dimensions even for a record that has none", () => {
    // So a gap in one of its records is a recorded absence, never a silence.
    expect(Object.keys(buildValuesRawCounts({})).sort()).toEqual([
      "income_impact",
      "prestige_fulfilment",
      "security_adventure",
      "solo_team",
      "structure_flexibility",
    ]);
  });

  it("reports a reading for the answered dimensions and none for the skipped", () => {
    const raw = {
      security_adventure: [3],
      income_impact: [],
      prestige_fulfilment: [0],
      structure_flexibility: [],
      solo_team: [-1],
    };
    const scores = calculateAllValues(raw);
    const counts = buildValuesRawCounts(raw);

    // income_impact was skipped; prestige_fulfilment was answered dead centre.
    // Same score, opposite meaning.
    expect(scores.income_impact).toBe(0);
    expect(scores.prestige_fulfilment).toBe(0);
    expect(hasValuesReading("income_impact", counts)).toBe(false);
    expect(hasValuesReading("prestige_fulfilment", counts)).toBe(true);
    expect(hasValuesReading("security_adventure", counts)).toBe(true);
    expect(hasValuesReading("structure_flexibility", counts)).toBe(false);
  });

  it("assumes answered when there are no counts at all", () => {
    // A row persisted before counts existed is silent about what it holds;
    // blanking a finished profile would be the worse lie.
    expect(hasValuesReading("income_impact")).toBe(true);
    expect(hasValuesReading("income_impact", undefined)).toBe(true);
  });
});
