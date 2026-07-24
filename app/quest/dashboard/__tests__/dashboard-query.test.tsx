/**
 * @vitest-environment jsdom
 *
 * Locks in the dashboard data wiring:
 * - students are queried by primary key id, never a user_id column (A2)
 * - persisted mbti_raw_counts feed deriveEmergingType so the
 *   minimum-response emerging rule works for returning students (A3)
 * - a populated dashboard renders instead of the empty state
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const h = vi.hoisted(() => {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];

  const studentRow = {
    name: "Aria",
    age: 15,
    avatar_class: "mage",
    tone: "quest",
    current_session: 1,
    has_completed_session1: true,
    self_map: null,
  };

  const scoresRow: Record<string, unknown> = {
    riasec_scores: { R: 80, I: 60, A: 40, S: 20, E: 10, C: 5 },
    mi_scores: {
      linguistic: 10,
      logical: 20,
      spatial: 30,
      musical: 0,
      bodily: 0,
      interpersonal: 0,
      intrapersonal: 0,
      naturalistic: 0,
    },
    // Strong scores everywhere; EI has too few responses (2 < 3)
    mbti_indicators: { EI: 80, SN: 80, TF: 80, JP: 80 },
    mbti_raw_counts: { EI: 2, SN: 3, TF: 3, JP: 3 },
    values_compass: {
      security_adventure: 10,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 0,
    },
    strengths: ["Creative Thinking"],
  };

  function makeTableApi(table: string) {
    const rows: Record<string, unknown> = {
      students: studentRow,
      assessment_scores: scoresRow,
    };
    const listResult = { data: [{ badge_id: "self_discoverer" }], error: null };
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        eqCalls.push({ table, column, value });
        return builder;
      },
      single: () => Promise.resolve({ data: rows[table] ?? null, error: null }),
      // achievements query is awaited without .single()
      then: (
        resolve: (v: unknown) => unknown,
        reject: (e: unknown) => unknown
      ) => Promise.resolve(listResult).then(resolve, reject),
    };
    return builder;
  }

  return { eqCalls, scoresRow, makeTableApi };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => h.makeTableApi(table),
  }),
}));

import Dashboard from "@/app/quest/dashboard/page";

beforeEach(() => {
  h.eqCalls.length = 0;
});

afterEach(() => {
  cleanup();
});

describe("dashboard data wiring", () => {
  it("queries students by id (not user_id) and renders a populated dashboard", async () => {
    render(<Dashboard />);

    // Populated dashboard, not the "No results yet" empty state
    expect(await screen.findByText("Aria")).toBeDefined();
    expect(screen.queryByText("No results yet")).toBeNull();
    // Appears in Detected Strengths and in the self-vs-measured card (P2.1)
    expect(screen.getAllByText("Creative Thinking").length).toBeGreaterThanOrEqual(1);

    const studentEqs = h.eqCalls.filter((c) => c.table === "students");
    expect(studentEqs).toEqual([
      { table: "students", column: "id", value: "user-1" },
    ]);

    // scores + achievements are keyed by student_id
    expect(
      h.eqCalls.filter((c) => c.table === "assessment_scores")
    ).toEqual([{ table: "assessment_scores", column: "student_id", value: "user-1" }]);
  });

  it("passes persisted mbti_raw_counts to deriveEmergingType (SCORE-01)", async () => {
    render(<Dashboard />);
    await screen.findByText("Aria");

    // EI has 2 < 3 responses -> underscore letter despite score 80,
    // so the Still Emerging pill must show
    expect(screen.getByText("Still Emerging")).toBeDefined();
    expect(screen.getAllByText("_").length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to score-only detection when mbti_raw_counts is null (legacy rows)", async () => {
    h.scoresRow.mbti_raw_counts = null;
    try {
      render(<Dashboard />);
      await screen.findByText("Aria");

      // Without counts, strong scores yield a full type: no underscores,
      // no Still Emerging pill
      expect(screen.queryByText("Still Emerging")).toBeNull();
      expect(screen.queryByText("_")).toBeNull();
    } finally {
      h.scoresRow.mbti_raw_counts = { EI: 2, SN: 3, TF: 3, JP: 3 };
    }
  });
});
