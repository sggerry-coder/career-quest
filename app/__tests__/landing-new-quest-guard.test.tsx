/**
 * @vitest-environment jsdom
 *
 * Locks in the "Start a new quest instead" guard (P2.3): a returning
 * student must explicitly confirm before navigating to character creation,
 * because starting over replaces their adventurer and results.
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

describe("landing page: start a new quest guard", () => {
  it("asks for confirmation instead of navigating immediately", async () => {
    render(<Home />);

    const startNew = await screen.findByRole("button", {
      name: "Start a new quest",
    });
    fireEvent.click(startNew);

    expect(
      screen.getByText(/This replaces your current adventurer/)
    ).toBeDefined();
    expect(screen.getByText(/Chapter 1 results will be lost/)).toBeDefined();
    expect(h.pushMock).not.toHaveBeenCalled();
  });

  it("navigates to character creation only after confirming", async () => {
    render(<Home />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Start a new quest" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, start fresh" }));

    expect(h.pushMock).toHaveBeenCalledWith("/quest/character");
  });

  it("cancelling keeps the adventurer and restores the original button", async () => {
    render(<Home />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Start a new quest" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Keep my adventurer" })
    );

    expect(h.pushMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Start a new quest" })
    ).toBeDefined();
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
