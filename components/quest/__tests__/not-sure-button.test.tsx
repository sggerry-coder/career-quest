/**
 * @vitest-environment jsdom
 *
 * What the escape hatch is called, and that it is still the escape hatch.
 *
 * The scoring layer now records a skipped question as genuinely missing
 * rather than scoring it as though it had been answered, so the control can
 * finally be named for what the student means by pressing it. "Skip this
 * question" described the app's old behaviour and invited the bored student
 * as readily as the honest one; "I'm not sure" is a real answer to "how much
 * do you like this?", and it is what the data now says.
 *
 * The internal action is still SKIP -- see use-quest-state -- and nothing
 * here should make that name change. This is the surface only.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import QuestionCard from "@/components/quest/question-card";

afterEach(() => cleanup());

function renderCard(onSkip: () => void, canSkip = true): void {
  render(
    <QuestionCard
      questionText="I would enjoy fixing a bike"
      questionIndex={3}
      totalQuestions={12}
      blockName=""
      timeEstimate=""
      direction="right"
      canUndo={false}
      onUndo={() => {}}
      canSkip={canSkip}
      onSkip={onSkip}
    >
      <div />
    </QuestionCard>
  );
}

describe("the not-sure control", () => {
  it("says what the student means, not what the app used to do", () => {
    renderCard(() => {});

    expect(screen.getByRole("button", { name: "I'm not sure" })).toBeDefined();
    // Its accessible name is its visible text, so there is no second place
    // for the old word to survive.
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
  });

  it("still advances past the question", () => {
    const onSkip = vi.fn();
    renderCard(onSkip);

    fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("is offered only where the block allows it", () => {
    renderCard(() => {}, false);

    expect(screen.queryByRole("button", { name: "I'm not sure" })).toBeNull();
  });
});
