/**
 * @vitest-environment jsdom
 *
 * A student who used "I'm not sure" on every question that offered it,
 * finished the chapter, and reached the save -- driven through the real page.
 *
 * Two things had to be true at once and were not. The save has to succeed:
 * validateScoresBeforePersist carried a floor of 10 responses written back
 * when nothing but a corrupt state could produce a thin one, and a skip
 * records no response, so the floor turned an offered choice into "We
 * couldn't save your results" and threw away everything the student *had*
 * answered. And the result has to be honest: the scoring layer already
 * refuses to invent what was skipped, but every one of those refusals lives
 * inside a chart, and the completion screen has no chart -- one archetype,
 * one strength, one confident sentence, identical whether it came from forty
 * answers or six.
 *
 * The fixture is the trap. Warm-up questions cannot be skipped and carry
 * interest signals, so a student who skipped all 14 rating items and both
 * rankings still arrives with two types scoring, one clearly ahead -- enough
 * for deriveClassLabel to name them outright. Nothing on the screen is wrong.
 * It just does not say what it is standing on.
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { saveSessionSnapshot } from "@/lib/persistence/session-snapshot";
import { deriveCharacterClass } from "@/lib/character/classes";
import { buildRiasecEvidence } from "@/lib/scoring/riasec";
import { session1AdaptivePool } from "@/data/questions/session-1-adaptive";
import type { QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";
import type { ClientResponse } from "@/lib/types/quest";

// ---------------------------------------------------------------------------
// Mocks -- real hooks, real persistence, real screens. Only the network, the
// router and the badge celebration are faked, as in skipped-interest-round-trip.
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
// The fixture, in arithmetic
// ---------------------------------------------------------------------------
//
// Chapter 1 asks 40 questions: warm-up 5, riasec 14, riasec_mi 5,
// mbti_values 11, confirmatory 5. Only riasec and riasec_mi offer a skip, so
// this student answered 21 and skipped all 19 they could.
//
// calculateRiasecType = ((sum − count·1) / (count·3)) · 100
//
//   R [4] → 100.0   (a warm-up pick, which cannot be skipped)
//   I [3] →  66.7   (the same)
//   rest unanswered → dropped from the ranking by buildRiasecEvidence
//
//   two types left, R leads I by 33.3 > 15 → "MAKER" → Warsmith, named.

const WARMUP_ONLY_INTERESTS = { R: [4], I: [3], A: [], S: [], E: [], C: [] };
const NO_RANKINGS = { R: [], I: [], A: [], S: [], E: [], C: [] };

const ANSWERED = 21;
const ASKED = 40;

/** The blocks that have no "I'm not sure": 5 warm-up, 11 mbti_values, 5 confirmatory. */
function unskippableResponses(count: number): ClientResponse[] {
  return Array.from({ length: count }, (_, i) => ({
    question_id: `s1-unskippable-${i}`,
    response_value: 2,
    response_label: "answer",
    framework: "mbti" as const,
    framework_target: "EI",
    answered_at: 0,
  }));
}

function makeQuestState(responseCount: number): QuestState {
  return {
    flowPhase: "complete",
    currentIndex: 35,
    direction: "right",
    transitionNarration: "",
    // The five the confirmatory round actually asked, so askedCount is the
    // chapter's real 40 rather than the 35 a bare core list would give.
    adaptiveQuestions: session1AdaptivePool.slice(0, 5),
    confirmIndex: 5,
    current_block: "confirmatory",
    questions_answered: responseCount,
    responses: unskippableResponses(responseCount),
    selected_adaptive_ids: [],
    persistence_failed: false,
    last_response_undoable: false,
    engagementShown: true,
    avatarClass: "warsmith",
    classNamedPending: false,
  };
}

function makeScoreState(): ScoreState {
  return {
    // Recomputed from the raw arrays by restoreScores, so these need only be
    // present and well-shaped.
    riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: WARMUP_ONLY_INTERESTS,
    riasec_ipsative_raw: NO_RANKINGS,
    mi: {
      linguistic: 0, logical: 0, spatial: 0, musical: 0,
      bodily: 0, interpersonal: 0, intrapersonal: 0, naturalistic: 0,
    },
    mi_raw: {},
    mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw: { EI: [2, -2], SN: [1, -1], TF: [], JP: [] },
    values: {
      security_adventure: 0, income_impact: 0, prestige_fulfilment: 0,
      structure_flexibility: 0, solo_team: 0,
    },
    values_raw: {
      security_adventure: [2], income_impact: [-1], prestige_fulfilment: [],
      structure_flexibility: [], solo_team: [0],
    },
    strengths: ["Curiosity"],
    strength_signals: ["Curiosity"],
    rating_responses: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "MAKER",
    signal_history: [],
  };
}

beforeEach(() => {
  h.calls.length = 0;
  h.pushMock.mockClear();
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

afterEach(() => cleanup());

/** Resume the mostly-skipped quest and let the final save run. */
async function finishSkippedQuest(responseCount: number): Promise<void> {
  saveSessionSnapshot("student-1", makeQuestState(responseCount), makeScoreState(), null);

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
}

/** The row written to students, once the save has actually happened. */
async function persistedStudentRow(): Promise<Record<string, unknown>> {
  let write: { payload: unknown } | undefined;
  await waitFor(() => {
    write = h.calls.filter((c) => c.table === "students").at(-1);
    expect(write).toBeDefined();
  });
  return write!.payload as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("a student who skipped every question that offered it", () => {
  it("really does end up with a chart that names them outright", () => {
    // The fixture has teeth only if the profile looks confident. If this ever
    // stops holding, the honesty test below stops proving anything.
    const evidence = buildRiasecEvidence(WARMUP_ONLY_INTERESTS, NO_RANKINGS);
    const derived = deriveCharacterClass(
      { R: 100, I: 66.7, A: 0, S: 0, E: 0, C: 0 },
      evidence
    );
    expect(derived.isNamed).toBe(true);
    expect(derived.primary).toBe("warsmith");
  });

  it("reaches the end and the results are saved", async () => {
    await finishSkippedQuest(ANSWERED);

    expect(await persistedStudentRow()).toMatchObject({
      has_completed_session1: true,
      avatar_class: "warsmith",
    });
    // Not the failure screen: the save is what used to be refused.
    expect(screen.queryByText("We couldn't save your results")).toBeNull();
  });

  it("is told what the profile is standing on rather than that it was forged", async () => {
    await finishSkippedQuest(ANSWERED);

    await screen.findByText("Quest Chapter 1 Complete");
    expect(
      screen.getByText(new RegExp(`Built from ${ANSWERED} of ${ASKED} answers`))
    ).toBeDefined();
    expect(screen.queryByText("Your profile has been forged!")).toBeNull();
    // Still their result, still theirs to keep -- the name and the way on are
    // both still there. Honest, not withheld.
    expect(screen.getByText("Warsmith")).toBeDefined();
    expect(screen.getByRole("button", { name: "View Dashboard" })).toBeDefined();
  });

  it("saves even a six-answer profile rather than losing the six", async () => {
    // Below anything the current flow can reach -- the unskippable blocks
    // guarantee 21 -- so this pins the floor to its rule rather than to
    // today's question mix, and to the case the old floor of 10 would have
    // refused outright.
    await finishSkippedQuest(6);

    expect(await persistedStudentRow()).toMatchObject({
      has_completed_session1: true,
    });
    expect(screen.queryByText("We couldn't save your results")).toBeNull();
    expect(screen.getByText(/Built from 6 of 40 answers/)).toBeDefined();
  });
});
