/**
 * @vitest-environment jsdom
 *
 * The landing page's "Start Your Quest" button was faded in with
 * `animate={{ opacity: showCTA ? 1 : 0 }}`. Opacity does not remove anything:
 * for the first two intro cards the button was fully invisible and still in the
 * tab order, still hit-testable, still offered by a screen reader. A keyboard
 * student Tabbed onto a control they could not see; a mis-tap in the bottom
 * third of the screen started the quest.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

const h = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

// No signed-in student: the landing page shows the intro carousel, which is
// the state the hidden button lived in.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
    }),
  }),
}));

import Home from "@/app/page";

/** The three intro cards advance on a 2500ms interval. */
const CARD_DURATION_MS = 2500;

beforeEach(() => {
  h.pushMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the landing page's start button", () => {
  async function renderIntro(): Promise<void> {
    render(<Home />);
    // Let the session check resolve into the intro carousel.
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("is not reachable while it is invisible", async () => {
    await renderIntro();

    expect(screen.getByText(/Every adventurer has a story/)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /Start Your Quest/ })
    ).toBeNull();
  });

  it("is still unreachable on the second card", async () => {
    await renderIntro();

    await act(async () => {
      vi.advanceTimersByTime(CARD_DURATION_MS);
    });

    expect(
      screen.queryByRole("button", { name: /Start Your Quest/ })
    ).toBeNull();
  });

  it("appears, and only then, once the intro reaches its last card", async () => {
    await renderIntro();

    await act(async () => {
      vi.advanceTimersByTime(CARD_DURATION_MS * 2);
    });

    const cta = screen.getByRole("button", { name: "Start Your Quest" });
    expect(cta).toBeDefined();
    // The visible label is what it answers to; the sword is decoration.
    expect(cta.getAttribute("aria-label")).toBeNull();
  });

  it("appears immediately when the student skips the intro", async () => {
    await renderIntro();

    const skip = screen.getByRole("button", { name: "Skip intro" });
    await act(async () => {
      skip.click();
    });

    expect(screen.getByRole("button", { name: "Start Your Quest" })).toBeDefined();
  });
});
