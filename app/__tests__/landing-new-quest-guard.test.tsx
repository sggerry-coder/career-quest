/**
 * @vitest-environment jsdom
 *
 * "Start a new quest instead" (P2.3, revised by Task 7): starting over
 * replaces the device's current student, which deletes their answers and
 * badges. The landing page used to ask an inline "are you sure" here, but
 * that confirmation never actually gated the destructive call -- it only
 * delayed the navigation -- and any other route into character creation
 * (direct link, back/forward, a retried session check) skipped it entirely.
 *
 * The single, authoritative consent gate now lives on
 * /quest/character itself, immediately before provisionStudent runs
 * (see app/quest/character/page.tsx and
 * lib/persistence/__tests__/provision-student.test.ts). So this page
 * navigates straight through -- asking here too would ask the same
 * student twice.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "student-1" } },
        }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "student-1",
                name: "Riley",
                avatar_class: "mage",
                tone: "quest",
                current_session: 1,
                has_completed_session1: true,
              },
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

import Home from "@/app/page";

beforeEach(() => {
  h.pushMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("landing page: start a new quest", () => {
  it("navigates straight to character creation -- consent happens there instead", async () => {
    render(<Home />);

    const startNew = await screen.findByRole("button", {
      name: "Start a new quest instead",
    });
    fireEvent.click(startNew);

    expect(h.pushMock).toHaveBeenCalledWith("/quest/character");
    // No inline "are you sure" dialog on this page anymore.
    expect(
      screen.queryByText(/This replaces your current adventurer/)
    ).toBeNull();
  });

  it("Continue Quest still works without any confirmation", async () => {
    render(<Home />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Continue Quest" })
    );

    expect(h.pushMock).toHaveBeenCalledWith("/quest/dashboard");
  });
});
