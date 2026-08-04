/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import RevealSequence from "@/components/quest/reveal-sequence";
import type { DerivedClass } from "@/lib/character/classes";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Deliberately points a raw RIASEC derivation at CREATOR/Bard (A dominant,
// >50 and >15 ahead of the runner-up) while the class actually locked in by
// useEmergentClass -- passed in as `resolvedClass` -- is Guardian. This is
// exactly the scenario the lock exists for: a student's lead shifted after
// naming. If RevealSequence ever goes back to deriving its own class from
// scoreState.riasec instead of trusting the resolved prop, this test must
// fail because it would show Bard instead of Guardian.
const scoreStateWithBardLeaningRiasec = {
  riasec: { R: 10, I: 10, A: 90, S: 10, E: 10, C: 10 },
  mi: {},
  mbti: { EI: 40, SN: -40, TF: 40, JP: -40 },
  mbti_raw: {
    EI: [1, 2, 3],
    SN: [-2, -1, -1],
    TF: [2],
    JP: [-1, -2],
  },
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

const lockedGuardian: DerivedClass = {
  primary: "guardian",
  secondary: null,
  isNamed: true,
};

async function renderAndAdvanceToClassLabel(): Promise<void> {
  vi.useFakeTimers();
  render(
    <RevealSequence
      scoreState={scoreStateWithBardLeaningRiasec}
      className="Guardian"
      resolvedClass={lockedGuardian}
      tone="quest"
      onRevealComplete={() => {}}
    />
  );

  // "transition" phase auto-advances to "riasec" after 2s.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  vi.useRealTimers();

  // "riasec" -> "class_label" is a manual Continue click.
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

describe("RevealSequence", () => {
  it("shows the resolved class, never a fresh derivation of the raw scores", async () => {
    await renderAndAdvanceToClassLabel();

    expect(screen.getByText(/CLASS:\s*Guardian/)).toBeDefined();
    expect(screen.queryByText(/Bard/)).toBeNull();
  });

  it("describes the same class it displays", async () => {
    await renderAndAdvanceToClassLabel();

    expect(screen.getByText(/A Guardian who/)).toBeDefined();
    expect(screen.queryByText(/Bard/)).toBeNull();
  });
});
