/** @vitest-environment jsdom */
/**
 * The completion screen is the only place in the quest that makes a claim
 * about the whole profile: one archetype card, one strength card, one
 * sentence. Every chart elsewhere can qualify itself -- "Not answered yet",
 * "Answer more questions to refine", a Wanderer where the evidence ran out --
 * and none of that reaches this screen. So a student who skipped most of the
 * chapter was congratulated in exactly the words used on one who answered all
 * of it, and the counts were the only thing that differed.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CompletionScreen from "@/components/quest/completion-screen";

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => cleanup());

const scoreState = {
  riasec: { R: 0, I: 0, A: 0, S: 100, E: 0, C: 0 },
  strengths: ["Empathy"],
};

/** A student who skipped all 19 skippable questions and finished. */
function renderSparse(tone: "quest" | "explorer") {
  render(
    <CompletionScreen
      tone={tone}
      classLabel="Wanderer"
      scoreState={scoreState}
      answeredCount={21}
      askedCount={40}
      onViewDashboard={vi.fn()}
      onSaveExit={vi.fn()}
    />
  );
}

describe("CompletionScreen on a thin profile", () => {
  it("says what the profile is built on instead of declaring it forged", () => {
    renderSparse("quest");

    expect(screen.getByText(/Built from 21 of 40 answers/)).toBeDefined();
    expect(screen.queryByText("Your profile has been forged!")).toBeNull();
  });

  it("says it in explorer tone too, rather than leaving that voice unchanged", () => {
    renderSparse("explorer");

    expect(screen.getByText(/Built from 21 of 40 answers/)).toBeDefined();
    expect(screen.queryByText("Here’s what we discovered.")).toBeNull();
  });

  it("still celebrates -- the heading and the archetype card are untouched", () => {
    renderSparse("quest");

    // The point is an honest summary, not a punishment: they finished, and
    // the screen still says so.
    expect(screen.getByText("Quest Chapter 1 Complete")).toBeDefined();
    expect(screen.getByText("Wanderer")).toBeDefined();
    expect(screen.getByText("Empathy")).toBeDefined();
  });

  it("leaves a student who answered everything with the confident line", () => {
    render(
      <CompletionScreen
        tone="quest"
        classLabel="Guardian"
        scoreState={scoreState}
        answeredCount={40}
        askedCount={40}
        onViewDashboard={vi.fn()}
        onSaveExit={vi.fn()}
      />
    );

    expect(screen.getByText("Your profile has been forged!")).toBeDefined();
    expect(screen.queryByText(/Built from/)).toBeNull();
  });
});
