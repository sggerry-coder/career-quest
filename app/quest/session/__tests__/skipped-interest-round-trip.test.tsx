/**
 * @vitest-environment jsdom
 *
 * A student who answered one interest pair and skipped the rest, driven
 * through the real page to the real write.
 *
 * buildRiasecEvidence exists so a type nobody asked about is not ranked as
 * the strongest possible dislike, and lib/scoring covers it thoroughly -- but
 * the helper was threaded through deriveCharacterClass, resolveFinalClass and
 * useEmergentClass as an *optional* argument, and the session page passed it
 * to none of them. Every scoring test passed while the live path kept naming
 * students from questions they were never asked. So the check has to be made
 * where the argument is actually supplied or not: at the page.
 *
 * The fixture is the trap itself. Two Helper answers and nothing else gives
 * S 100 and five types on 0, which reads to every rule in deriveClassLabel as
 * a Helper leading the field by the whole length of the scale. Both call
 * sites in the page have to pass the evidence for this to come out honest:
 * omit it at useEmergentClass and the student is named Guardian and locked
 * there; omit it at resolveFinalClass and the final derivation names them
 * Guardian on the way to the database.
 */
import React, { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { saveSessionSnapshot } from "@/lib/persistence/session-snapshot";
import { deriveCharacterClass } from "@/lib/character/classes";
import { buildRiasecEvidence } from "@/lib/scoring/riasec";
import type { QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

// ---------------------------------------------------------------------------
// Mocks -- real hooks throughout; only the network and the celebration are
// faked, as in class-flip-round-trip.
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
// calculateRiasecType = ((sum − count·1) / (count·3)) · 100
//
//   S [4,4] → 100.0, every other type unanswered → merged to 0
//     without evidence: S > 50 and leads the second by 100 > 15 → "HELPER"
//     with evidence {S:2, rest 0}: one type left in the ranking, nothing to
//       compare it against → "SEEKER" → Wanderer, "still forming"

const ONE_PAIR_ANSWERED = { R: [], I: [], A: [], S: [4, 4], E: [], C: [] };
const NO_RANKINGS = { R: [], I: [], A: [], S: [], E: [], C: [] };

function makeQuestState(): QuestState {
  return {
    flowPhase: "complete",
    currentIndex: 35,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: [],
    confirmIndex: 5,
    current_block: "confirmatory",
    questions_answered: 14,
    // The two Helper rating items, plus the blocks that cannot be skipped --
    // enough responses to clear validateScoresBeforePersist's floor, which is
    // what makes this a student who skipped the interest questions rather
    // than one who abandoned the quest.
    responses: [
      {
        question_id: "s1-riasec-S-01",
        response_value: 4,
        response_label: "Strongly Like",
        framework: "riasec",
        framework_target: "S",
        answered_at: 0,
      },
      {
        question_id: "s1-riasec-S-02",
        response_value: 4,
        response_label: "Strongly Like",
        framework: "riasec",
        framework_target: "S",
        answered_at: 0,
      },
      ...Array.from({ length: 12 }, (_, i) => ({
        question_id: `s1-mbti-values-${i}`,
        response_value: 0,
        response_label: "answer",
        framework: "mbti",
        framework_target: "EI",
        answered_at: 0,
      })),
    ],
    selected_adaptive_ids: [],
    persistence_failed: false,
    last_response_undoable: false,
    engagementShown: true,
    // Never named: the interest block finished with too little to name them.
    avatarClass: "wanderer",
    classNamedPending: false,
  };
}

function makeScoreState(): ScoreState {
  return {
    // Recomputed from riasec_raw by restoreScores, so these need only be
    // present and well-shaped.
    riasec: { R: 0, I: 0, A: 0, S: 100, E: 0, C: 0 },
    riasec_raw: ONE_PAIR_ANSWERED,
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
    strengths: [],
    strength_signals: [],
    rating_responses: [4, 4],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "SEEKER",
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

/** Resume the mostly-skipped quest and land on the completion screen. */
async function finishMostlySkippedQuest(): Promise<void> {
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

  await screen.findByText("Quest Chapter 1 Complete");
}

/** The last string written to students.avatar_class. */
async function persistedAvatarClass(): Promise<string> {
  let write: { payload: unknown } | undefined;
  await waitFor(() => {
    write = h.calls.filter((c) => c.table === "students").at(-1);
    expect(write).toBeDefined();
  });
  return (write!.payload as { avatar_class: string }).avatar_class;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("a student who answered one interest pair and skipped the rest", () => {
  it("really is a chart that names a class when the evidence is ignored", () => {
    // The fixture has teeth only if the naive derivation does name them. If
    // this ever stops holding, the two tests below stop proving anything.
    const riasec = { R: 0, I: 0, A: 0, S: 100, E: 0, C: 0 };
    const evidence = buildRiasecEvidence(ONE_PAIR_ANSWERED, NO_RANKINGS);

    expect(deriveCharacterClass(riasec).primary).toBe("guardian");
    expect(deriveCharacterClass(riasec, evidence).isNamed).toBe(false);
  });

  it("is not named from it on the way to the database", async () => {
    await finishMostlySkippedQuest();

    expect(await persistedAvatarClass()).toBe("wanderer");
  });

  it("is not named from it on the screen they are reading either", async () => {
    await finishMostlySkippedQuest();

    // The completion screen prints the class it is about to save. A Guardian
    // here is the same lie as a Guardian in the column.
    expect(screen.queryByText("Guardian")).toBeNull();
    expect(screen.getByText("Wanderer")).toBeDefined();
    // An unnamed student has not earned a colour, so nothing repaints.
    expect(document.documentElement.getAttribute("data-theme")).not.toBe(
      "guardian-jade"
    );
  });
});
