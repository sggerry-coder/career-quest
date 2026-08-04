/**
 * @vitest-environment jsdom
 *
 * Locks in the "how you see yourself vs what we found" card (P2.1):
 * perceived chips, detected chips, match highlighting, clarity line.
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SelfVsMeasured, {
  perceivedMatchesDetected,
  clarityLine,
} from "@/components/charts/self-vs-measured";

afterEach(() => {
  cleanup();
});

describe("perceivedMatchesDetected", () => {
  it("matches a perceived strength to its detected category", () => {
    expect(perceivedMatchesDetected("puzzles", ["Analytical"])).toBe(true);
    expect(perceivedMatchesDetected("helping", ["Empathy", "Command"])).toBe(true);
    expect(perceivedMatchesDetected("creating", ["Creativity"])).toBe(true);
  });

  it("is case-insensitive on detected names", () => {
    expect(perceivedMatchesDetected("leading", ["command"])).toBe(true);
  });

  it("returns false when unrelated or unknown", () => {
    expect(perceivedMatchesDetected("building", ["Empathy"])).toBe(false);
    expect(perceivedMatchesDetected("unknown-key", ["Empathy"])).toBe(false);
    expect(perceivedMatchesDetected("building", [])).toBe(false);
  });
});

describe("clarityLine", () => {
  it("encourages low-clarity starters", () => {
    expect(clarityLine(1)).toContain("1/5");
    expect(clarityLine(2)).toContain("look how much is mapped now");
  });

  it("handles mid and high clarity", () => {
    expect(clarityLine(3)).toContain("3/5");
    expect(clarityLine(5)).toContain("5/5");
  });

  it("returns null for missing or out-of-range values", () => {
    expect(clarityLine(undefined)).toBeNull();
    expect(clarityLine(0)).toBeNull();
    expect(clarityLine(9)).toBeNull();
  });
});

describe("SelfVsMeasured", () => {
  it("renders perceived and detected strengths side by side", () => {
    render(
      <SelfVsMeasured
        selfMap={{
          clarity: 2,
          perceived_strengths: ["puzzles", "building"],
        }}
        detectedStrengths={["Analytical", "Empathy"]}
        tone="quest"
      />
    );

    expect(
      screen.getByText("How you see yourself vs. what we found")
    ).toBeDefined();
    expect(screen.getByText("Solving Puzzles")).toBeDefined();
    expect(screen.getByText("Building / Fixing")).toBeDefined();
    expect(screen.getByText("Analytical")).toBeDefined();
    expect(screen.getByText("Empathy")).toBeDefined();
  });

  it("highlights matches with 'You called it!' only on matching chips", () => {
    render(
      <SelfVsMeasured
        selfMap={{ clarity: 3, perceived_strengths: ["puzzles", "building"] }}
        detectedStrengths={["Analytical"]}
        tone="quest"
      />
    );

    // puzzles -> Analytical matches; building -> Achiever does not
    const badges = screen.getAllByText("You called it!");
    expect(badges).toHaveLength(1);
  });

  it("shows the clarity reflection line", () => {
    render(
      <SelfVsMeasured
        selfMap={{ clarity: 2, perceived_strengths: ["creating"] }}
        detectedStrengths={["Creativity"]}
        tone="quest"
      />
    );
    expect(screen.getByText(/2\/5 clarity/)).toBeDefined();
  });

  it("renders nothing when there is no data at all", () => {
    const { container } = render(
      <SelfVsMeasured selfMap={null} detectedStrengths={[]} tone="quest" />
    );
    expect(container.firstChild).toBeNull();
  });
});
