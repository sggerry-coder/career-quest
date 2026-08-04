/**
 * @vitest-environment jsdom
 *
 * The class round trip when the confirmatory round actually changes the
 * answer -- the case class-round-trip.test.tsx cannot reach, because it mocks
 * the hooks and hands the page an empty `adaptiveQuestions`, so the locked
 * class always equals the final class.
 *
 * This drives the real reducer, the real scoring hook and the real Supabase
 * write, through the real resume path, and answers two real adaptive
 * questions. Two things have to hold at the end, and they pull in opposite
 * directions:
 *
 *   1. what is saved must be derivable from the chart the student is shown
 *      (the spec's acceptance criterion), and
 *   2. the student must not silently be given a different class from the one
 *      the reveal named them (the "may deepen, must not flip" rule).
 *
 * The class is re-derived to satisfy (1), so (2) survives only because the
 * completion screen names the change. That narration is the whole reason the
 * deviation is defensible, and nothing else in the suite fails if it is
 * deleted.
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { saveSessionSnapshot } from "@/lib/persistence/session-snapshot";
import { session1AdaptivePool } from "@/data/questions/session-1-adaptive";
import {
  deriveCharacterClass,
  parseCharacterClass,
  characterClassDisplayName,
} from "@/lib/character/classes";
import type { QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

// ---------------------------------------------------------------------------
// Mocks -- real hooks throughout; only the network and the confetti are faked.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const calls: Array<{ table: string; method: string; payload: unknown }> = [];
  return { pushMock: vi.fn(), calls };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { tone: "quest", self_map: {}, has_completed_session1: false },
              error: null,
            }),
        }),
      }),
      upsert: (payload: unknown) => {
        h.calls.push({ table, method: "upsert", payload });
        return Promise.resolve({ error: null });
      },
      update: (payload: unknown) => ({
        eq: () => {
          h.calls.push({ table, method: "update", payload });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

vi.mock("@/components/badges/badge-unlock", async () => {
  const { useEffect } = await import("react");
  function MockBadgeUnlock({ onComplete }: { onComplete: () => void }): React.JSX.Element {
    useEffect(() => {
      onComplete();
    }, [onComplete]);
    return <div data-testid="badge-unlock" />;
  }
  return { default: MockBadgeUnlock };
});

import Session from "@/app/quest/session/[id]/page";

// ---------------------------------------------------------------------------
// The flip, in arithmetic
// ---------------------------------------------------------------------------
//
// calculateRiasecType = ((sum − count·1) / (count·3)) · 100
//
//   at the reveal        S [3,3] → 66.7   E [3,2] → 50.0   A [2,2] → 33.3
//     deriveClassLabel: S > 50, second (E 50) not > 50, S − E = 16.7 > 15
//       → "HELPER" → Guardian, and that is what the reveal named them
//
//   two confirmatory answers, both "Strongly Like" (4), both targeting E --
//   which is exactly what selectAdaptiveQuestions does, since it gives the
//   leader ambiguity: Infinity and ranks the runner-up first:
//
//   at the save          S [3,3] → 66.7   E [3,2,4,4] → 75.0   A [2,2] → 33.3
//     deriveClassLabel: E and S both > 50, S − A = 33.3 > 10
//       → "LEADER-HELPER" → Vanguard-Guardian
//
// The primary moved. Before the re-derivation the chart said Vanguard and the
// database said Guardian, for good.

const CONFIRMATORY_QUESTIONS = ["s1-adapt-E-01", "s1-adapt-E-02"].map((id) => {
  const q = session1AdaptivePool.find((p) => p.id === id);
  if (!q) throw new Error(`${id} missing from the adaptive pool`);
  return q;
});

const AT_REVEAL = { R: [1, 1], I: [1, 1], A: [2, 2], S: [3, 3], E: [3, 2], C: [1, 1] };

function makeQuestState(): QuestState {
  return {
    flowPhase: "confirmatory",
    currentIndex: 35,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: CONFIRMATORY_QUESTIONS,
    confirmIndex: 0,
    current_block: "confirmatory",
    questions_answered: 12,
    responses: Array.from({ length: 12 }, (_, i) => ({
      question_id: `q-${i}`,
      response_value: 3,
      response_label: "answer",
      framework: "riasec",
      framework_target: "R",
      answered_at: 0,
    })),
    selected_adaptive_ids: CONFIRMATORY_QUESTIONS.map((q) => q.id),
    persistence_failed: false,
    last_response_undoable: false,
    engagementShown: true,
    // What the reveal named them, carried in the checkpoint.
    avatarClass: "guardian",
    classNamedPending: false,
  };
}

function makeScoreState(): ScoreState {
  return {
    // Recomputed from riasec_raw by restoreScores, so these need only be
    // present and well-shaped.
    riasec: { R: 0, I: 0, A: 33.3, S: 66.7, E: 50, C: 0 },
    riasec_raw: AT_REVEAL,
    riasec_ipsative_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
    mi: {
      linguistic: 0, logical: 0, spatial: 0, musical: 0,
      bodily: 0, interpersonal: 0, intrapersonal: 0, naturalistic: 0,
    },
    mi_raw: {},
    mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw: { EI: [], SN: [], TF: [], JP: [] },
    values: {
      security_adventure: 0, income_impact: 0, prestige_fulfilment: 0,
      structure_flexibility: 0, solo_team: 0,
    },
    values_raw: {},
    strengths: ["Empathy"],
    strength_signals: ["Empathy"],
    rating_responses: [3, 3, 3, 2, 2, 2, 1, 1, 1, 3, 3, 2],
    acquiescence_flag: false,
    // Snapshot taken when the confirmatory round began, so the completion
    // screen renders the "sharpened" card the change line lives in.
    riasec_snapshot: { R: 0, I: 0, A: 33.3, S: 66.7, E: 50, C: 0 },
    class_label: "HELPER",
    signal_history: [],
  };
}

beforeEach(() => {
  h.calls.length = 0;
  h.pushMock.mockClear();
  window.localStorage.clear();
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

/**
 * Resume into the confirmatory round, answer both questions "Strongly Like",
 * and land on the completion screen with the save done.
 */
async function runConfirmatoryRound(): Promise<void> {
  saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);

  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Session params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });

  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Resume Quest" }));
  });

  for (const q of CONFIRMATORY_QUESTIONS) {
    await screen.findByText(q.question_text);
    await act(async () => {
      // The rating scale now names each point by the digit the student can
      // see as well as its wording -- see components/quest/likert-slider.
      fireEvent.click(screen.getByRole("radio", { name: "4 — Strongly Like" }));
    });
  }

  await screen.findByText("Quest Chapter 1 Complete");
}

/** The last string written to students.avatar_class. */
function persistedAvatarClass(): string {
  const write = h.calls.filter((c) => c.table === "students").at(-1);
  return (write!.payload as { avatar_class: string }).avatar_class;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("a confirmatory round that changes the class", () => {
  it("really does move the chart under the locked class", async () => {
    await runConfirmatoryRound();

    const scores = h.calls.find((c) => c.table === "assessment_scores");
    const riasec = (scores?.payload as { riasec_scores: Record<string, number> })
      .riasec_scores;

    expect(riasec.E).toBeCloseTo(75, 1);
    expect(riasec.S).toBeCloseTo(66.7, 1);
    // The reveal named them Guardian off a chart where S led.
    expect(deriveCharacterClass(riasec).primary).toBe("vanguard");
  });

  it("saves the class the final chart derives, not the locked one", async () => {
    await runConfirmatoryRound();

    const stored = persistedAvatarClass();
    const scores = h.calls.find((c) => c.table === "assessment_scores");
    const riasec = (scores?.payload as { riasec_scores: Record<string, number> })
      .riasec_scores;

    expect(stored).toBe("vanguard-guardian");
    expect(parseCharacterClass(stored)).toEqual(deriveCharacterClass(riasec));
  });

  it("tells the student their class changed, rather than letting the dashboard do it", async () => {
    await runConfirmatoryRound();

    // The exact before -> after the student reads, and the after is the name
    // the dashboard will print from what was saved.
    expect(screen.getByText(/Guardian → Vanguard-Guardian/)).toBeDefined();
    expect(
      characterClassDisplayName(parseCharacterClass(persistedAvatarClass()), "quest")
    ).toBe("Vanguard-Guardian");
    // Never "your class changed" alongside "your answers held firm".
    expect(screen.queryByText(/held firm/)).toBeNull();
  });

  it("paints the completion screen in the palette of the name it is showing", async () => {
    await runConfirmatoryRound();

    // The theme followed the locked class, so a flipped student read
    // "Vanguard-Guardian" in Guardian's jade and the dashboard repainted a
    // moment later.
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe(
        "vanguard-gold"
      );
    });
  });
});
