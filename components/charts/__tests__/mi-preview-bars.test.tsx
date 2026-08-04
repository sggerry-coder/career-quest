/** @vitest-environment jsdom */
/**
 * "Your strongest learning styles (preliminary)" is not a place a zero can
 * appear. MIN_MI_SIGNALS makes a sub-threshold dimension read 0, Session 1's
 * ~10 MI picks are spread over 8 dimensions, and two of those dimensions
 * appear in only two options in the whole session -- so one or two clearing
 * the bar and the rest sitting at 0 is the routine outcome, not an edge case.
 * The component sliced the top three unconditionally and only checked for
 * *every* dimension being 0, so a labelled row with an empty bar and the
 * number 0 beside it was shown as a strength, on the reveal and again on the
 * dashboard.
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import MiPreviewBars from "@/components/charts/mi-preview-bars";

afterEach(() => cleanup());

const noScores = {
  linguistic: 0, logical: 0, spatial: 0, musical: 0,
  bodily: 0, interpersonal: 0, intrapersonal: 0, naturalistic: 0,
};

/** The rows that carry a score number -- the "strongest" list. */
function scoredRows(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".flex.items-center.gap-3")
  ).filter((row) => within(row).queryByText(/^\d+$/) !== null);
}

describe("MiPreviewBars", () => {
  it("never lists a dimension with no reading as a strength", () => {
    // The review's verified arithmetic: intrapersonal 67, logical 56, and
    // nothing else above the evidence threshold.
    const { container } = render(
      <MiPreviewBars
        scores={{ ...noScores, intrapersonal: 66.67, logical: 56.25 }}
      />
    );

    const rows = scoredRows(container);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row).queryByText("0")).toBeNull();
    }
    expect(screen.getByText("67")).toBeDefined();
    expect(screen.getByText("56")).toBeDefined();
  });

  it("still shows three when three have a reading", () => {
    const { container } = render(
      <MiPreviewBars
        scores={{ ...noScores, intrapersonal: 67, logical: 56, spatial: 50 }}
      />
    );
    expect(scoredRows(container)).toHaveLength(3);
  });

  it("shows one when only one has a reading", () => {
    const { container } = render(
      <MiPreviewBars scores={{ ...noScores, musical: 100 }} />
    );
    const rows = scoredRows(container);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("Musical")).toBeDefined();
  });

  it("says there is no reading yet rather than ranking nothing", () => {
    const { container } = render(<MiPreviewBars scores={noScores} />);
    expect(scoredRows(container)).toHaveLength(0);
    expect(screen.getByText("Answer more questions to refine")).toBeDefined();
  });

  it("leaves every unscored dimension in the greyed-out list", () => {
    render(
      <MiPreviewBars
        scores={{ ...noScores, intrapersonal: 67, logical: 56 }}
      />
    );
    // All 8 labels still present: 2 ranked, 6 waiting.
    for (const label of [
      "Linguistic", "Logical-Mathematical", "Spatial", "Musical",
      "Bodily-Kinesthetic", "Interpersonal", "Intrapersonal", "Naturalistic",
    ]) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });
});
