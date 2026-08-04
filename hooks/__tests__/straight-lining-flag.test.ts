/** @vitest-environment jsdom */
/**
 * The flag as the running app produces it: driven through the real useScores
 * hook with the real Session 1 rating items, rather than by handing
 * detectStraightLining a prepared array.
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useScores } from "@/hooks/use-scores";
import { riasecLikertQuestions } from "@/data/questions/session-1-core";
import type { ClientResponse } from "@/lib/types/quest";

afterEach(() => cleanup());

function answerFor(index: number, value: number): ClientResponse {
  const q = riasecLikertQuestions[index];
  return {
    question_id: q.id,
    response_value: value,
    response_label: "",
    framework: q.framework,
    framework_target: q.framework_target,
    answered_at: 0,
    reverse_scored: q.reverse_scored,
  };
}

describe("acquiescence_flag through useScores", () => {
  it("is raised by a student who taps the same answer through the interest block", () => {
    const { result } = renderHook(() => useScores());

    for (let i = 0; i < riasecLikertQuestions.length; i += 1) {
      act(() => result.current.processResponse(answerFor(i, 4)));
    }

    expect(result.current.scoreState.rating_responses).toHaveLength(12);
    expect(result.current.scoreState.acquiescence_flag).toBe(true);
  });

  it("is not raised by a student whose answers vary", () => {
    const { result } = renderHook(() => useScores());
    const varied = [4, 1, 3, 4, 2, 3, 4, 4, 1, 3, 2, 2];

    for (let i = 0; i < riasecLikertQuestions.length; i += 1) {
      act(() => result.current.processResponse(answerFor(i, varied[i])));
    }

    expect(result.current.scoreState.acquiescence_flag).toBe(false);
  });

  it("comes back down when the run is undone", () => {
    const { result } = renderHook(() => useScores());

    for (let i = 0; i < riasecLikertQuestions.length; i += 1) {
      act(() => result.current.processResponse(answerFor(i, 4)));
    }
    expect(result.current.scoreState.acquiescence_flag).toBe(true);

    // Undo back under the threshold. rating_responses must unwind with the
    // rest of the score state, or one straight-lined stretch would mark a
    // student for the rest of the quest.
    act(() => result.current.removeLastResponse());
    act(() => result.current.removeLastResponse());
    act(() => result.current.removeLastResponse());
    act(() => result.current.removeLastResponse());
    act(() => result.current.removeLastResponse());

    expect(result.current.scoreState.rating_responses).toHaveLength(7);
    expect(result.current.scoreState.acquiescence_flag).toBe(false);
  });
});
