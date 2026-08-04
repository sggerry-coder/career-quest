/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { saveSessionSnapshot } from "@/lib/persistence/session-snapshot";
import type { QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

const h = vi.hoisted(() => ({
  student: { name: "Sam", age: 15, avatar_class: "wanderer", tone: "quest", current_session: 0, has_completed_session1: false, self_map: null },
  scores: {
    riasec_scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    mi_scores: {}, mbti_indicators: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw_counts: null, values_compass: {}, strengths: [],
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: table === "students" ? h.student : h.scores, error: null,
          }),
        }),
      }),
    }),
  }),
}));

import Dashboard from "@/app/quest/dashboard/page";

// ---------------------------------------------------------------------------
// A minimal valid checkpoint -- shape-checked by isValidSnapshot, so it must
// satisfy every field that gate inspects.
// ---------------------------------------------------------------------------

function makeQuestState(): QuestState {
  return {
    flowPhase: "questions",
    currentIndex: 5,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: [],
    confirmIndex: 0,
    current_block: "riasec",
    questions_answered: 5,
    responses: [
      {
        question_id: "q-0",
        response_value: 3,
        response_label: "answer-0",
        framework: "riasec",
        framework_target: "R",
        answered_at: Date.now(),
      },
    ],
    selected_adaptive_ids: [],
    persistence_failed: false,
    last_response_undoable: true,
    engagementShown: false,
    avatarClass: "wanderer",
    classNamedPending: false,
  };
}

function makeScoreState(): ScoreState {
  return {
    riasec: { R: 30, I: 0, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: { R: [3], I: [], A: [], S: [], E: [], C: [] },
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
    strengths: [],
    strength_signals: [],
    rating_responses: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "SEEKER",
    signal_history: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
  h.student = { name: "Sam", age: 15, avatar_class: "wanderer", tone: "quest", current_session: 0, has_completed_session1: false, self_map: null };
});

afterEach(() => cleanup());

describe("dashboard with an unfinished quest", () => {
  it("does not render a profile of zeros for a student who has not finished", async () => {
    render(<Dashboard />);
    // provisionStudent creates a zeroed scores row at character creation, so
    // the row existing does not mean there are results.
    expect(await screen.findByText(/haven't saved yet|No results yet/)).toBeDefined();
    expect(screen.queryByText(/CLASS:/)).toBeNull();
  });

  it("offers the rescue path when this device holds a checkpoint", async () => {
    saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);

    render(<Dashboard />);

    expect(
      await screen.findByText(/Your results haven.t saved yet/)
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Finish saving my results" })
    ).toBeDefined();
    expect(screen.queryByText("No results yet")).toBeNull();
  });

  it("shows the plain empty state when no checkpoint exists on this device", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("No results yet")).toBeDefined();
    expect(
      screen.queryByRole("link", { name: "Finish saving my results" })
    ).toBeNull();
    expect(screen.queryByText(/haven.t saved yet/)).toBeNull();
  });
});

describe("dashboard with a completed quest", () => {
  it("renders the real profile, unaffected by a lingering checkpoint", async () => {
    h.student = { ...h.student, has_completed_session1: true };
    // A stale checkpoint left on this device (e.g. from a retry) must not
    // hijack a student who has genuine results.
    saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);

    render(<Dashboard />);

    expect(await screen.findByText("Sam")).toBeDefined();
    expect(screen.queryByText("No results yet")).toBeNull();
    expect(screen.queryByText(/haven.t saved yet/)).toBeNull();
  });
});
