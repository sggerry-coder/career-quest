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
      />
    );

    expect(screen.getByText("Leans Security")).toBeDefined();
    expect(screen.getByText("Leans Impact")).toBeDefined();
    expect(screen.getByText("Balanced for now")).toBeDefined();
  });

  it("does not invent readings for the dimensions not measured yet, and names no chapter for what's still to come", () => {
    // Chapter 2 is not built, so this line does not name it -- and, since
    // Task 8 fix round 1, the component no longer takes a tone prop at all:
    // there was nothing left for it to vary once the Chapter/Part word was
    // removed (see Task 8 report).
    render(<ValuesSliders scores={{}} />);

    // Prestige/Fulfilment and Structure/Flexibility have no Session 1
    // questions, so they stay greyed with no reading of their own.
    expect(screen.getAllByText("Balanced for now")).toHaveLength(3);
    expect(screen.getByText("More dimensions to come")).toBeDefined();
  });
});
