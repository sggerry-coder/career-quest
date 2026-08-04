import { describe, it, expect } from "vitest";
import {
  calculateAllRiasec,
  calculateAllRiasecOrNull,
  buildRiasecEvidence,
  mergeIpsativeScores,
  deriveClassLabel,
} from "../riasec";
import { calculateAllMbti, buildMbtiRawCounts } from "../mbti";
import { calculateAllMi } from "../mi";
import {
  calculateAllValues,
  buildValuesRawCounts,
  hasValuesReading,
} from "../values";

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
      // Scale is 1-4; the 5 is a legacy value and must clamp, not blow up.
      const result = calculateAllRiasec({ R: [3], I: [1], A: [5], S: [2], E: [4], C: [3] });
      assertAllFinite(result, "riasec-single-response");
      // Single response of 3: (3-1)/(1*3)*100 = 66.7
      expect(result.R).toBeCloseTo(66.7, 1);
      // Single response of 1: (1-1)/(1*3)*100 = 0
      expect(result.I).toBe(0);
      // Legacy 5 clamps to 4: (4-1)/(1*3)*100 = 100
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
      // A single signal is below MIN_MI_SIGNALS: every dimension reads 0
      // (no reading yet) rather than a score built on one data point.
      const result = calculateAllMi({
        linguistic: [1], logical: [2], spatial: [0], musical: [1],
        bodily: [2], interpersonal: [0], intrapersonal: [1], naturalistic: [2],
      });
      assertAllFinite(result, "mi-single-response");
      expect(result.linguistic).toBe(0);
      expect(result.logical).toBe(0);
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

  describe("Partial data — some answered, some skipped", () => {
    // Telling "not answered" apart from "scored 0" added paths that carry a
    // null or a missing count. Every one of them still has to be total: the
    // student who skipped is exactly the student least able to absorb a
    // crash or a NaN on their results screen.

    it("calculateAllRiasecOrNull emits null or a finite number, never NaN", () => {
      const result = calculateAllRiasecOrNull({
        R: [],
        I: [4, 4],
        A: [],
        S: [1],
        E: [Number.NaN],
        C: [Number.POSITIVE_INFINITY],
      });
      for (const [key, value] of Object.entries(result)) {
        if (value === null) continue;
        expect(Number.isFinite(value), `riasec-or-null.${key}`).toBe(true);
      }
      expect(result.R).toBeNull();
      expect(result.A).toBeNull();
      // A broken input is not a missing one: it is clamped, not nulled.
      expect(Number.isFinite(result.E as number)).toBe(true);
      expect(Number.isFinite(result.C as number)).toBe(true);
    });

    it("mergeIpsativeScores stays finite for every combination of present and missing", () => {
      const merged = mergeIpsativeScores(
        { R: 80, I: null, A: 40, S: null, E: 0, C: null },
        { R: null, I: 100, A: 0, S: null, E: null, C: null }
      );
      assertAllFinite(merged, "merge-partial");
      expect(merged.S).toBe(0);
    });

    it("mergeIpsativeScores survives records with keys missing entirely", () => {
      assertAllFinite(mergeIpsativeScores({}, {}), "merge-empty-records");
    });

    it("buildRiasecEvidence is finite and non-negative for empty and partial input", () => {
      const evidence = buildRiasecEvidence(
        { R: [4], I: [] },
        { A: [5], S: [] }
      );
      assertAllFinite(evidence, "evidence");
      for (const value of Object.values(evidence)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });

    it("deriveClassLabel returns a label for every level of sparseness", () => {
      const scores = { R: 0, I: 0, A: 0, S: 100, E: 0, C: 0 };
      // No types answered, one, two, and all six.
      expect(
        deriveClassLabel(scores, { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
      ).toBe("SEEKER");
      expect(
        deriveClassLabel(scores, { R: 0, I: 0, A: 0, S: 2, E: 0, C: 0 })
      ).toBe("SEEKER");
      expect(
        typeof deriveClassLabel(scores, { R: 2, I: 0, A: 0, S: 2, E: 0, C: 0 })
      ).toBe("string");
      // An evidence record with no keys at all must not throw either.
      expect(typeof deriveClassLabel(scores, {})).toBe("string");
    });

    it("MI holds its minimum-evidence gate on partial data without going non-finite", () => {
      // One signal is below MIN_MI_SIGNALS and reads 0; two is a reading.
      const result = calculateAllMi({
        linguistic: [1],
        logical: [1, 0.5],
        spatial: [],
      });
      assertAllFinite(result, "mi-partial");
      expect(result.linguistic).toBe(0);
      expect(result.logical).toBe(75);
      expect(result.spatial).toBe(0);
    });

    it("counts survive raw records that are empty or missing keys", () => {
      assertAllFinite(buildMbtiRawCounts({ EI: [1] }), "mbti-counts-partial");
      assertAllFinite(buildValuesRawCounts({}), "values-counts-empty");
      expect(buildValuesRawCounts({ solo_team: [3] }).solo_team).toBe(1);
      expect(buildValuesRawCounts({ solo_team: [3] }).income_impact).toBe(0);
    });

    it("hasValuesReading is total for present, absent and legacy counts", () => {
      const counts = buildValuesRawCounts({ solo_team: [3] });
      expect(hasValuesReading("solo_team", counts)).toBe(true);
      expect(hasValuesReading("income_impact", counts)).toBe(false);
      // No counts at all — a persisted row that predates them.
      expect(hasValuesReading("income_impact")).toBe(true);
      expect(hasValuesReading("nonexistent_dimension", counts)).toBe(false);
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
