/**
 * @vitest-environment jsdom
 *
 * Chapter 1 swaps its whole contents without unmounting the page shell, and
 * nothing moved focus at any of those swaps: the control a keyboard student was
 * on disappeared, focus fell back to <body>, and a screen reader was told
 * nothing. These assert the behaviour — a real key or click, then where focus
 * actually went — rather than that some attribute exists.
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import QuestionCard from "@/components/quest/question-card";
import BlockTransition from "@/components/quest/block-transition";
import ClassNamedScreen from "@/components/quest/class-named-screen";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import SelfMapCapture from "@/components/selfmap/self-map-capture";
import CompletionScreen from "@/components/quest/completion-screen";
import SaveFailedScreen from "@/components/quest/save-failed-screen";
import BadgeUnlock from "@/components/badges/badge-unlock";
import RevealSequence from "@/components/quest/reveal-sequence";
import type { DerivedClass } from "@/lib/character/classes";

// The celebration's confetti needs a real canvas; jsdom's throws from inside a
// rAF callback, which Vitest reports as an unhandled error.
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

beforeEach(() => {
  // jsdom does not implement matchMedia, which CompletionScreen reads for the
  // confetti's reduced-motion check.
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** The focused element, and what a screen reader would call it. */
function focused(): { name: string; role: string | null } {
  const el = document.activeElement as HTMLElement;
  return {
    name: (el?.textContent ?? "").trim(),
    role: el?.getAttribute("role") ?? el?.tagName.toLowerCase() ?? null,
  };
}

describe("the question screen", () => {
  function renderCard(questionText: string) {
    return render(
      <QuestionCard
        questionText={questionText}
        questionIndex={0}
        totalQuestions={10}
        blockName=""
        timeEstimate=""
        direction="right"
        canUndo={false}
        onUndo={() => {}}
        canSkip
        onSkip={() => {}}
      >
        <button type="button">An answer</button>
      </QuestionCard>
    );
  }

  it("puts focus on the question when it arrives", () => {
    renderCard("Do you like fixing things?");

    expect(focused()).toEqual({
      name: "Do you like fixing things?",
      role: "h2",
    });
  });

  it("moves focus to the next question rather than dropping it on <body>", async () => {
    const { rerender } = renderCard("Do you like fixing things?");

    // A student answers with the keyboard: focus is on a control that the
    // swap is about to unmount.
    const answer = screen.getByRole("button", { name: "An answer" });
    answer.focus();
    expect(document.activeElement).toBe(answer);

    rerender(
      <QuestionCard
        questionText="Would you rather work alone?"
        questionIndex={1}
        totalQuestions={10}
        blockName=""
        timeEstimate=""
        direction="right"
        canUndo={false}
        onUndo={() => {}}
        canSkip
        onSkip={() => {}}
      >
        <button type="button">An answer</button>
      </QuestionCard>
    );

    // AnimatePresence mode="wait" holds the outgoing card until its exit
    // finishes, so the new heading is not in the DOM on the same tick -- which
    // is exactly why the primitive uses a callback ref rather than an effect.
    await waitFor(() => {
      expect(focused().name).toBe("Would you rather work alone?");
    });
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe("the block interstitial", () => {
  it("takes focus and is named by the narration it exists to deliver", () => {
    render(
      <BlockTransition
        narrationText="Something is taking shape."
        onComplete={() => {}}
      />
    );

    const overlay = screen.getByRole("button", { name: /Tap to continue/ });
    expect(document.activeElement).toBe(overlay);
    // The old aria-label replaced the contents as the accessible name, so the
    // narration was never read out at all.
    expect(overlay.getAttribute("aria-label")).toBeNull();
    expect(overlay.textContent).toContain("Something is taking shape.");
  });
});

describe("the naming moment", () => {
  it("puts focus on the name the student has just been given", () => {
    const derived: DerivedClass = {
      primary: "guardian",
      secondary: null,
      isNamed: true,
    } as DerivedClass;

    render(
      <ClassNamedScreen derived={derived} tone="quest" onContinue={() => {}} />
    );

    expect(focused()).toEqual({ name: "You are a Guardian.", role: "h1" });
  });
});

describe("the engagement checkpoint", () => {
  it("makes its one line a heading and focuses it", () => {
    render(
      <EngagementCheckpoint
        characterName={null}
        tone="quest"
        onContinue={() => {}}
      />
    );

    expect(focused()).toEqual({
      name: "Nice progress! Halfway there...",
      role: "h1",
    });
  });
});

describe("the self-map steps", () => {
  it("moves focus to the next step's heading when Next is pressed", async () => {
    render(<SelfMapCapture onComplete={() => {}} />);

    expect(focused().name).toBe("Before we reveal your results...");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(focused()).toEqual({
        name: "Where have your career ideas come from so far?",
        role: "h2",
      });
    });
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe("the reveal sequence", () => {
  const scoreState = {
    riasec: { R: 10, I: 10, A: 90, S: 10, E: 10, C: 10 },
    mi: {},
    mbti: { EI: 40, SN: -40, TF: 40, JP: -40 },
    values: {
      security_adventure: 0,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 0,
    },
    strengths: [],
    class_label: "",
  };
  const guardian: DerivedClass = {
    primary: "guardian",
    secondary: null,
    isNamed: true,
  };

  it("moves focus onto each beat Continue adds", async () => {
    vi.useFakeTimers();
    render(
      <RevealSequence
        scoreState={scoreState}
        resolvedClass={guardian}
        tone="quest"
        onRevealComplete={() => {}}
      />
    );

    // The reveal *appends*: the Continue button never moves, so nothing about
    // pressing it told a screen reader that a chart had arrived below it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    expect(document.activeElement).toBe(
      screen.getByRole("group", { name: "Ability Scores" })
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("group", { name: "Your class" })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("group", { name: "Learning Styles" })
      );
    });
  });
});

describe("the end of the quest", () => {
  it("the celebration takes focus", () => {
    render(
      <CompletionScreen
        tone="quest"
        classLabel="Guardian"
        scoreState={{ riasec: {}, strengths: [] }}
        onViewDashboard={() => {}}
        onSaveExit={() => {}}
      />
    );

    expect(focused()).toEqual({
      name: "Quest Chapter 1 Complete",
      role: "h1",
    });
  });

  it("the failure screen takes focus instead of leaving it nowhere", () => {
    render(
      <SaveFailedScreen
        errorType="network"
        onRetry={() => {}}
        onSignIn={() => {}}
        onLeave={() => {}}
      />
    );

    expect(focused()).toEqual({
      name: "We couldn't save your results",
      role: "h1",
    });
  });
});

describe("the badge overlay", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("takes focus and says what was unlocked and how to leave", () => {
    render(
      <BadgeUnlock
        badgeName="Self-Discoverer"
        badgeIcon="magnifying-glass"
        onComplete={() => {}}
      />
    );

    const overlay = screen.getByRole("button", { name: /Self-Discoverer/ });
    expect(document.activeElement).toBe(overlay);
    // It read "Badge unlocked. Press to continue" and, being an aria-label on
    // a role="button", hid the badge the student had just earned.
    expect(overlay.getAttribute("aria-label")).toBeNull();
    expect(overlay.textContent).toContain("Tap to continue");
  });

  it("is dismissable from the keyboard once focused", () => {
    const onComplete = vi.fn();
    render(
      <BadgeUnlock
        badgeName="Self-Discoverer"
        badgeIcon="magnifying-glass"
        onComplete={onComplete}
      />
    );

    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
