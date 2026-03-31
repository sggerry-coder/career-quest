import { describe, it, expect } from "vitest";
import { selectAdaptiveQuestions } from "../adaptive";
import type { Question } from "@/lib/types/quest";

function makeRiasecQuestion(
  id: string,
  target: string
): Question {
  return {
    id,
    session_number: 1,
    block: "confirmatory",
    question_text: `RIASEC ${target} adaptive question ${id}`,
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1 },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5 },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: target,
    is_adaptive: true,
  };
}

function makeMbtiQuestion(
  id: string,
  target: string
): Question {
  return {
    id,
    session_number: 1,
    block: "confirmatory",
    question_text: `MBTI ${target} adaptive question ${id}`,
    question_type: "forced_choice",
    options: [
      { label: "Option A", value: -3 },
      { label: "Option B", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: target,
    is_adaptive: true,
  };
}

function makeMiQuestion(
  id: string,
  target: string
): Question {
  return {
    id,
    session_number: 1,
    block: "confirmatory",
    question_text: `MI ${target} adaptive question ${id}`,
    question_type: "multiple_choice",
    options: [
      { label: "Option A", value: 1, framework_signals: { [target]: 2 } },
      { label: "Option B", value: 2, framework_signals: { [target]: 1 } },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: target,
    is_adaptive: true,
  };
}

// Build a pool of 30 adaptive questions: 18 RIASEC + 8 MBTI + 4 MI
function buildPool(): Question[] {
  const pool: Question[] = [];
  // 18 RIASEC: 3 per type
  for (const type of ["R", "I", "A", "S", "E", "C"]) {
    for (let i = 1; i <= 3; i++) {
      pool.push(makeRiasecQuestion(`adapt-riasec-${type}-${i}`, type));
    }
  }
  // 8 MBTI: 2 per dichotomy
  for (const dich of ["EI", "SN", "TF", "JP"]) {
    for (let i = 1; i <= 2; i++) {
      pool.push(makeMbtiQuestion(`adapt-mbti-${dich}-${i}`, dich));
    }
  }
  // 4 MI: 1 each
  for (const dim of ["linguistic", "spatial", "bodily", "interpersonal"]) {
    pool.push(makeMiQuestion(`adapt-mi-${dim}`, dim));
  }
  return pool;
}

describe("selectAdaptiveQuestions", () => {
  const pool = buildPool();

  it("returns exactly 5 questions", () => {
    const riasecScores = { R: 60, I: 58, A: 40, S: 30, E: 20, C: 10 };
    const riasecRaw = { R: [4, 5], I: [4, 4], A: [3, 2], S: [2, 2], E: [1, 2], C: [1, 1] };
    const miScores = { linguistic: 80, logical: 50, spatial: 75, musical: 10, bodily: 60, interpersonal: 70, intrapersonal: 30, naturalistic: 40 };
    const miRaw = { linguistic: [2], logical: [1], spatial: [2, 1], musical: [], bodily: [1], interpersonal: [2], intrapersonal: [0], naturalistic: [1] };
    const mbtiScores = { EI: -67, SN: 67, TF: 0, JP: -33 };
    const mbtiRaw = { EI: [-3, -1], SN: [2, 2], TF: [0, 0], JP: [-1, -1] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    expect(selected).toHaveLength(5);
  });

  it("does not exceed max 2 per RIASEC type", () => {
    // Make R and I very close so algorithm wants lots of RIASEC R questions
    const riasecScores = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    const riasecRaw = { R: [3, 3], I: [3, 3], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] };
    const miScores = { linguistic: 50, logical: 50, spatial: 50, musical: 50, bodily: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 };
    const miRaw = { linguistic: [1], logical: [1], spatial: [1], musical: [1], bodily: [1], interpersonal: [1], intrapersonal: [1], naturalistic: [1] };
    const mbtiScores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    // Count per RIASEC type
    for (const type of ["R", "I", "A", "S", "E", "C"]) {
      const count = selected.filter(
        (q) => q.framework === "riasec" && q.framework_target === type
      ).length;
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("does not exceed max 2 per MBTI dichotomy", () => {
    const riasecScores = { R: 80, I: 20, A: 80, S: 20, E: 80, C: 20 };
    const riasecRaw = { R: [5, 5], I: [1, 1], A: [5, 5], S: [1, 1], E: [5, 5], C: [1, 1] };
    const miScores = { linguistic: 100, logical: 100, spatial: 100, musical: 100, bodily: 100, interpersonal: 100, intrapersonal: 100, naturalistic: 100 };
    const miRaw = { linguistic: [2], logical: [2], spatial: [2], musical: [2], bodily: [2], interpersonal: [2], intrapersonal: [2], naturalistic: [2] };
    const mbtiScores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    for (const dich of ["EI", "SN", "TF", "JP"]) {
      const count = selected.filter(
        (q) => q.framework === "mbti" && q.framework_target === dich
      ).length;
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("does not exceed max 1 MI question", () => {
    const riasecScores = { R: 80, I: 80, A: 80, S: 80, E: 80, C: 80 };
    const riasecRaw = { R: [5, 5], I: [5, 5], A: [5, 5], S: [5, 5], E: [5, 5], C: [5, 5] };
    const miScores = { linguistic: 50, logical: 50, spatial: 50, musical: 50, bodily: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 };
    const miRaw = { linguistic: [1], logical: [1], spatial: [1], musical: [1], bodily: [1], interpersonal: [1], intrapersonal: [1], naturalistic: [1] };
    const mbtiScores = { EI: -100, SN: 100, TF: -100, JP: 100 };
    const mbtiRaw = { EI: [-3, -3], SN: [3, 3], TF: [-3, -3], JP: [3, 3] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    const miCount = selected.filter((q) => q.framework === "mi").length;
    expect(miCount).toBeLessThanOrEqual(1);
  });

  it("handles edge case where all scores are equal", () => {
    const riasecScores = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    const riasecRaw = { R: [3, 3], I: [3, 3], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] };
    const miScores = { linguistic: 50, logical: 50, spatial: 50, musical: 50, bodily: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 };
    const miRaw = { linguistic: [1], logical: [1], spatial: [1], musical: [1], bodily: [1], interpersonal: [1], intrapersonal: [1], naturalistic: [1] };
    const mbtiScores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    expect(selected).toHaveLength(5);
    // All questions should be unique
    const ids = selected.map((q) => q.id);
    expect(new Set(ids).size).toBe(5);
  });

  it("prioritizes most ambiguous dimensions", () => {
    // MBTI TF and JP are at 0 (most ambiguous), RIASEC are all clear
    const riasecScores = { R: 100, I: 0, A: 50, S: 25, E: 75, C: 12.5 };
    const riasecRaw = { R: [5, 5], I: [1, 1], A: [3, 3], S: [2, 2], E: [4, 4], C: [1, 1] };
    const miScores = { linguistic: 100, logical: 0, spatial: 100, musical: 0, bodily: 100, interpersonal: 0, intrapersonal: 100, naturalistic: 0 };
    const miRaw = { linguistic: [2], logical: [0], spatial: [2], musical: [0], bodily: [2], interpersonal: [0], intrapersonal: [2], naturalistic: [0] };
    const mbtiScores = { EI: -100, SN: 100, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [-3, -3], SN: [3, 3], TF: [1, -1], JP: [-1, 1] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    // Should include at least one TF and one JP question since those are most ambiguous
    const tfCount = selected.filter(
      (q) => q.framework === "mbti" && q.framework_target === "TF"
    ).length;
    const jpCount = selected.filter(
      (q) => q.framework === "mbti" && q.framework_target === "JP"
    ).length;
    expect(tfCount).toBeGreaterThanOrEqual(1);
    expect(jpCount).toBeGreaterThanOrEqual(1);
  });
});
