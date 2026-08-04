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

// Session 1 gives 2 answers per MBTI dichotomy; deriveEmergingType needs 3
// before it will print a letter. The reveal used to run deriveEmergingType
// anyway, so every student saw four underscores and "Still Emerging"
// presented as a climax -- even one who answered both questions per
// dichotomy at maximum certainty. The reveal no longer renders that card;
// this fixture carries clear mbti scores so describeCharacter has something
// honest to say instead.
const scoreState = {
  riasec: { R: 10, I: 20, A: 90, S: 10, E: 10, C: 10 },
  mi: {},
  mbti: { EI: -80, SN: -60, TF: -70, JP: -50 },
  mbti_raw: {
    EI: [-2, -2],
    SN: [-2, -1],
    TF: [-2, -1],
    JP: [-1, -1],
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

const PHASES = [
  "transition",
  "riasec",
  "class_label",
  "mi_preview",
  "mbti",
  "emerging_type",
  "values",
];

type RevealScoreState = React.ComponentProps<typeof RevealSequence>["scoreState"];

async function advanceToPhase(
  target: string,
  state: RevealScoreState = scoreState
): Promise<void> {
  vi.useFakeTimers();
  render(
    <RevealSequence
      scoreState={state}
      tone="quest"
      resolvedClass={{ primary: "guardian", secondary: null, isNamed: true }}
      onRevealComplete={() => {}}
    />
  );
  // The transition card auto-advances after 2s.
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  vi.useRealTimers();
  for (let i = PHASES.indexOf("riasec"); i < PHASES.indexOf(target); i += 1) {
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  }
}

describe("RevealSequence tells the student when their answers did not separate", () => {
  /**
   * acquiescence_flag was computed on every answer and read by no screen, so
   * the app noticed a student tapping the same button twelve times and told
   * them nothing -- it went straight on to name them a Mage-Guardian. The
   * caveat belongs on the first screen that shows the interest bars.
   */
  async function renderWithFlag(flag: boolean): Promise<void> {
    vi.useFakeTimers();
    render(
      <RevealSequence
        scoreState={{ ...scoreState, acquiescence_flag: flag }}
        tone="quest"
        resolvedClass={{ primary: "guardian", secondary: null, isNamed: true }}
        onRevealComplete={() => {}}
      />
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();
  }

  it("says so on the interest card when the flag is set", async () => {
    await renderWithFlag(true);
    expect(
      screen.getByText(/picked the same answer nearly every time/)
    ).toBeDefined();
  });

  it("says nothing when the answers did separate", async () => {
    await renderWithFlag(false);
    expect(screen.queryByText(/same answer nearly every time/)).toBeNull();
  });
});

describe("RevealSequence emerging_type beat", () => {
  it("never shows an unfillable four-letter card", async () => {
    // Session 1 gives 2 answers per dichotomy; deriveEmergingType needs 3.
    // The card could only ever render underscores.
    await advanceToPhase("emerging_type");
    expect(screen.queryByText(/Still Emerging/)).toBeNull();
    expect(screen.queryByText(/_\s+_\s+_\s+_/)).toBeNull();
  });

  it("shows a personality reading it can actually evidence", async () => {
    await advanceToPhase("emerging_type");
    expect(screen.getByText(/thinks things through alone before speaking/)).toBeDefined();
  });
});

/**
 * The compass and the answers behind it.
 *
 * Every values dimension in the fixture above scores 0, and 0 on a spectrum
 * is dead centre -- so the card said "Balanced for now" three times over
 * whether or not anyone had answered. The reveal is the only screen holding
 * the raw answers, so it is the only one that can tell the two apart; these
 * fail if it stops handing them over.
 */
describe("RevealSequence values beat", () => {
  const ANSWERED_ONE = {
    ...scoreState,
    // One question per dimension in Chapter 1: solo_team answered dead
    // centre, the other two not answered at all. Identical scores, opposite
    // meanings.
    values_raw: {
      security_adventure: [],
      income_impact: [],
      prestige_fulfilment: [],
      structure_flexibility: [],
      solo_team: [0],
    },
  };

  it("claims a balance only for the dimension that was answered", async () => {
    await advanceToPhase("values", ANSWERED_ONE);

    expect(screen.getAllByText("Balanced for now")).toHaveLength(1);
    expect(screen.getAllByText("Not answered yet")).toHaveLength(2);
  });

  it("still reads the whole compass when the raw answers are absent", async () => {
    // A caller with no counts -- a legacy snapshot -- must not have every
    // dimension blanked out from under it.
    await advanceToPhase("values");

    expect(screen.getAllByText("Balanced for now")).toHaveLength(3);
    expect(screen.queryByText("Not answered yet")).toBeNull();
  });
});
