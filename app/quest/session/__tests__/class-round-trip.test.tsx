/**
 * @vitest-environment jsdom
 *
 * The class round trip, end to end: derivation -> snapshot -> Supabase ->
 * dashboard.
 *
 * Both ends of this seam were tested and the seam itself was not. A mutation
 * sweep of the branch found exactly one escape: changing the session page's
 * `serializeCharacterClass(finalClass)` to `finalClass.primary` left all 451
 * tests passing while reintroducing the bug documented in
 * lib/character/classes.ts -- "a student told Guardian-Mage came back to a
 * dashboard that said Guardian forever".
 *
 * So this test drives the real page to the real write, reads the string that
 * actually reaches `students.avatar_class`, and resolves it the way the
 * dashboard resolves it. Two things must hold:
 *   1. the persisted class is derivable from the persisted interest scores;
 *   2. the name the completion screen prints is the name the dashboard
 *      will print from what was saved.
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import {
  characterClassDisplayName,
  deriveCharacterClass,
  parseCharacterClass,
} from "@/lib/character/classes";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const calls: Array<{ table: string; method: string; payload: unknown }> = [];

  function makeTableApi(table: string) {
    return {
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { tone: "quest", has_completed_session1: false },
              error: null,
            }),
        }),
      }),
      upsert: (payload: unknown) => {
        calls.push({ table, method: "upsert", payload });
        return Promise.resolve({ error: null });
      },
      update: (payload: unknown) => ({
        eq: () => {
          calls.push({ table, method: "update", payload });
          return Promise.resolve({ error: null });
        },
      }),
    };
  }

  // A profile with two clear interests: the exact shape that used to be
  // flattened to its primary on the way to the database.
  const riasec = { R: 80, I: 60, A: 40, S: 20, E: 10, C: 5 };

  const questState = {
    flowPhase: "complete",
    currentIndex: 35,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: [],
    confirmIndex: 5,
    current_block: "confirmatory",
    questions_answered: 12,
    responses: Array.from({ length: 12 }, (_, i) => ({
      question_id: `q-${i}`,
      response_value: 3,
      response_label: `answer-${i}`,
      framework: "riasec",
      framework_target: "R",
      answered_at: Date.now(),
    })),
    selected_adaptive_ids: [],
    persistence_failed: false,
    last_response_undoable: false,
    engagementShown: true,
    avatarClass: "warsmith",
    classNamedPending: false,
  };

  const scoreState = {
    riasec,
    riasec_raw: { R: [4, 4], I: [3, 3], A: [3, 3], S: [2, 2], E: [2, 2], C: [1, 1] },
    riasec_ipsative_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
    mi: {
      linguistic: 0, logical: 0, spatial: 0, musical: 0,
      bodily: 0, interpersonal: 0, intrapersonal: 0, naturalistic: 0,
    },
    mi_raw: {},
    mbti: { EI: 40, SN: -40, TF: 40, JP: -40 },
    mbti_raw: { EI: [1, 2], SN: [-2, -1], TF: [2, 1], JP: [-1, -2] },
    values: {
      security_adventure: 0, income_impact: 0, prestige_fulfilment: 0,
      structure_flexibility: 0, solo_team: 0,
    },
    values_raw: {},
    strengths: ["Empathy"],
    strength_signals: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "MAKER-INVESTIGATOR",
    signal_history: [],
  };

  return { pushMock: vi.fn(), calls, makeTableApi, questState, scoreState, riasec };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => h.makeTableApi(table),
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

vi.mock("@/hooks/use-quest-state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-quest-state")>();
  return { ...actual, useQuestState: () => ({ state: h.questState, dispatch: vi.fn() }) };
});

vi.mock("@/hooks/use-scores", () => ({
  useScores: () => ({
    scoreState: h.scoreState,
    processResponse: vi.fn(),
    processResponseWithSignals: vi.fn(),
    processIpsativeResponse: vi.fn(),
    takeSnapshot: vi.fn(),
    removeLastResponse: vi.fn(),
    restoreScores: vi.fn(),
  }),
}));

import Session from "@/app/quest/session/[id]/page";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

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

/** The string that actually reached students.avatar_class. */
async function persistedAvatarClass(): Promise<string> {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Session params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });
  await screen.findByText("Quest Chapter 1 Complete");

  let write: { payload: unknown } | undefined;
  await waitFor(() => {
    // The last students write, not the first: a retried save writes more
    // than once and only the final state is what the dashboard will read.
    write = h.calls.filter((c) => c.table === "students").at(-1);
    expect(write).toBeDefined();
  });
  return (write!.payload as { avatar_class: string }).avatar_class;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("class round trip through Supabase", () => {
  it("persists a class the persisted interest scores derive", async () => {
    const stored = await persistedAvatarClass();

    // What the persisted chart says, computed from the same scores written to
    // assessment_scores.riasec_scores.
    const scoresWrite = h.calls.find((c) => c.table === "assessment_scores");
    const persistedRiasec = (scoresWrite?.payload as { riasec_scores: Record<string, number> })
      .riasec_scores;

    expect(parseCharacterClass(stored)).toEqual(
      deriveCharacterClass(persistedRiasec)
    );
  });

  it("keeps both halves of a dual class through the write", async () => {
    const stored = await persistedAvatarClass();

    expect(stored).toBe("warsmith-mage");
    expect(parseCharacterClass(stored).secondary).toBe("mage");
  });

  it("shows the student on the completion screen the name the dashboard will show", async () => {
    const stored = await persistedAvatarClass();

    // The dashboard's own resolution, applied to what was saved.
    const dashboardName = characterClassDisplayName(
      parseCharacterClass(stored),
      "quest"
    );
    expect(dashboardName).toBe("Warsmith-Mage");
    expect(screen.getByText(dashboardName)).toBeDefined();
  });
});
