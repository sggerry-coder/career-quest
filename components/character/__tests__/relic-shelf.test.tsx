/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import RelicShelf from "@/components/character/relic-shelf";
import { earnedRelics } from "@/lib/character/relics";

afterEach(() => cleanup());

describe("RelicShelf", () => {
  it("says why each relic was earned", () => {
    const relics = earnedRelics(["Empathy", "Empathy", "Empathy"]);
    render(<RelicShelf relics={relics} tone="quest" />);
    expect(screen.getByText("Healer's Kit")).toBeDefined();
    expect(screen.getByText(/3 times/)).toBeDefined();
  });

  it("shows nothing at all when no relic has been earned", () => {
    const { container } = render(<RelicShelf relics={[]} tone="quest" />);
    expect(container.textContent?.trim()).toBe("");
  });
});
