/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  student: { avatar_class: "guardian-mage", tone: "quest", name: "Sam", current_session: 0, has_completed_session1: true },
  themeCalls: [] as string[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: h.student, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/theme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/theme")>();
  return { ...actual, applyClassTheme: (id: string) => { h.themeCalls.push(id); } };
});

import Landing from "@/app/page";

beforeEach(() => { h.themeCalls.length = 0; window.localStorage.clear(); });
afterEach(() => cleanup());

describe("landing page class", () => {
  it("shows a dual class by name, not 'Adventurer'", async () => {
    render(<Landing />);
    expect(await screen.findByText(/Guardian-Mage/)).toBeDefined();
    expect(screen.queryByText(/Adventurer/)).toBeNull();
  });

  it("themes from the resolved primary, never the raw stored value", async () => {
    render(<Landing />);
    await waitFor(() => expect(h.themeCalls.length).toBeGreaterThan(0));
    // "guardian-mage" is not a class id; passing it resolves to slate and
    // poisons the cached theme.
    expect(h.themeCalls).not.toContain("guardian-mage");
    expect(h.themeCalls).toContain("guardian");
  });

  it("greets a mid-quest student by the class in their checkpoint, not Wanderer", async () => {
    h.student = { ...h.student, avatar_class: "wanderer", has_completed_session1: false };
    window.localStorage.setItem(
      "cq-session1-snapshot-student-1",
      JSON.stringify({
        version: 2,
        savedAt: 1,
        questState: {
          flowPhase: "questions", currentIndex: 12, confirmIndex: 0, responses: [],
          adaptiveQuestions: [], engagementShown: true, questions_answered: 12,
          avatarClass: "guardian",
        },
        scoreState: { riasec: {}, riasec_raw: {}, signal_history: [] },
        selfMap: null,
      })
    );

    render(<Landing />);
    expect(await screen.findByText(/Guardian/)).toBeDefined();
    expect(screen.queryByText(/Wanderer/)).toBeNull();
  });
});
