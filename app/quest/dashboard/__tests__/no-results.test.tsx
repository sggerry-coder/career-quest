/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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

afterEach(() => cleanup());

describe("dashboard with an unfinished quest", () => {
  it("does not render a profile of zeros for a student who has not finished", async () => {
    render(<Dashboard />);
    // provisionStudent creates a zeroed scores row at character creation, so
    // the row existing does not mean there are results.
    expect(await screen.findByText(/haven't saved yet|No results yet/)).toBeDefined();
    expect(screen.queryByText(/CLASS:/)).toBeNull();
  });
});
