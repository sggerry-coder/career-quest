/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

import CharacterPage from "@/app/quest/character/page";

afterEach(() => cleanup());

describe("character creation", () => {
  it("no longer asks the student to pick a class", async () => {
    render(<CharacterPage />);
    // The old picker offered class names as selectable controls.
    for (const name of ["Warsmith", "Mage", "Bard", "Guardian", "Vanguard", "Paladin", "Rogue"]) {
      expect(
        screen.queryByRole("button", { name: new RegExp(name, "i") }),
        `${name} must not be selectable up front`
      ).toBeNull();
    }
  });

  it("still asks for the things it actually needs", async () => {
    render(<CharacterPage />);
    // Name lives on the wizard's next step (unchanged by this task); advance
    // past the tone/figure step to reach it.
    fireEvent.click(screen.getByRole("button", { name: /continue to next step/i }));
    await waitFor(() => expect(screen.getByLabelText(/name/i)).toBeDefined());
  });

  it("offers a character figure instead of asking for gender", async () => {
    render(<CharacterPage />);
    expect(screen.getAllByRole("radio", { name: /figure/i }).length).toBeGreaterThan(1);
    // Gender is deliberately not asked.
    expect(screen.queryByLabelText(/gender/i)).toBeNull();
  });
});
