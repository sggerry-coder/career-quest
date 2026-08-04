/**
 * @vitest-environment jsdom
 *
 * A student who answered five interest types and skipped the sixth, driven
 * through the real page to the real charts.
 *
 * An interest type nobody was asked about merges to 0, which is the same
 * number a type rated "strongly dislike" twice produces -- so the Ability
 * Scores chart drew both as a labelled row, an empty bar and a hard 0.
 * Absence rendered as a result. It matters more on this chart than on the
 * values compass or the learning styles, because the CLASS badge two beats
 * later is derived from exactly these six rows: the student can be handed a
 * name read off evidence the chart beside it is misrepresenting.
 *
 * The existing caveat under the bars only fired when *all six* types were 0,
 * so the partial case -- the precise case skipping creates -- was silent.
 *
 * The fixture is built so the score cannot stand in for the evidence: two of
 * the six types come out at exactly 0 and they must read differently. E was
 * asked and disliked; C was never asked at all.
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
import { buildRiasecEvidence, deriveClassLabel } from "@/lib/scoring/riasec";
import type { QuestState, FlowPhase } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

// ---------------------------------------------------------------------------
// Mocks -- real hooks, real persistence, real charts. Only the network, the
// router and the badge celebration are faked, as in values-round-trip.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const calls: Array<{ table: string; method: string; payload: unknown }> = [];

  const state = {
    studentRow: {
      name: "Rae",
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
// The fixture, in arithmetic
// ---------------------------------------------------------------------------
//
// calculateRiasecType = ((sum − count·1) / (count·3)) · 100
//
//   R [4,4] → 100     Maker
//   I [3,3] →  66.67  Investigator
//   A [2,3] →  50     Creator
//   S [2,2] →  33.33  Helper
//   E [1,1] →   0     Leader       ← asked, and genuinely disliked
//   C []    →   0     Organizer    ← never asked
//
// Both rankings skipped, so no ipsative side anywhere and the rating score is
// the whole score. E and C are the same number and the opposite statement.
//
// The class still resolves: with C dropped from the ranking the top two clear
// 50 and lead the third by 66.67 − 50 = 16.67 > 10 → MAKER-INVESTIGATOR. So
// the student *is* named, from five of the six rows, which is what makes the
// silent sixth row worth a sentence.

const RIASEC_RAW = {
  R: [4, 4],
  I: [3, 3],
  A: [2, 3],
  S: [2, 2],
  E: [1, 1],
  C: [],
};
const NO_RANKINGS = { R: [], I: [], A: [], S: [], E: [], C: [] };

/** What the bars should say, in the order the chart prints its types. */
const EXPECTED_READINGS = ["100", "67", "50", "33", "0", "Not asked"];

/** What the dashboard still says, having no counts to read. */
const LEGACY_READINGS = ["100", "67", "50", "33", "0", "0"];

const PARTIAL_CAVEAT = {
  quest:
    "Some interests never came up, so they're left blank instead of scored — your class comes from the ones you answered.",
  explorer:
    "Some interest areas weren't answered, so they're left blank rather than scored as low. Your result uses only the ones you answered.",
};

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
    // Past validateScoresBeforePersist's floor: a student who finished having
    // skipped one type, not one who abandoned the quest.
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
    avatarClass: "warsmith-mage",
    classNamedPending: false,
  };
}

function makeScoreState(): ScoreState {
  return {
    // Recomputed from the raw arrays by restoreScores, so these need only be
    // present and well-shaped.
    riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: RIASEC_RAW,
    riasec_ipsative_raw: NO_RANKINGS,
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
    strengths: ["Creative Thinking"],
    strength_signals: [],
    rating_responses: [4, 4, 3, 3, 2, 3, 2, 2, 1, 1],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "MAKER-INVESTIGATOR",
    signal_history: [],
  };
}

beforeEach(() => {
  h.calls.length = 0;
  h.pushMock.mockClear();
  h.state.studentRow.tone = "quest";
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

/** Drive the real page to the reveal's first beat, the Ability Scores bars. */
async function revealTheBars(): Promise<void> {
  saveSessionSnapshot("student-1", makeQuestState("reveal"), makeScoreState(), null);

  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Session params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });

  // ResumePrompt words its own button per tone: "Resume Quest ⚔️" or "Resume".
  const resume = await screen.findByRole("button", { name: /^Resume/ });

  // The transition card auto-advances after 2s onto the riasec beat, which is
  // the first chart the student sees.
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(resume);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  vi.useRealTimers();
}

/**
 * What each of the six type rows reads, in the order the chart prints them.
 * Scoped to the Ability Scores card so no other chart's numbers can stand in.
 */
function interestReadings(): string[] {
  const card = screen.getByText("Ability Scores").parentElement!;
  return ["Maker", "Investigator", "Creator", "Helper", "Leader", "Organizer"]
    .map((label) => within(card).getByText(label).parentElement!)
    .map(
      (rowEl) =>
        within(rowEl)
          .getAllByText(/^(\d+|Not asked)$/)
          .map((el) => el.textContent ?? "")[0]
    );
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

describe("a student who skipped one whole interest type", () => {
  it("really is a chart that scores the skipped type 0 when evidence is ignored", () => {
    // The fixture has teeth only if the naive chart would print two zeros
    // with opposite meanings, and only if the student is still named from
    // what is left. If either stops holding, the tests below prove nothing.
    const evidence = buildRiasecEvidence(RIASEC_RAW, NO_RANKINGS);

    expect(evidence).toEqual({ R: 2, I: 2, A: 2, S: 2, E: 2, C: 0 });
    expect(deriveClassLabel(
      { R: 100, I: 66.67, A: 50, S: 33.33, E: 0, C: 0 },
      evidence
    )).toBe("MAKER-INVESTIGATOR");
  });

  it("is not shown a zero for the type nobody asked them about", async () => {
    await revealTheBars();

    // Leader and Organizer are the same number in the scores. Only one of
    // them is a reading.
    expect(interestReadings()).toEqual(EXPECTED_READINGS);
  });

  it("is told why that row is blank, in the quest tone", async () => {
    await revealTheBars();

    expect(screen.getByText(PARTIAL_CAVEAT.quest)).toBeDefined();
    // The old caveat only fired when all six types read 0, so this student
    // saw nothing at all.
    expect(screen.queryByText("Answer more questions to refine")).toBeNull();
  });

  it("is told the same thing in the explorer tone", async () => {
    h.state.studentRow.tone = "explorer";
    await revealTheBars();

    expect(screen.getByText(PARTIAL_CAVEAT.explorer)).toBeDefined();
    expect(screen.queryByText(PARTIAL_CAVEAT.quest)).toBeNull();
  });

  it("still gets the class the five answered types earn them", async () => {
    await revealTheBars();

    // The point is not to withhold the name -- five types is plenty to earn
    // one -- it is to stop the sixth row pretending to have contributed. The
    // class beat is the click after the bars.
    expect(interestReadings()).toContain("Not asked");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/CLASS:\s*Warsmith-Mage/)).toBeDefined();
  });
});

/**
 * The dashboard reads back persisted scores and has no counts to read: the
 * column for them is migration 00006, which is written but neither applied
 * nor wired. Until it is, this screen must behave exactly as it does today --
 * a half-wired chart would be a regression, not a partial fix.
 */
describe("the dashboard, until migration 00006 is applied and wired", () => {
  it("renders the same profile it renders today, zeros and all", async () => {
    saveSessionSnapshot("student-1", makeQuestState("complete"), makeScoreState(), null);

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
    const written = await persistedScoresRow();
    cleanup();

    // Nothing new is written. Writing an unknown column fails the whole
    // upsert, for every student, so the write must not run ahead of the SQL.
    expect(written).not.toHaveProperty("riasec_raw_counts");

    h.state.scoresRow = written;
    h.state.studentRow.has_completed_session1 = true;

    render(<Dashboard />);
    await screen.findByText("Rae");

    // Organizer still reads 0 here. That is the known, deliberate gap, not an
    // accident: the fix for it needs the column first.
    expect(interestReadings()).toEqual(LEGACY_READINGS);
    expect(screen.queryByText("Not asked")).toBeNull();
  }, 20000);
});
