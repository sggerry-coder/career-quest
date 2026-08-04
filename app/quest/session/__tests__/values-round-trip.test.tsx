/**
 * @vitest-environment jsdom
 *
 * One student, two screens, and the row that has to carry the reading between
 * them.
 *
 * A values score of 0 is the exact centre of the spectrum, so "answered dead
 * centre" and "never answered" arrive at the database as the same number. The
 * reveal holds the raw answers and can tell them apart; the dashboard reads
 * back persisted scores and cannot, so it printed "Balanced for now" over a
 * dimension nobody had asked about. Fixing only the reveal makes the two
 * screens disagree about the same student, which is the failure this checks --
 * so it drives the real session page, takes the row that was actually written,
 * and hands that row to the real dashboard.
 *
 * The fixture is built so a score cannot stand in for the counts: two of the
 * three Chapter 1 dimensions score exactly 0, and they must read differently.
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { saveSessionSnapshot } from "@/lib/persistence/session-snapshot";
import type { QuestState, FlowPhase } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

// ---------------------------------------------------------------------------
// Mocks -- real hooks, real persistence, real charts. Only the network, the
// router and the badge celebration are faked, as in skipped-interest-round-trip.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const calls: Array<{ table: string; method: string; payload: unknown }> = [];

  // Mutable because this file plays out a student's timeline: mid-quest while
  // the session page runs, finished by the time the dashboard loads, reading
  // the assessment_scores row the session page itself wrote.
  const state = {
    studentRow: {
      name: "Aria",
      age: 15,
      avatar_class: "wanderer",
      tone: "quest",
      current_session: 1,
      has_completed_session1: false,
      self_map: {},
    } as Record<string, unknown>,
    scoresRow: null as Record<string, unknown> | null,
  };

  function makeTableApi(table: string) {
    const rows: Record<string, unknown> = {
      students: state.studentRow,
      assessment_scores: state.scoresRow,
    };
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: () => Promise.resolve({ data: rows[table] ?? null, error: null }),
      // The dashboard awaits the achievements query without .single()
      then: (
        resolve: (v: unknown) => unknown,
        reject: (e: unknown) => unknown
      ) =>
        Promise.resolve({
          data: [{ badge_id: "self_discoverer" }],
          error: null,
        }).then(resolve, reject),
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
    return builder;
  }

  return { pushMock: vi.fn(), calls, state, makeTableApi };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }),
    },
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

import Session from "@/app/quest/session/[id]/page";
import Dashboard from "@/app/quest/dashboard/page";

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------
//
// calculateValuesDimension = (sum / (count · 3)) · 100
//
//   security_adventure []   -> never asked          -> 0
//   income_impact      [0]  -> answered dead centre -> 0
//   solo_team          [-2] -> -66.7               -> Leans Solo
//
// The first two are the same number and the opposite statement.

const VALUES_RAW = {
  security_adventure: [],
  income_impact: [0],
  prestige_fulfilment: [],
  structure_flexibility: [],
  solo_team: [-2],
};

/** What the compass should say, in the order the card prints its dimensions. */
const EXPECTED_READINGS = ["Not answered yet", "Balanced for now", "Leans Solo"];

function makeQuestState(flowPhase: FlowPhase): QuestState {
  return {
    flowPhase,
    currentIndex: 35,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: [],
    confirmIndex: 5,
    current_block: "confirmatory",
    questions_answered: 14,
    // Past validateScoresBeforePersist's floor: a student who finished, not
    // one who abandoned the quest.
    responses: Array.from({ length: 14 }, (_, i) => ({
      question_id: `s1-q-${i}`,
      response_value: 3,
      response_label: `answer-${i}`,
      framework: "riasec",
      framework_target: "R",
      answered_at: 0,
    })),
    selected_adaptive_ids: [],
    persistence_failed: false,
    last_response_undoable: false,
    engagementShown: true,
    avatarClass: "mage",
    classNamedPending: false,
  };
}

function makeScoreState(): ScoreState {
  return {
    // Recomputed from the raw arrays by restoreScores, so these need only be
    // present and well-shaped.
    riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: {
      R: [4, 4, 4],
      I: [3, 3, 3],
      A: [3, 3],
      S: [2, 2],
      E: [2, 2],
      C: [1, 1],
    },
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
    values_raw: VALUES_RAW,
    strengths: ["Creative Thinking"],
    strength_signals: [],
    rating_responses: [4, 3, 3],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "MAKER",
    signal_history: [],
  };
}

beforeEach(() => {
  h.calls.length = 0;
  h.pushMock.mockClear();
  h.state.studentRow.has_completed_session1 = false;
  h.state.scoresRow = null;
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
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
  vi.useRealTimers();
  cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render the real page over a saved quest at the given phase and return its
 * Resume button, unclicked -- the reveal needs fake timers installed before
 * the resume, or its 2s auto-advance is scheduled on the real clock.
 */
async function renderSessionAt(flowPhase: FlowPhase): Promise<HTMLElement> {
  saveSessionSnapshot("student-1", makeQuestState(flowPhase), makeScoreState(), null);

  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Session params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });

  return screen.findByRole("button", { name: "Resume Quest" });
}

/** Resume the saved quest at the given phase, through the real page. */
async function resumeSessionAt(flowPhase: FlowPhase): Promise<void> {
  const resume = await renderSessionAt(flowPhase);
  await act(async () => {
    fireEvent.click(resume);
  });
}

/**
 * Every written reading on the Values Compass card, in the order it prints
 * them. Scoped to the card so no other chart's wording can stand in for it.
 */
function valuesReadings(): string[] {
  const card = screen.getByText("Values Compass").parentElement!;
  return within(card)
    .getAllByText(/^(Leans .+|Balanced for now|Not answered yet)$/)
    .map((el) => el.textContent ?? "");
}

/** The assessment_scores row the session page actually wrote. */
async function persistedScoresRow(): Promise<Record<string, unknown>> {
  let write: { payload: unknown } | undefined;
  await waitFor(() => {
    write = h.calls.find((c) => c.table === "assessment_scores");
    expect(write).toBeDefined();
  });
  return write!.payload as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("a student who answered some values questions and skipped others", () => {
  it("carries a count per dimension into the row that is written", async () => {
    await resumeSessionAt("complete");

    expect(await persistedScoresRow()).toMatchObject({
      values_raw_counts: {
        security_adventure: 0,
        income_impact: 1,
        prestige_fulfilment: 0,
        structure_flexibility: 0,
        solo_team: 1,
      },
      // The two dimensions the counts exist to separate, indistinguishable
      // here: this is the column the dashboard used to read on its own.
      values_compass: expect.objectContaining({
        security_adventure: 0,
        income_impact: 0,
      }),
    });
  });

  it("is told the same thing by the reveal and by the dashboard", async () => {
    // --- The reveal, driven to the values beat through the real page -------
    const resume = await renderSessionAt("reveal");

    // The transition card auto-advances after 2s; the remaining beats are
    // Continue clicks -- class_label, mi_preview, mbti, emerging_type, values.
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(resume);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    }

    const revealReadings = valuesReadings();
    expect(revealReadings).toEqual(EXPECTED_READINGS);
    cleanup();

    // --- The same quest, finished and saved -------------------------------
    await resumeSessionAt("complete");
    const written = await persistedScoresRow();
    cleanup();

    // --- The dashboard, reading back exactly what was written -------------
    h.state.scoresRow = written;
    h.state.studentRow.has_completed_session1 = true;

    render(<Dashboard />);
    await screen.findByText("Aria");

    expect(valuesReadings()).toEqual(revealReadings);
  }, 20000);
});
