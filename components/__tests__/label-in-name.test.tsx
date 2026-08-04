/**
 * @vitest-environment jsdom
 *
 * A screen-reader student and a sighted student must be told the same thing.
 *
 * WCAG 2.5.3 (Label in Name): where a control has visible text, that text must
 * appear in its accessible name. An `aria-label` *replaces* the visible text as
 * the name, so an override that says something else does not add information —
 * it hides the visible one. Career Quest had a "Continue Quest" button that read
 * "Continue" to a sighted student in explorer tone, a "Start a new quest" button
 * labelled "Start a new quest instead", a "Continue" button whose last state
 * reads "Sharpen results", a "Let's go!" button announced as "Start confirmatory
 * questions", and a "Keep going!" button announced as "Continue quest". Voice
 * control ("click Keep going") could not operate any of them.
 *
 * This sweeps every control on the screens that carry the flow, so a new
 * override cannot be added without answering to the rule.
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import QuestionCard from "@/components/quest/question-card";
import LikertSlider from "@/components/quest/likert-slider";
import OptionGrid from "@/components/quest/option-grid";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import ResumePrompt from "@/components/quest/resume-prompt";
import SelfMapCapture from "@/components/selfmap/self-map-capture";
import CompletionScreen from "@/components/quest/completion-screen";
import SaveFailedScreen from "@/components/quest/save-failed-screen";
import BlockTransition from "@/components/quest/block-transition";
import { ToneToggle } from "@/components/character/tone-toggle";
import { CuriositiesPicker } from "@/components/character/curiosities-picker";
import { DestinationPicker } from "@/components/character/destination-picker";
import { EducationCards } from "@/components/character/education-cards";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

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

afterEach(() => {
  cleanup();
});

/** What a sighted student reads on the control, decoration excluded. */
function visibleText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) {
    hidden.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Assert 2.5.3 over everything operable in the current render.
 *
 * Controls with no visible text (an icon-only button) are exempt: there is no
 * visible label to contradict, and an aria-label is the only way to name them.
 */
function expectLabelsToMatchWhatIsOnScreen(): void {
  const controls = [
    ...screen.queryAllByRole("button"),
    ...screen.queryAllByRole("radio"),
    ...screen.queryAllByRole("checkbox"),
    ...screen.queryAllByRole("link"),
  ];
  expect(controls.length).toBeGreaterThan(0);

  for (const control of controls) {
    const override = control.getAttribute("aria-label");
    const visible = visibleText(control);
    if (!override || visible === "") continue;

    expect(
      override.toLowerCase(),
      `aria-label "${override}" does not contain the visible label "${visible}"`
    ).toContain(visible.toLowerCase());
  }
}

describe("aria-label never contradicts the visible label", () => {
  it("the question card, with a rating scale", () => {
    render(
      <QuestionCard
        questionText="Do you like fixing things?"
        questionIndex={0}
        totalQuestions={10}
        blockName=""
        timeEstimate=""
        direction="right"
        canUndo
        onUndo={() => {}}
        canSkip
        onSkip={() => {}}
      >
        <LikertSlider value={null} onChange={() => {}} />
      </QuestionCard>
    );
    expectLabelsToMatchWhatIsOnScreen();
  });

  it("the multiple-choice grid", () => {
    render(
      <OptionGrid
        options={[
          { label: "Read or research", value: "a", emoji: "📚" },
          { label: "Build something", value: "b", emoji: "🔨" },
        ]}
        value={null}
        onChange={() => {}}
      />
    );
    expectLabelsToMatchWhatIsOnScreen();
  });

  it.each(["quest", "explorer"] as const)(
    "the engagement checkpoint in %s tone",
    (tone) => {
      render(
        <EngagementCheckpoint
          characterName="Guardian"
          tone={tone}
          onContinue={() => {}}
        />
      );
      expectLabelsToMatchWhatIsOnScreen();
    }
  );

  it.each(["quest", "explorer"] as const)(
    "the resume prompt in %s tone",
    (tone) => {
      render(
        <ResumePrompt
          tone={tone}
          questionsAnswered={7}
          onResume={() => {}}
          onStartOver={() => {}}
        />
      );
      expectLabelsToMatchWhatIsOnScreen();
    }
  );

  it("the self-map capture", () => {
    render(<SelfMapCapture onComplete={() => {}} />);
    expectLabelsToMatchWhatIsOnScreen();
  });

  it("the completion screen", () => {
    render(
      <CompletionScreen
        tone="quest"
        classLabel="Guardian"
        scoreState={{ riasec: {}, strengths: ["Creative Thinking"] }}
        onViewDashboard={() => {}}
        onSaveExit={() => {}}
      />
    );
    expectLabelsToMatchWhatIsOnScreen();
  });

  it.each(["auth", "network"] as const)(
    "the save-failed screen (%s)",
    (errorType) => {
      render(
        <SaveFailedScreen
          errorType={errorType}
          onRetry={() => {}}
          onSignIn={() => {}}
          onLeave={() => {}}
        />
      );
      expectLabelsToMatchWhatIsOnScreen();
    }
  );

  it("the block interstitial", () => {
    render(
      <BlockTransition narrationText="Something is taking shape." onComplete={() => {}} />
    );
    expectLabelsToMatchWhatIsOnScreen();
  });

  it("the character-creation pickers", () => {
    render(
      <>
        <ToneToggle value="quest" onChange={() => {}} />
        <CuriositiesPicker value={[]} onChange={() => {}} />
        <DestinationPicker value={[]} onChange={() => {}} />
        <EducationCards value={null} onChange={() => {}} />
      </>
    );
    expectLabelsToMatchWhatIsOnScreen();
  });
});

describe("the specific contradictions that shipped", () => {
  it("explorer tone's Continue button is not announced as Continue Quest", () => {
    // The landing page's returning-student CTA. Same button, two names.
    render(
      <ResumePrompt
        tone="explorer"
        questionsAnswered={3}
        onResume={() => {}}
        onStartOver={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Resume" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Resume Quest" })).toBeNull();
  });

  it("the checkpoint's button answers to the words printed on it", () => {
    render(
      <EngagementCheckpoint
        characterName={null}
        tone="quest"
        onContinue={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Keep going!" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Continue quest" })).toBeNull();
  });

  it("the emoji on a quest-tone button is decoration, not part of its name", () => {
    render(
      <ResumePrompt
        tone="quest"
        questionsAnswered={3}
        onResume={() => {}}
        onStartOver={() => {}}
      />
    );
    const resume = screen.getByRole("button", { name: "Resume Quest" });
    expect(within(resume).getByText("⚔️").getAttribute("aria-hidden")).toBe(
      "true"
    );
  });
});
