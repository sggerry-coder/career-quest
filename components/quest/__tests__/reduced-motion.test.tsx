/**
 * @vitest-environment jsdom
 *
 * Framer Motion ran at full strength no matter what the student had asked the
 * OS for. globals.css has carried a prefers-reduced-motion block since the
 * start, but it can only reach CSS animation and transition — and everything
 * that actually moves here is driven by Framer in JavaScript.
 *
 * The rule these assert is "reduced, not removed": with the setting on, every
 * beat is still shown, every control is still reachable, and the student can
 * still tell the screen changed. What goes is the theatre.
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MotionConfigContext } from "framer-motion";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MotionProvider } from "@/components/ui/motion-provider";
import ClassNamedScreen from "@/components/quest/class-named-screen";
import CompletionScreen from "@/components/quest/completion-screen";
import RevealSequence from "@/components/quest/reveal-sequence";
import BadgeUnlock from "@/components/badges/badge-unlock";
import type { DerivedClass } from "@/lib/character/classes";

const h = vi.hoisted(() => ({ confetti: vi.fn() }));
vi.mock("canvas-confetti", () => ({ default: h.confetti }));

/**
 * One MediaQueryList for the whole file, installed before anything renders.
 *
 * Framer subscribes to prefers-reduced-motion once, at its first useReducedMotion
 * call, and keeps that MediaQueryList forever — so handing out a fresh stub per
 * test would be read exactly once and then ignored. This hands out the same
 * object and notifies the listener Framer registered, which is what a student
 * toggling the setting actually does.
 */
const motionListeners = new Set<() => void>();
const motionQuery = {
  matches: false,
  media: "(prefers-reduced-motion)",
  onchange: null,
  addListener: (cb: () => void) => motionListeners.add(cb),
  removeListener: (cb: () => void) => motionListeners.delete(cb),
  addEventListener: (_type: string, cb: () => void) => motionListeners.add(cb),
  removeEventListener: (_type: string, cb: () => void) =>
    motionListeners.delete(cb),
  dispatchEvent: () => false,
};
window.matchMedia = (() => motionQuery) as unknown as typeof window.matchMedia;

/** Answer prefers-reduced-motion the way the student's OS would. */
function setReducedMotion(reduce: boolean): void {
  motionQuery.matches = reduce;
  for (const listener of motionListeners) listener();
}

const guardian: DerivedClass = {
  primary: "guardian",
  secondary: null,
  isNamed: true,
};

const scoreState = {
  riasec: { R: 10, I: 10, A: 90, S: 10, E: 10, C: 10 },
  mi: { linguistic: 60 },
  mbti: { EI: 40, SN: -40, TF: 40, JP: -40 },
  values: {
    security_adventure: 50,
    income_impact: 0,
    prestige_fulfilment: 0,
    structure_flexibility: 0,
    solo_team: -40,
  },
  strengths: [],
  class_label: "",
};

beforeEach(() => {
  h.confetti.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the root MotionConfig", () => {
  it("tells Framer to honour the OS setting", () => {
    function Probe(): React.JSX.Element {
      const { reducedMotion } = React.useContext(MotionConfigContext);
      return <span data-testid="probe">{String(reducedMotion)}</span>;
    }
    render(
      <MotionProvider>
        <Probe />
      </MotionProvider>
    );

    // "user", not "always" and not "never": transforms stop, opacity and
    // colour do not, so nothing is skipped.
    expect(screen.getByTestId("probe").textContent).toBe("user");
  });

  it("is mounted at the root, where it can reach the whole app", () => {
    // A config nobody wraps the tree in is the same as no config, and this is
    // the one thing no component test can catch.
    const layout = readFileSync(
      join(import.meta.dirname, "..", "..", "..", "app", "layout.tsx"),
      "utf8"
    );
    expect(layout).toContain("<MotionProvider>");
    expect(layout.indexOf("<MotionProvider>")).toBeLessThan(
      layout.indexOf("{children}")
    );
  });
});

describe("the celebration's confetti", () => {
  it("fires when the student has not asked for less motion", async () => {
    setReducedMotion(false);
    render(
      <MotionProvider>
        <CompletionScreen
          tone="quest"
          classLabel="Guardian"
          scoreState={{ riasec: {}, strengths: [] }}
          onViewDashboard={() => {}}
          onSaveExit={() => {}}
        />
      </MotionProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(h.confetti).toHaveBeenCalled();
  });

  it("does not when they have, and the celebration is still a celebration", async () => {
    setReducedMotion(true);
    render(
      <MotionProvider>
        <CompletionScreen
          tone="quest"
          classLabel="Guardian"
          scoreState={{ riasec: {}, strengths: ["Creative Thinking"] }}
          onViewDashboard={() => {}}
          onSaveExit={() => {}}
        />
      </MotionProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(h.confetti).not.toHaveBeenCalled();

    // Removed the particles, not the content: every beat is still here and
    // both ways out still work.
    expect(screen.getByText("Quest Chapter 1 Complete")).toBeDefined();
    expect(screen.getByText("Your profile has been forged!")).toBeDefined();
    expect(screen.getByText("Guardian")).toBeDefined();
    expect(screen.getByText("Creative Thinking")).toBeDefined();
    expect(screen.getByRole("button", { name: "View Dashboard" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Save & Exit" })).toBeDefined();
  });
});

describe("the naming moment", () => {
  it("shows Continue immediately rather than 1.1s into a fade", () => {
    setReducedMotion(true);
    render(
      <MotionProvider>
        <ClassNamedScreen derived={guardian} tone="quest" onContinue={() => {}} />
      </MotionProvider>
    );

    // Delay-staged content is invisible *and* clickable while it waits. Under
    // reduced motion the whole screen renders at its target state, so the
    // button is visible from the first frame.
    const cta = screen.getByRole("button", { name: "Continue the quest" });
    expect(cta.style.opacity).not.toBe("0");
    expect(screen.getByText("You are a Guardian.")).toBeDefined();
    expect(
      screen.getByText("You stand where someone else would have fallen.")
    ).toBeDefined();
  });

  it("still stages the beats when motion is welcome", () => {
    setReducedMotion(false);
    render(
      <MotionProvider>
        <ClassNamedScreen derived={guardian} tone="quest" onContinue={() => {}} />
      </MotionProvider>
    );

    expect(
      screen.getByRole("button", { name: "Continue the quest" }).style.opacity
    ).toBe("0");
  });

  it("is operable the instant it appears under reduced motion", () => {
    setReducedMotion(true);
    const onContinue = vi.fn();
    render(
      <MotionProvider>
        <ClassNamedScreen
          derived={guardian}
          tone="quest"
          onContinue={onContinue}
        />
      </MotionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue the quest" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe("the reveal sequence", () => {
  it("still shows every beat, and still ends, under reduced motion", async () => {
    setReducedMotion(true);
    const onRevealComplete = vi.fn();
    vi.useFakeTimers();
    render(
      <MotionProvider>
        <RevealSequence
          scoreState={scoreState}
          resolvedClass={guardian}
          tone="quest"
          onRevealComplete={onRevealComplete}
        />
      </MotionProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    // Every beat, in order, none skipped because nothing animated.
    const beats = [
      "Ability Scores",
      "Your class",
      "Learning Styles",
      "Character Traits",
      "About your personality type",
      "Values Compass",
      "What these charts mean",
    ];
    for (const name of beats) {
      expect(
        screen.getByRole("group", { name }),
        `beat "${name}" never appeared`
      ).toBeDefined();
      fireEvent.click(
        screen.getByRole("button", { name: /Continue|Sharpen results/ })
      );
    }

    // ...and it is still dismissable: the confirmatory intro, then done.
    expect(screen.getByText("Want to sharpen your results?")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Let's go!" }));
    expect(onRevealComplete).toHaveBeenCalledTimes(1);
  });
});

describe("the badge overlay", () => {
  it("stops the glow looping forever but still says what was earned", () => {
    setReducedMotion(true);
    render(
      <MotionProvider>
        <BadgeUnlock
          badgeName="Self-Discoverer"
          badgeIcon="magnifying-glass"
          onComplete={() => {}}
        />
      </MotionProvider>
    );

    expect(screen.getByText("Self-Discoverer")).toBeDefined();
    expect(screen.getByText("Badge Unlocked!")).toBeDefined();
    expect(screen.getByText("Tap to continue")).toBeDefined();
  });
});
