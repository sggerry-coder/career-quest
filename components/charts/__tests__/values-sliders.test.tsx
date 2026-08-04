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

/**
 * "Balanced for now" is a claim, and 0 is the score that cannot support it on
 * its own: on a spectrum 0 is the exact centre, so the dimension nobody
 * answered and the dimension answered dead centre arrive as the same number.
 * The counts are the only thing that separates them.
 */
describe("ValuesSliders with answer counts", () => {
  const ALL_ZERO = {
    security_adventure: 0,
    income_impact: 0,
    solo_team: 0,
  };

  it("says nothing about a dimension nobody answered", () => {
    render(
      <ValuesSliders
        scores={ALL_ZERO}
        rawCounts={{ security_adventure: 0, income_impact: 0, solo_team: 1 }}
      />
    );

    // Same three scores as the test above; only the counts differ.
    expect(screen.getAllByText("Not answered yet")).toHaveLength(2);
    expect(screen.getAllByText("Balanced for now")).toHaveLength(1);
  });

  it("keeps calling a genuinely centred answer balanced", () => {
    render(
      <ValuesSliders
        scores={ALL_ZERO}
        rawCounts={{ security_adventure: 1, income_impact: 1, solo_team: 1 }}
      />
    );

    expect(screen.getAllByText("Balanced for now")).toHaveLength(3);
    expect(screen.queryByText("Not answered yet")).toBeNull();
  });

  it("assumes answered when no counts are supplied at all", () => {
    // The dashboard's position until migration 00005 is applied and wired: it
    // reads persisted scores and has no counts to pass. Blanking every
    // dimension of a finished profile would be a worse lie than the one this
    // guards against.
    render(<ValuesSliders scores={ALL_ZERO} />);

    expect(screen.getAllByText("Balanced for now")).toHaveLength(3);
    expect(screen.queryByText("Not answered yet")).toBeNull();
  });

  it("leaves the track empty rather than resting a dot on dead centre", () => {
    const { container } = render(
      <ValuesSliders
        scores={ALL_ZERO}
        rawCounts={{ security_adventure: 0, income_impact: 0, solo_team: 1 }}
      />
    );

    // The dot is the accent-coloured marker; only the answered dimension has
    // one. A dot parked on the centre line is itself a claim of balance.
    expect(
      container.querySelectorAll("[class*='bg-[var(--color-accent)]']")
    ).toHaveLength(1);
  });
});
