/**
 * @vitest-environment jsdom
 *
 * Locks in the mid-session checkpoint + resume flow (P1.1) with the REAL
 * useQuestState / useScores hooks:
 * - a saved snapshot surfaces the tone-branched resume prompt
 * - Resume rehydrates the reducer at the saved question
 * - Start over clears the snapshot and begins at question 1
 * - answering a question writes a fresh checkpoint
 * - completed students never see the prompt
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { session1CoreQuestions } from "@/data/questions/session-1-core";
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  snapshotKey,
} from "@/lib/persistence/session-snapshot";
import { questReducer, type QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  pushMock: vi.fn(),
  hasCompletedSession1: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                avatar_class: "mage",
                tone: "quest",
                self_map: {},
                has_completed_session1: h.hasCompletedSession1,
              },
              error: null,
            }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

import Session from "@/app/quest/session/[id]/page";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INITIAL_QUEST_STATE: QuestState = {
  flowPhase: "questions",
  currentIndex: 0,
  direction: "right",
  transitionNarration: "",
  adaptiveQuestions: [],
  confirmIndex: 0,
  consecutiveMild: 0,
  current_block: "warmup",
  questions_answered: 0,
  responses: [],
  selected_adaptive_ids: [],
  persistence_failed: false,
  discovery_mode_active: false,
  last_response_undoable: false,
  engagementShown: false,
  avatarClass: "wanderer",
  classNamedPending: false,
};

/** Drive the real reducer to build a snapshot answered up to `index`. */
function buildQuestStateAtIndex(index: number): QuestState {
  let state = INITIAL_QUEST_STATE;
  for (let i = 0; i < index; i++) {
    const q = session1CoreQuestions[i];
    state = questReducer(state, {
      type: "ANSWER_QUESTION",
      response: {
        question_id: q.id,
        response_value: 4,
        response_label: "answer",
        framework: q.framework,
        framework_target: q.framework_target,
        answered_at: Date.now(),
      },
      question: q,
      sessionQuestions: session1CoreQuestions,
    });
    // Dismiss interstitials so the state stays in the questions phase
    if (state.flowPhase === "block_transition") {
      state = questReducer(state, { type: "DISMISS_BLOCK_TRANSITION" });
    }
    if (state.flowPhase === "engagement") {
      state = questReducer(state, { type: "DISMISS_ENGAGEMENT" });
    }
  }
  return state;
}

function makeScoreState(): ScoreState {
  return {
    riasec: { R: 50, I: 30, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: { R: [4, 4], I: [3], A: [], S: [], E: [], C: [] },
    riasec_ipsative_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
    mi: {
      linguistic: 0,
      logical: 0,
      spatial: 0,
      musical: 0,
      bodily: 0,
      interpersonal: 0,
      intrapersonal: 0,
      naturalistic: 0,
    },
    mi_raw: {},
    mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw: { EI: [], SN: [], TF: [], JP: [] },
    values: {
      security_adventure: 0,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 0,
    },
    values_raw: {},
    strengths: [],
    strength_signals: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "SEEKER",
    signal_history: [],
  };
}

/**
 * A student who answered 12 of the 14 interest questions -- enough to clear
 * the evidence gate (MIN_INTEREST_RESPONSES = 10) -- with every RIASEC type
 * getting exactly two answers, [2, 3] on the 1-4 Likert scale. That
 * normalises to exactly 50 for every type (see calculateRiasecType), so
 * deriveClassLabel finds no lead at all and returns "EXPLORER" (Rogue).
 * Paired with current_block "riasec" (the interest block isn't finished --
 * 2 questions remain), useEmergentClass must treat this Rogue as
 * provisional: shown, but isNamed false.
 */
function makeProvisionalRogueScoreState(): ScoreState {
  const tiedAtFifty = [2, 3];
  return {
    ...makeScoreState(),
    riasec: { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 },
    riasec_raw: {
      R: tiedAtFifty,
      I: tiedAtFifty,
      A: tiedAtFifty,
      S: tiedAtFifty,
      E: tiedAtFifty,
      C: tiedAtFifty,
    },
    class_label: "EXPLORER",
  };
}

beforeEach(() => {
  window.localStorage.clear();
  h.pushMock.mockClear();
  h.hasCompletedSession1 = false;

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

async function renderSession(): Promise<void> {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Session params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mid-session checkpoint resume flow", () => {
  it("shows the tone-branched resume prompt when a snapshot exists", async () => {
    saveSessionSnapshot(
      "student-1",
      buildQuestStateAtIndex(10),
      makeScoreState(),
      null
    );

    await renderSession();

    expect(
      await screen.findByText("Welcome back, adventurer!")
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Resume Quest" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Start over" })).toBeDefined();
    // Mentions saved progress
    expect(screen.getByText(/10 answers/)).toBeDefined();
  });

  it("Resume rehydrates the reducer at the saved question", async () => {
    saveSessionSnapshot(
      "student-1",
      buildQuestStateAtIndex(10),
      makeScoreState(),
      null
    );

    await renderSession();
    const resumeButton = await screen.findByRole("button", { name: "Resume Quest" });

    await act(async () => {
      fireEvent.click(resumeButton);
    });

    // Question at index 10 renders, not question 1
    expect(
      await screen.findByText(session1CoreQuestions[10].question_text)
    ).toBeDefined();
    expect(
      screen.queryByText(session1CoreQuestions[0].question_text)
    ).toBeNull();
  });

  it("Start over clears the snapshot and begins at question 1", async () => {
    saveSessionSnapshot(
      "student-1",
      buildQuestStateAtIndex(10),
      makeScoreState(),
      null
    );

    await renderSession();
    const startOverButton = await screen.findByRole("button", { name: "Start over" });

    await act(async () => {
      fireEvent.click(startOverButton);
    });

    expect(
      await screen.findByText(session1CoreQuestions[0].question_text)
    ).toBeDefined();
    expect(window.localStorage.getItem(snapshotKey("student-1"))).toBeNull();
  });

  it("never shows the prompt when Session 1 is already complete", async () => {
    h.hasCompletedSession1 = true;
    saveSessionSnapshot(
      "student-1",
      buildQuestStateAtIndex(10),
      makeScoreState(),
      null
    );

    await renderSession();

    expect(
      await screen.findByText(session1CoreQuestions[0].question_text)
    ).toBeDefined();
    expect(screen.queryByText("Welcome back, adventurer!")).toBeNull();
  });

  it("goes straight to question 1 when no snapshot exists", async () => {
    await renderSession();

    expect(
      await screen.findByText(session1CoreQuestions[0].question_text)
    ).toBeDefined();
    expect(screen.queryByText("Welcome back, adventurer!")).toBeNull();
  });

  it("writes a checkpoint after answering a question", async () => {
    await renderSession();
    await screen.findByText(session1CoreQuestions[0].question_text);

    // Question 0 is multiple choice -- answer the first option
    // (OptionGrid renders options with role="radio")
    const firstOption = session1CoreQuestions[0].options[0];
    await act(async () => {
      fireEvent.click(
        screen.getByRole("radio", { name: firstOption.label as string })
      );
    });

    await waitFor(() => {
      const snapshot = loadSessionSnapshot("student-1");
      expect(snapshot).not.toBeNull();
      expect(snapshot?.questState.responses).toHaveLength(1);
      expect(snapshot?.questState.currentIndex).toBe(1);
    });
  });

  /**
   * Regression test for a review finding: useEmergentClass correctly marks
   * a mid-quest Rogue lead "provisional" (isNamed: false) while interest
   * questions are still to come, but the session page used to dispatch
   * SET_AVATAR_CLASS with emergentClass.primary unconditionally, ignoring
   * isNamed. questState.avatarClass is checkpointed on every change and
   * restored on the next resume via seedFromRestored, which honours any
   * non-wanderer id as already named -- so an unguarded dispatch would let
   * a provisional Rogue quietly become permanent on its next round-trip
   * through localStorage, with no further evidence able to change it. This
   * renders the real Session page (real useQuestState, real useScores, real
   * snapshot persistence) rather than asserting against the hook in
   * isolation, because the defect lives entirely in the page's dispatch
   * effect, not in the hook.
   */
  it("never checkpoints a provisional Rogue as if it were a genuine naming", async () => {
    saveSessionSnapshot(
      "student-1",
      buildQuestStateAtIndex(17), // 5 warm-up + 12 of the 14 riasec answers
      makeProvisionalRogueScoreState(),
      null
    );

    await renderSession();
    const resumeButton = await screen.findByRole("button", { name: "Resume Quest" });

    await act(async () => {
      fireEvent.click(resumeButton);
    });
    // Let any cascading state updates the resume triggers -- the block
    // boundary re-deriving the class, the avatarClass dispatch decision
    // that follows it, and the checkpoint effect reacting to that -- fully
    // settle before reading the persisted snapshot back.
    await act(async () => {});

    await waitFor(() => {
      const snapshot = loadSessionSnapshot("student-1");
      expect(snapshot).not.toBeNull();
      expect(snapshot?.questState.current_block).toBe("riasec");
    });

    const snapshot = loadSessionSnapshot("student-1");
    // The interest block isn't finished (12 of 14 answered), so the Rogue
    // lead must still be provisional -- and a provisional class must never
    // reach the checkpoint. avatarClass stays at its pre-resume value.
    expect(snapshot?.questState.avatarClass).toBe("wanderer");
  });
});
