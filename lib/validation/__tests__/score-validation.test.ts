import { describe, it, expect } from "vitest";
import {
  validateScoresBeforePersist,
  type ValidationResult,
} from "../score-validation";

const validRiasec = { R: 45, I: 30, A: 60, S: 20, E: 55, C: 10 };
const validMi = {
  linguistic: 50,
  logical: 40,
  spatial: 60,
  musical: 30,
  bodily: 45,
  interpersonal: 55,
  intrapersonal: 35,
  naturalistic: 25,
};
const validMbti = { EI: -20, SN: 40, TF: -10, JP: 30 };
const validValues = {
  security_adventure: 60,
  income_impact: -30,
  prestige_fulfilment: 20,
  structure_flexibility: -50,
  solo_team: 40,
};

describe("validateScoresBeforePersist", () => {
  describe("valid scores", () => {
    it("passes validation when all frameworks have correct keys and values", () => {
      const result: ValidationResult = validateScoresBeforePersist(
        { riasec: validRiasec, mi: validMi, mbti: validMbti, values: validValues },
        25
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("NaN detection", () => {
    it("rejects NaN in riasec.R", () => {
      const result = validateScoresBeforePersist(
        { riasec: { ...validRiasec, R: NaN }, mi: validMi, mbti: validMbti, values: validValues },
        25
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("riasec.R is NaN or not a number");
    });

    it("rejects non-number values", () => {
      const result = validateScoresBeforePersist(
        {
          riasec: { ...validRiasec, I: "bad" as unknown as number },
          mi: validMi,
          mbti: validMbti,
          values: validValues,
        },
        25
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("riasec.I is NaN or not a number");
    });
  });

  describe("missing keys", () => {
    it("detects missing MBTI key JP", () => {
      const incompleteMbti: Record<string, number> = { EI: validMbti.EI, SN: validMbti.SN, TF: validMbti.TF };
      const result = validateScoresBeforePersist(
        { riasec: validRiasec, mi: validMi, mbti: incompleteMbti, values: validValues },
        25
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("mbti missing keys: JP")])
      );
    });

    it("detects missing RIASEC keys", () => {
      const result = validateScoresBeforePersist(
        { riasec: { R: 10 }, mi: validMi, mbti: validMbti, values: validValues },
        25
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("riasec missing keys:")])
      );
    });
  });

  describe("response count", () => {
    it("rejects suspiciously low response count of 3", () => {
      const result = validateScoresBeforePersist(
        { riasec: validRiasec, mi: validMi, mbti: validMbti, values: validValues },
        3
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Response count 3 is suspiciously low");
    });
  });

  describe("multiple errors", () => {
    it("accumulates NaN and missing key errors", () => {
      const incompleteMbti2: Record<string, number> = { EI: validMbti.EI, SN: validMbti.SN, TF: validMbti.TF };
      const result = validateScoresBeforePersist(
        {
          riasec: { ...validRiasec, R: NaN },
          mi: validMi,
          mbti: incompleteMbti2,
          values: validValues,
        },
        25
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("empty score records", () => {
    it("reports multiple errors for all missing keys", () => {
      const result = validateScoresBeforePersist(
        { riasec: {}, mi: {}, mbti: {}, values: {} },
        0
      );
      expect(result.valid).toBe(false);
      // Should have errors for missing keys in all 4 frameworks + low response count
      expect(result.errors.length).toBeGreaterThanOrEqual(5);
    });
  });
});
