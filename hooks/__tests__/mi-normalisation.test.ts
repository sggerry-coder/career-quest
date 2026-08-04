/** @vitest-environment jsdom */
/**
 * MI normalisation, driven through the real questions and the real hook.
 *
 * Warm-up options carry a total signal weight of 1 and MI-block options carry
 * 2, but scores were computed as sum / (count * 2). A warm-up pick could
 * therefore never take its dimension above 50, however many times the student
 * made it -- so "your strongest learning styles" ranked a dimension chosen
 * twice above one chosen five times.
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useScores } from "@/hooks/use-scores";
import { warmupQuestions, miQuestions } from "@/data/questions/session-1-core";
import type { Question, QuestionOption } from "@/lib/types/quest";

afterEach(() => cleanup());

/** The first option of `q` whose MI signals mention `dimension`. */
function optionFor(q: Question, dimension: string): QuestionOption {
  const option = q.options.find(
    (o) =>
      o.framework_signals &&
      Object.keys(o.framework_signals).some(
        (k) => k === dimension || k === `mi_${dimension}`
      )
  );
  if (!option) throw new Error(`${q.id} has no ${dimension} option`);
  return option;
}

function answer(
  result: { current: ReturnType<typeof useScores> },
  q: Question,
  option: QuestionOption
): void {
  act(() =>
    result.current.processResponseWithSignals(
      {
        question_id: q.id,
        response_value: option.value as number,
        response_label: option.label,
        framework: q.framework,
        framework_target: q.framework_target,
        answered_at: 0,
        reverse_scored: false,
      },
      option.framework_signals!,
      option.strength_signal
    )
  );
}

describe("MI evidence and rank", () => {
  it("ranks five warm-up picks at least as high as two MI-block picks", () => {
    const { result } = renderHook(() => useScores());

    // Five warm-up questions, logical every time.
    for (const q of warmupQuestions) {
      answer(result, q, optionFor(q, "logical"));
    }
    // Both MI-block questions that offer music, musical both times.
    for (const q of miQuestions.filter((mq) =>
      mq.options.some(
        (o) => o.framework_signals && "musical" in o.framework_signals
      )
    )) {
      answer(result, q, optionFor(q, "musical"));
    }

    const { logical, musical } = result.current.scoreState.mi;
    expect(result.current.scoreState.mi_raw.logical).toHaveLength(5);
    expect(result.current.scoreState.mi_raw.musical).toHaveLength(2);

    // Before: logical 50, musical 100.
    expect(logical).toBe(100);
    expect(musical).toBe(100);
    expect(logical).toBeGreaterThanOrEqual(musical);
  });

  it("counts an option split across two dimensions as half an answer each", () => {
    const { result } = renderHook(() => useScores());
    // s1-mi-learn-01's "figure it out by experimenting" is { logical: 1,
    // intrapersonal: 1 } -- half the answer each, where a warm-up's weight of
    // 1 is the whole answer.
    const q = miQuestions[0];
    const split = q.options.find(
      (o) => Object.keys(o.framework_signals ?? {}).length === 2
    )!;

    answer(result, q, split);
    answer(result, q, split);

    expect(result.current.scoreState.mi.logical).toBe(50);
    expect(result.current.scoreState.mi.intrapersonal).toBe(50);
  });

  it("undoes an MI answer cleanly", () => {
    const { result } = renderHook(() => useScores());
    const q = warmupQuestions[0];
    const option = optionFor(q, "logical");

    answer(result, q, option);
    answer(result, q, option);
    expect(result.current.scoreState.mi.logical).toBe(100);

    act(() => result.current.removeLastResponse());
    expect(result.current.scoreState.mi_raw.logical).toHaveLength(1);
    expect(result.current.scoreState.mi.logical).toBe(0);
  });
});
