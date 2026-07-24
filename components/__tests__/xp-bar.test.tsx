/**
 * @vitest-environment jsdom
 *
 * Locks in the milestone-scaled XP bar (P2.2).
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import XpBar from "@/components/ui/xp-bar";

afterEach(() => {
  cleanup();
});

describe("XpBar", () => {
  it("shows the milestone label and completion state", () => {
    render(<XpBar currentXp={450} maxXp={450} milestoneLabel="Chapter 1" />);

    expect(screen.getByText("Chapter 1")).toBeDefined();
    expect(screen.getByText(/450 \/ 450/)).toBeDefined();
    expect(screen.getByText(/Complete!/)).toBeDefined();

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("450");
    expect(bar.getAttribute("aria-valuemax")).toBe("450");
    expect(bar.getAttribute("aria-label")).toContain("complete");
  });

  it("shows partial progress without the complete flag", () => {
    render(<XpBar currentXp={100} maxXp={450} milestoneLabel="Chapter 1" />);

    expect(screen.getByText(/100 \/ 450/)).toBeDefined();
    expect(screen.queryByText(/Complete!/)).toBeNull();
  });

  it("only renders markers for tiers within the milestone", () => {
    const { container } = render(
      <XpBar currentXp={100} maxXp={450} milestoneLabel="Chapter 1" />
    );
    const markers = container.querySelectorAll("[title]");
    // background (150), accent (300), gold trim (450) all fit within 450
    expect(markers).toHaveLength(3);
    expect(markers[0].getAttribute("title")).toContain("unlocks at 150 XP");
  });

  it("marks unlocked tiers as unlocked", () => {
    const { container } = render(
      <XpBar currentXp={450} maxXp={450} milestoneLabel="Chapter 1" />
    );
    const markers = Array.from(container.querySelectorAll("[title]"));
    for (const marker of markers) {
      expect(marker.getAttribute("title")).toContain("unlocked!");
    }
  });
});
