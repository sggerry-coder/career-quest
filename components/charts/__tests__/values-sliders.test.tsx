/**
 * @vitest-environment jsdom
 *
 * The Values Compass showed a dot on a track and nothing else, so a student
 * could not say whether they leaned Security or Adventure. These lock in the
 * written reading that now sits under each track.
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import ValuesSliders, { describeLean } from "@/components/charts/values-sliders";

afterEach(() => {
  cleanup();
});

describe("describeLean", () => {
  it("names the left side for negative scores", () => {
    expect(describeLean(-100, "Security", "Adventure")).toBe("Leans Security");
  });

  it("names the right side for positive scores", () => {
    expect(describeLean(66, "Security", "Adventure")).toBe("Leans Adventure");
  });

  it("calls dead centre balanced rather than picking a side", () => {
    expect(describeLean(0, "Security", "Adventure")).toBe("Balanced for now");
  });

  it("treats anything under the threshold as balanced, either direction", () => {
    expect(describeLean(-19, "Security", "Adventure")).toBe("Balanced for now");
    expect(describeLean(19, "Security", "Adventure")).toBe("Balanced for now");
  });

  it("commits to a side right at the threshold", () => {
    expect(describeLean(-20, "Security", "Adventure")).toBe("Leans Security");
    expect(describeLean(20, "Security", "Adventure")).toBe("Leans Adventure");
  });
});

describe("ValuesSliders", () => {
  it("states a reading for every measured dimension", () => {
    render(
      <ValuesSliders
        scores={{ security_adventure: -66, income_impact: 100, solo_team: 0 }}
        tone="quest"
      />
    );

    expect(screen.getByText("Leans Security")).toBeDefined();
    expect(screen.getByText("Leans Impact")).toBeDefined();
    expect(screen.getByText("Balanced for now")).toBeDefined();
  });

  it("does not invent readings for the dimensions not measured yet", () => {
    render(<ValuesSliders scores={{}} tone="quest" />);

    // Prestige/Fulfilment and Structure/Flexibility have no Session 1
    // questions, so they stay greyed with no reading of their own.
    expect(screen.getAllByText("Balanced for now")).toHaveLength(3);
    expect(screen.getByText("More dimensions in Chapter 2")).toBeDefined();
  });

  it("switches to Part wording in explorer tone", () => {
    render(<ValuesSliders scores={{}} tone="explorer" />);

    expect(screen.getByText("More dimensions in Part 2")).toBeDefined();
  });
});
