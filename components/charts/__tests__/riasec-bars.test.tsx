/**
 * @vitest-environment jsdom
 *
 * The Ability Scores chart drew a type nobody was asked about exactly like a
 * type the student rated at the bottom: a labelled row, an empty bar, and a
 * hard 0. Both merge to 0 in the scores, so the number cannot separate them --
 * only the evidence count can.
 *
 * This is the chart the CLASS badge is derived from, which is why the row is
 * kept and the digit dropped rather than the row removed: a student has to be
 * able to see *which* types were left out of the name they are given.
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import RiasecBars from "@/components/charts/riasec-bars";

afterEach(() => {
  cleanup();
});

/** Every type row, keyed by its visible label. */
function row(label: string): HTMLElement {
  return screen.getByText(label).parentElement!;
}

describe("RiasecBars with no evidence supplied", () => {
  it("scores every type, exactly as it always has", () => {
    // Legacy behaviour: the dashboard passes no evidence because the counts
    // are not persisted yet, and a finished profile must not be blanked.
    render(
      <RiasecBars scores={{ R: 80, I: 40, A: 0, S: 0, E: 0, C: 0 }} />
    );

    expect(screen.getByText("80")).toBeDefined();
    expect(screen.getByText("40")).toBeDefined();
    // The four zeros are still zeros: absent evidence means "assume asked".
    expect(screen.getAllByText("0")).toHaveLength(4);
    expect(screen.queryByText("Not asked")).toBeNull();
  });

  it("shows a 0 for a type missing from the scores record entirely", () => {
    render(<RiasecBars scores={{ R: 80 }} />);

    expect(screen.getAllByText("0")).toHaveLength(5);
    expect(screen.queryByText("Not asked")).toBeNull();
  });
});

describe("RiasecBars with evidence", () => {
  // The trap in one fixture: A and C score 0 for opposite reasons. A was
  // rated "strongly dislike" twice; C was never asked.
  const SCORES = { R: 80, I: 40, A: 0, S: 55, E: 20, C: 0 };
  const EVIDENCE = { R: 3, I: 3, A: 2, S: 3, E: 2, C: 0 };

  it("says a type was not asked instead of scoring it 0", () => {
    render(<RiasecBars scores={SCORES} evidence={EVIDENCE} />);

    expect(within(row("Organizer")).getByText("Not asked")).toBeDefined();
  });

  it("keeps scoring a type that was asked and genuinely came out 0", () => {
    render(<RiasecBars scores={SCORES} evidence={EVIDENCE} />);

    // "Strongly dislike, twice" is a reading, and an honest one. Same number
    // as Organizer, opposite meaning.
    expect(within(row("Creator")).getByText("0")).toBeDefined();
    // Exactly one 0 on the chart now, where there used to be two.
    expect(screen.getAllByText("0")).toHaveLength(1);
    expect(screen.getAllByText("Not asked")).toHaveLength(1);
  });

  it("prints no number at all on an unasked row", () => {
    render(<RiasecBars scores={SCORES} evidence={EVIDENCE} />);

    // Any digit in this row would read as a score. The bar carries the words
    // instead, and the numeral column is held open but empty so the tracks
    // stay aligned.
    expect(within(row("Organizer")).queryByText(/\d/)).toBeNull();
  });

  it("keeps all six types on the chart", () => {
    // Dropping the row was the other option. It would leave a student unable
    // to tell "there is no Organizer" from "nobody asked about Organizer" --
    // and unable to see that the class under the chart came from five rows.
    render(
      <RiasecBars
        scores={{ R: 100, I: 0, A: 0, S: 0, E: 0, C: 0 }}
        evidence={{ R: 2, I: 0, A: 0, S: 0, E: 0, C: 0 }}
      />
    );

    for (const label of [
      "Maker",
      "Investigator",
      "Creator",
      "Helper",
      "Leader",
      "Organizer",
    ]) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getAllByText("Not asked")).toHaveLength(5);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("draws no bar fill on an unasked type", () => {
    // A 0-width fill is invisible anyway, but the accent-coloured element
    // must not exist: the bar *is* the score.
    const { container } = render(
      <RiasecBars
        scores={{ R: 80, I: 0, A: 0, S: 0, E: 0, C: 0 }}
        evidence={{ R: 3, I: 0, A: 0, S: 0, E: 0, C: 0 }}
      />
    );

    expect(
      container.querySelectorAll("[class*='bg-[var(--color-accent)]']")
    ).toHaveLength(1);
  });

  it("is inert for a student who answered the whole instrument", () => {
    const full = { R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 };
    const { container } = render(
      <RiasecBars scores={SCORES} evidence={full} />
    );
    const withEvidence = container.innerHTML;
    cleanup();

    const { container: plain } = render(<RiasecBars scores={SCORES} />);
    expect(plain.innerHTML).toBe(withEvidence);
  });

  it("still renders the class badge where the screen asks for one", () => {
    render(
      <RiasecBars scores={SCORES} evidence={EVIDENCE} classLabel="EXPLORER" />
    );

    expect(screen.getByText(/CLASS:/)).toBeDefined();
  });
});
