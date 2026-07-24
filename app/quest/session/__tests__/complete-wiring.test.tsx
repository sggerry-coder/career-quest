/**
 * @vitest-environment jsdom
 *
 * Locks in the Session 1 completion wiring (A1):
 * - flowPhase "complete" renders the real CompletionScreen (not a static stub)
 * - final persistence fires exactly once on entry to "complete"
 * - a persistence failure surfaces the PersistenceBanner with a working Retry
 * - View Dashboard navigates to /quest/dashboard
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const calls: Array<{ table: string; method: string; payload: unknown }> = [];
  const failures: Record<string, { message: string }> = {};

  function result(table: string): { error: { message: string } | null } {
    return failures[table] ? { error: failures[table] } : { error: null };
  }

  function makeTableApi(table: string) {
    return {
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { avatar_class: "mage", tone: "quest" },
              error: null,
            }),
        }),
      }),
      upsert: (payload: unknown) => {
        calls.push({ table, method: "upsert", payload });
        return Promise.resolve(result(table));
      },
      update: (payload: unknown) => ({
        eq: () => {
          calls.push({ table, method: "update", payload });
          return Promise.resolve(result(table));
        },
      }),
    };
  }

  const responses = Array.from({ length: 12 }, (_, i) => ({
    question_id: `q-${i}`,
    response_value: 3,
    response_label: `answer-${i}`,
    framework: "riasec",
    framework_target: "R",
    answered_at: Date.now(),
  }));

  const questState = {
    flowPhase: "complete",
    currentIndex: 35,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: [],
    confirmIndex: 5,
    consecutiveNeutrals: 0,
    current_block: "confirmatory",
    questions_answered: 12,
    responses,
    selected_adaptive_ids: [],
    persistence_failed: false,
    discovery_mode_active: false,
    last_response_undoable: false,
    engagementShown: true,
    avatarClass: "mage",
  };

  const scoreState = {
    riasec: { R: 80, I: 60, A: 40, S: 20, E: 10, C: 5 },
    riasec_raw: { R: [4], I: [3], A: [3], S: [2], E: [2], C: [1] },
    riasec_ipsative_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
    mi: {
      linguistic: 10,
      logical: 20,
      spatial: 30,
      musical: 0,
      bodily: 0,
      interpersonal: 0,
      intrapersonal: 0,
      naturalistic: 0,
    },
    mi_raw: {},
    mbti: { EI: 40, SN: -40, TF: 40, JP: -40 },
    mbti_raw: { EI: [1, 2, 3], SN: [-2, -1, -1], TF: [2], JP: [-1, -2] },
    values: {
      security_adventure: 10,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 0,
    },
    values_raw: {},
    strengths: ["Creative Thinking"],
    strength_signals: [],
    acquiescence_flag: false,
    // Snapshot taken at confirmatory start (P1.3): R moved +6, I moved +5
    riasec_snapshot: { R: 74, I: 55, A: 40, S: 20, E: 10, C: 5 },
    class_label: "MAKER",
    signal_history: [],
  };

  return { pushMock: vi.fn(), calls, failures, makeTableApi, questState, scoreState };
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
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: "student-1" } } }),
    },
    from: (table: string) => h.makeTableApi(table),
  }),
}));

// Disable retry backoff in the wiring test: a single attempt per write keeps
// the failure-path assertions deterministic. Retry behaviour itself is locked
// by lib/persistence/__tests__/final-persist.test.ts.
vi.mock("@/lib/persistence/final-persist", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/persistence/final-persist")>();
  return {
    ...actual,
    runFinalPersist: (
      input: Parameters<typeof actual.runFinalPersist>[0],
      options?: Parameters<typeof actual.runFinalPersist>[1]
    ) => actual.runFinalPersist(input, { ...options, retryDelays: [] }),
  };
});

// Badge overlay completes immediately so CompletionScreen mounts without timers
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
  return {
    ...actual,
    useQuestState: () => ({ state: h.questState, dispatch: vi.fn() }),
  };
});

vi.mock("@/hooks/use-scores", () => ({
  useScores: () => ({
    scoreState: h.scoreState,
    processResponse: vi.fn(),
    processResponseWithSignals: vi.fn(),
    processIpsativeResponse: vi.fn(),
    takeSnapshot: vi.fn(),
    removeLastResponse: vi.fn(),
  }),
}));

import Session from "@/app/quest/session/[id]/page";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  h.calls.length = 0;
  for (const key of Object.keys(h.failures)) delete h.failures[key];
  h.pushMock.mockClear();

  // Checkpoints (P1.1) written by earlier tests must not leak into the next
  // render, or the resume prompt would block the completion screen.
  window.localStorage.clear();

  // jsdom does not implement matchMedia (used by CompletionScreen confetti)
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

async function renderCompletePage(): Promise<void> {
  // Session uses React 19 `use(params)` which suspends on first render,
  // so the initial render must run inside an awaited act scope.
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

describe("session complete wiring", () => {
  it("renders the real CompletionScreen with archetype and top strength", async () => {
    await renderCompletePage();

    expect(await screen.findByText("Quest Chapter 1 Complete")).toBeDefined();
    expect(screen.getByText("MAKER")).toBeDefined();
    expect(screen.getByText("Your Archetype")).toBeDefined();
    expect(screen.getByText("Creative Thinking")).toBeDefined();
    expect(screen.getByRole("button", { name: "View Dashboard" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Save and Exit" })).toBeDefined();
  });

  it("shows the confirmatory before/after delta card (P1.3)", async () => {
    await renderCompletePage();
    await screen.findByText("Quest Chapter 1 Complete");

    // quest tone heading
    expect(screen.getByText("Your legend sharpened")).toBeDefined();
    // R: 74 -> 80 (+6), I: 55 -> 60 (+5)
    expect(screen.getByText("Maker")).toBeDefined();
    expect(screen.getByText("+6")).toBeDefined();
    expect(screen.getByText("Investigator")).toBeDefined();
    expect(screen.getByText("+5")).toBeDefined();
  });

  it("fires final persistence exactly once on entering complete", async () => {
    await renderCompletePage();
    await screen.findByText("Quest Chapter 1 Complete");

    await waitFor(() => {
      expect(
        h.calls.filter((c) => c.table === "assessment_scores")
      ).toHaveLength(1);
    });

    const responsesCalls = h.calls.filter((c) => c.table === "session_responses");
    expect(responsesCalls).toHaveLength(1);
    expect(responsesCalls[0].payload).toHaveLength(12);

    // SCORE-01: raw MBTI counts are persisted alongside computed scores
    const scoresCall = h.calls.find((c) => c.table === "assessment_scores");
    expect(scoresCall?.payload).toMatchObject({
      mbti_raw_counts: { EI: 3, SN: 3, TF: 1, JP: 2 },
    });

    const studentUpdates = h.calls.filter((c) => c.table === "students");
    expect(studentUpdates).toHaveLength(1);
    expect(studentUpdates[0].payload).toMatchObject({
      current_session: 1,
      has_completed_session1: true,
    });

    expect(h.calls.filter((c) => c.table === "achievements")).toHaveLength(1);
  });

  it("navigates to the dashboard from View Dashboard", async () => {
    await renderCompletePage();
    const button = await screen.findByRole("button", { name: "View Dashboard" });

    fireEvent.click(button);

    expect(h.pushMock).toHaveBeenCalledWith("/quest/dashboard");
  });

  it("shows PersistenceBanner on failure and Retry re-runs persistence", async () => {
    h.failures.assessment_scores = { message: "network fetch failed" };
    await renderCompletePage();

    // Banner appears after the failed persist
    expect(
      await screen.findByText(/Couldn.t save your progress/)
    ).toBeDefined();
    expect(h.calls.filter((c) => c.table === "assessment_scores")).toHaveLength(1);

    // Clear the failure and retry
    delete h.failures.assessment_scores;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(
        h.calls.filter((c) => c.table === "assessment_scores")
      ).toHaveLength(2);
    });

    // Second attempt marks completion
    await waitFor(() => {
      expect(h.calls.filter((c) => c.table === "students")).toHaveLength(1);
    });
  });
});
