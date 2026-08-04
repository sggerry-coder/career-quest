/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScores } from "@/hooks/use-scores";
import { warmupQuestions } from "@/data/questions/session-1-core";
import type { ClientResponse } from "@/lib/types/quest";

beforeEach(() => {
  // Setup for jsdom environment
});

afterEach(() => {
  // Cleanup
});

describe("warmup integration with scoring pipeline", () => {
  it("warm-up answer leaves RIASEC scores unchanged but changes MI and strength", () => {
    const { result } = renderHook(() => useScores());

    // Capture initial state
    const initialRiasec = structuredClone(result.current.scoreState.riasec);

    // Get first warm-up question's first option
    const warmupQuestion = warmupQuestions[0];
    const selectedOption = warmupQuestion.options[0];

    // Create a response for this option
    const response: ClientResponse = {
      question_id: warmupQuestion.id,
      response_value: selectedOption.value as number,
      response_label: selectedOption.label,
      framework: "multi",
      framework_target: "none",
      answered_at: Date.now(),
      reverse_scored: false,
    };

    // Apply the warm-up response
    act(() => {
      result.current.processResponseWithSignals(
        response,
        selectedOption.framework_signals ?? {},
        selectedOption.strength_signal
      );
    });

    // Assert: RIASEC scores must not change
    for (const type of ["R", "I", "A", "S", "E", "C"]) {
      expect(
        result.current.scoreState.riasec[type],
        `${type} score should not change after warm-up answer`
      ).toBe(initialRiasec[type]);
    }

    // Assert: riasec_raw must remain empty (no interest signals recorded)
    for (const type of ["R", "I", "A", "S", "E", "C"]) {
      expect(
        result.current.scoreState.riasec_raw[type].length,
        `${type} raw should have no entries after warm-up`
      ).toBe(0);
    }

    // Assert: MI signals DID land
    const miKeys = Object.keys(selectedOption.framework_signals ?? {}).filter((k) =>
      k.startsWith("mi_")
    );
    expect(miKeys.length, "warm-up option should carry MI signal").toBeGreaterThan(0);

    for (const miKey of miKeys) {
      const dim = miKey.replace("mi_", "");
      expect(
        result.current.scoreState.mi_raw[dim].length,
        `${dim} MI should have entry after warm-up`
      ).toBeGreaterThan(0);
    }

    // Assert: strength signal was recorded
    expect(
      result.current.scoreState.strength_signals,
      "strength_signals should contain the warm-up strength"
    ).toContain(selectedOption.strength_signal);

    expect(
      result.current.scoreState.strengths,
      "strengths should include the warm-up strength"
    ).toContain(selectedOption.strength_signal);
  });

  it("multiple warm-up answers accumulate MI and strength without changing RIASEC", () => {
    const { result } = renderHook(() => useScores());

    const initialRiasec = structuredClone(result.current.scoreState.riasec);

    // Answer three different warm-up questions
    const questionsToAnswer = [0, 1, 2]; // First three warm-up questions

    for (const qIdx of questionsToAnswer) {
      const q = warmupQuestions[qIdx];
      const option = q.options[qIdx % q.options.length]; // Vary which option

      const response: ClientResponse = {
        question_id: q.id,
        response_value: option.value as number,
        response_label: option.label,
        framework: "multi",
        framework_target: "none",
        answered_at: Date.now(),
        reverse_scored: false,
      };

      act(() => {
        result.current.processResponseWithSignals(
          response,
          option.framework_signals ?? {},
          option.strength_signal
        );
      });
    }

    // Assert: RIASEC scores still unchanged
    for (const type of ["R", "I", "A", "S", "E", "C"]) {
      expect(result.current.scoreState.riasec[type]).toBe(initialRiasec[type]);
    }

    // Assert: At least some MI signals accumulated
    const totalMiRaw = Object.values(result.current.scoreState.mi_raw).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    expect(totalMiRaw).toBe(3); // One MI signal per answer

    // Assert: At least some strength signals accumulated
    expect(result.current.scoreState.strength_signals.length).toBe(3);
  });
});
