import { describe, it, expect } from "vitest";
import { calculateAllRiasec } from "../riasec";
import { calculateAllMbti } from "../mbti";
import { calculateAllMi } from "../mi";
import { calculateAllValues } from "../values";

function assertAllFinite(result: Record<string, number>, label: string): void {
  for (const [key, value] of Object.entries(result)) {
    expect(Number.isFinite(value), `${label}.${key} should be finite, got ${value}`).toBe(true);
    expect(Number.isNaN(value), `${label}.${key} should not be NaN`).toBe(false);
  }
}

describe("NaN safety guards", () => {
  describe("calculateAllRiasec", () => {
    it("returns all 0 for empty arrays, no NaN", () => {
      const result = calculateAllRiasec({ R: [], I: [], A: [], S: [], E: [], C: [] });
      assertAllFinite(result, "riasec");
      expect(result.R).toBe(0);
      expect(result.I).toBe(0);
    });

    it("returns finite values for single-element arrays", () => {
      const result = calculateAllRiasec({ R: [0], I: [0], A: [0], S: [0], E: [0], C: [0] });
      assertAllFinite(result, "riasec-single");
    });
  });

  describe("calculateAllMbti", () => {
    it("returns all 0 for empty arrays, no NaN", () => {
      const result = calculateAllMbti({ EI: [], SN: [], TF: [], JP: [] });
      assertAllFinite(result, "mbti");
      expect(result.EI).toBe(0);
      expect(result.SN).toBe(0);
    });

    it("returns finite values for single-element arrays", () => {
      const result = calculateAllMbti({ EI: [0], SN: [0], TF: [0], JP: [0] });
      assertAllFinite(result, "mbti-single");
    });
  });

  describe("calculateAllMi", () => {
    it("returns all 0 for empty arrays, no NaN", () => {
      const result = calculateAllMi({
        linguistic: [], logical: [], spatial: [], musical: [],
        bodily: [], interpersonal: [], intrapersonal: [], naturalistic: [],
      });
      assertAllFinite(result, "mi");
      expect(result.linguistic).toBe(0);
    });

    it("returns finite values for single-element arrays", () => {
      const result = calculateAllMi({
        linguistic: [0], logical: [0], spatial: [0], musical: [0],
        bodily: [0], interpersonal: [0], intrapersonal: [0], naturalistic: [0],
      });
      assertAllFinite(result, "mi-single");
    });
  });

  describe("calculateAllValues", () => {
    it("returns all 0 for empty arrays, no NaN", () => {
      const result = calculateAllValues({
        security_adventure: [], income_impact: [], prestige_fulfilment: [],
        structure_flexibility: [], solo_team: [],
      });
      assertAllFinite(result, "values");
      expect(result.security_adventure).toBe(0);
    });

    it("returns finite values for single-element arrays", () => {
      const result = calculateAllValues({
        security_adventure: [0], income_impact: [0], prestige_fulfilment: [0],
        structure_flexibility: [0], solo_team: [0],
      });
      assertAllFinite(result, "values-single");
    });
  });

  describe("Boundary values — single response sets", () => {
    it("calculateAllRiasec with single response per type produces finite results", () => {
      const result = calculateAllRiasec({ R: [3], I: [1], A: [5], S: [2], E: [4], C: [3] });
      assertAllFinite(result, "riasec-single-response");
      // Single response of 3: (3-1)/(1*4)*100 = 50
      expect(result.R).toBe(50);
      // Single response of 1: (1-1)/(1*4)*100 = 0
      expect(result.I).toBe(0);
      // Single response of 5: (5-1)/(1*4)*100 = 100
      expect(result.A).toBe(100);
    });

    it("calculateAllMbti with single response per dichotomy produces finite results", () => {
      const result = calculateAllMbti({ EI: [3], SN: [-3], TF: [0], JP: [1] });
      assertAllFinite(result, "mbti-single-response");
      expect(result.EI).toBe(100);
      expect(result.SN).toBe(-100);
      expect(result.TF).toBe(0);
    });

    it("calculateAllMi with single response per dimension produces finite results", () => {
      const result = calculateAllMi({
        linguistic: [1], logical: [2], spatial: [0], musical: [1],
        bodily: [2], interpersonal: [0], intrapersonal: [1], naturalistic: [2],
      });
      assertAllFinite(result, "mi-single-response");
      expect(result.linguistic).toBe(50);
      expect(result.logical).toBe(100);
      expect(result.spatial).toBe(0);
    });

    it("calculateAllValues with single response per dimension produces finite results", () => {
      const result = calculateAllValues({
        security_adventure: [3], income_impact: [-3], prestige_fulfilment: [0],
        structure_flexibility: [1], solo_team: [-1],
      });
      assertAllFinite(result, "values-single-response");
      expect(result.security_adventure).toBe(100);
      expect(result.income_impact).toBe(-100);
      expect(result.prestige_fulfilment).toBe(0);
    });
  });

  describe("cross-cutting NaN check", () => {
    it("no scoring function output value is NaN for empty input", () => {
      const riasec = calculateAllRiasec({ R: [], I: [], A: [], S: [], E: [], C: [] });
      const mbti = calculateAllMbti({ EI: [], SN: [], TF: [], JP: [] });
      const mi = calculateAllMi({
        linguistic: [], logical: [], spatial: [], musical: [],
        bodily: [], interpersonal: [], intrapersonal: [], naturalistic: [],
      });
      const values = calculateAllValues({
        security_adventure: [], income_impact: [], prestige_fulfilment: [],
        structure_flexibility: [], solo_team: [],
      });

      const allResults = { ...riasec, ...mbti, ...mi, ...values };
      for (const [key, value] of Object.entries(allResults)) {
        expect(Number.isNaN(value), `${key} should not be NaN`).toBe(false);
        expect(Number.isFinite(value), `${key} should be finite`).toBe(true);
      }
    });
  });
});
