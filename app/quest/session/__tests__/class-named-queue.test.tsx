/**
 * @vitest-environment jsdom
 *
 * Review finding: SHOW_CLASS_NAMED used to be dispatched unconditionally
 * whenever useEmergentClass's namingEventId counter advanced, regardless of
 * what flowPhase was currently on screen. A first naming lands overwhelmingly
 * at the riasec -> riasec_mi block boundary -- exactly the boundary that also
 * carries a narrated block-transition interstitial (TRANSITION_KEY_MAP maps
 * "riasec_to_riasec_mi" to riasec_intro). Firing straight into "class_named"
 * there skipped the transition entirely: its narration was never seen, its
 * 1500ms visible timer and exit animation never ran, and
 * DISMISS_BLOCK_TRANSITION was never dispatched.
 *
 * This renders the real Session page (real useQuestState, real useScores,
 * real useEmergentClass, real BlockTransition/ClassNamedScreen components) --
 * not the reducer in isolation -- because the defect is specifically about
 * what the student sees on screen and in what order, which the reducer unit
 * tests in hooks/__tests__/use-quest-state.test.ts cannot observe.
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { saveSessionSnapshot } from "@/lib/persistence/session-snapshot";
import type { QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({ pushMock: vi.fn() }));

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
                tone: "quest",
                self_map: {},
                has_completed_session1: false,
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

/**
 * A checkpoint taken at the exact instant the reducer moved into the
 * riasec -> riasec_mi block transition: 19 questions answered, the
 * transition interstitial showing, avatarClass still "wanderer" because
 * naming has not happened yet on the client (it fires from the emergent-
 * class hook's effect after this state is restored, same as a fresh boundary
 * crossing would).
 */
const QUEST_STATE_AT_RIASEC_BOUNDARY: QuestState = {
  flowPhase: "block_transition",
  currentIndex: 19,
  direction: "right",
  transitionNarration: "riasec_to_riasec_mi",
  adaptiveQuestions: [],
  confirmIndex: 0,
  current_block: "riasec_mi",
  questions_answered: 19,
  responses: [],
  selected_adaptive_ids: [],
  persistence_failed: false,
  last_response_undoable: false,
  engagementShown: true,
  avatarClass: "wanderer",
  classNamedPending: false,
};

/**
 * Scores with a clear, unambiguous Guardian (Helper) lead.
 *
 * restoreScores recalculates every derived score from the raw arrays (never
 * trusts a snapshot's derived fields directly), so `riasec` below is a
 * placeholder -- what actually drives the naming is riasec_raw. S = [4, 4]
 * normalises to 100 (calculateRiasecType), everything else to 0 or 33.3, a
 * 66.7-point lead -- comfortably clears deriveClassLabel's ">15" single-type
 * threshold. 12 interest answers total, comfortably past
 * MIN_INTEREST_RESPONSES (10) -- though current_block is already "riasec_mi"
 * here anyway, which bypasses that gate outright.
 */
function makeGuardianScoreState(): ScoreState {
  return {
    riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
    riasec_raw: {
      R: [1, 1],
      I: [2, 2],
      A: [2, 2],
      S: [4, 4],
      E: [2, 2],
      C: [1, 1],
    },
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
    rating_responses: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "HELPER",
    signal_history: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
  h.pushMock.mockClear();

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

describe("a naming event coinciding with a block transition", () => {
  it("lets the transition's narration show and dismiss before the naming screen appears, exactly once", async () => {
    saveSessionSnapshot(
      "student-1",
      QUEST_STATE_AT_RIASEC_BOUNDARY,
      makeGuardianScoreState(),
      null
    );

    await renderSession();
    const resumeButton = await screen.findByRole("button", { name: "Resume Quest" });
    await act(async () => {
      fireEvent.click(resumeButton);
    });
    // Let the restore cascade settle: current_block flips to "riasec_mi",
    // useEmergentClass's block-boundary effect derives Guardian and raises
    // namingEventId, and the page's effect reacts to it by dispatching
    // SHOW_CLASS_NAMED -- all of this before the block transition's own
    // 1500ms timer would ever fire on its own.
    await act(async () => {});

    // The transition is still what's on screen -- the naming event did not
    // preempt it. Pre-naming narration reads from the student's tone-only
    // classDef (still "wanderer" at this instant), matching the exact copy
    // this defect was reported against.
    expect(
      await screen.findByText(/Something is taking shape/)
    ).toBeDefined();
    expect(screen.queryByText(/You are a Guardian/)).toBeNull();

    // Dismiss the transition the way a student would: tap it.
    await act(async () => {
      fireEvent.click(
        // The interstitial is named by its own contents now: an aria-label
        // on a role="button" was replacing the narration it exists to say.
        screen.getByRole("button", { name: /Tap to continue/ })
      );
    });

    // The transition's exit animation/timer (400ms) must complete and
    // dispatch DISMISS_BLOCK_TRANSITION before the naming screen appears.
    await waitFor(
      () => {
        expect(screen.getByText(/You are a Guardian/)).toBeDefined();
      },
      { timeout: 2000 }
    );
    // The tagline written in lib/theme.ts, rendered for the first time.
    expect(
      screen.getByText(/You stand where someone else would have fallen/)
    ).toBeDefined();
    // The transition is gone, not stacked underneath.
    expect(screen.queryByText(/Something is taking shape/)).toBeNull();

    // Continuing from the naming screen returns to ordinary question flow,
    // not back to the transition or another naming screen -- it showed
    // exactly once.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue the quest" }));
    });
    expect(screen.queryByText(/You are a Guardian/)).toBeNull();
    expect(screen.queryByText(/Something is taking shape/)).toBeNull();
  });
});
