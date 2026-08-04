import { describe, it, expect } from "vitest";
import { warmupQuestions } from "@/data/questions/session-1-core";

describe("warm-up signals", () => {
  it("carries no interest signals at all", () => {
    for (const q of warmupQuestions) {
      for (const option of q.options) {
        const keys = Object.keys(option.framework_signals ?? {});
        expect(
          keys.filter((k) => k.startsWith("riasec_")),
          `${q.id} / "${option.label}" still feeds interests`
        ).toEqual([]);
      }
    }
  });

  it("still carries a learning-style signal on every option", () => {
    for (const q of warmupQuestions) {
      for (const option of q.options) {
        const keys = Object.keys(option.framework_signals ?? {});
        expect(
          keys.some((k) => k.startsWith("mi_")),
          `${q.id} / "${option.label}" lost its learning-style signal`
        ).toBe(true);
      }
    }
  });

  it("still carries a strength signal on every option", () => {
    for (const q of warmupQuestions) {
      for (const option of q.options) {
        expect(option.strength_signal, `${q.id} / "${option.label}"`).toBeTruthy();
      }
    }
  });

  it("still offers six distinct strengths per question", () => {
    for (const q of warmupQuestions) {
      const strengths = q.options.map((o) => o.strength_signal);
      expect(new Set(strengths).size, `${q.id} repeats a strength`).toBe(
        strengths.length
      );
    }
  });
});
