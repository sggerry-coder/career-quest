/**
 * @vitest-environment jsdom
 *
 * Two things this locks down, per chart.
 *
 * One: every row the chart is capable of drawing has a definition a student
 * can open. The dashboard-level sweep checks that no term reaches the screen
 * undefined, but it cannot see a row rendered as a plain span with no trigger
 * on it at all -- a seventh interest type or a ninth learning style would slip
 * past it silently. So each chart's own list is walked here, and every entry
 * has to come back as a button.
 *
 * Two: the reveal is untouched. These four charts are shared with the reveal
 * sequence, which is a timed animation a student is being walked through --
 * a popup mid-beat would fight it. `explain` is off by default and these
 * assert that the default really renders nothing extra, rather than trusting
 * the prop.
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import RiasecBars, { RIASEC_TYPES } from "@/components/charts/riasec-bars";
import MiPreviewBars, { MI_DIMENSIONS } from "@/components/charts/mi-preview-bars";
import MbtiSliders, { MBTI_DICHOTOMIES } from "@/components/charts/mbti-sliders";
import ValuesSliders, {
  VALUES_DIMENSIONS,
  REMAINING_DIMENSIONS,
} from "@/components/charts/values-sliders";

afterEach(() => cleanup());

/** Scores that put every row of every chart on the screen. */
const RIASEC = { R: 80, I: 60, A: 40, S: 20, E: 10, C: 0 };
const RIASEC_EVIDENCE = { R: 3, I: 3, A: 2, S: 2, E: 2, C: 0 };
const MI = {
  linguistic: 70,
  logical: 60,
  spatial: 50,
  musical: 0,
  bodily: 0,
  interpersonal: 0,
  intrapersonal: 0,
  naturalistic: 0,
};
const MBTI = { EI: 80, SN: 40, TF: 10, JP: -60 };
const VALUES = { security_adventure: 66, income_impact: 0, solo_team: 0 };

describe("the interest chart", () => {
  it("offers a definition for all six types, asked or not", () => {
    render(
      <RiasecBars scores={RIASEC} evidence={RIASEC_EVIDENCE} explain />
    );
    for (const type of RIASEC_TYPES) {
      expect(
        screen.getByRole("button", { name: type.label }),
        `"${type.label}" has no definition to open`
      ).toBeDefined();
    }
    // Organizer is the unasked one and is a trigger like the rest.
    expect(screen.getByText("Not asked")).toBeDefined();
  });

  it("explains the class badge it prints underneath", () => {
    render(<RiasecBars scores={RIASEC} classLabel="EXPLORER" explain />);
    expect(screen.getByRole("button", { name: /CLASS:\s*EXPLORER/ })).toBeDefined();
  });

  it("adds nothing to the reveal", () => {
    const { container } = render(
      <RiasecBars scores={RIASEC} evidence={RIASEC_EVIDENCE} classLabel="EXPLORER" />
    );
    expect(container.querySelectorAll("[data-cq-term]")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("the learning styles chart", () => {
  it("offers a definition for all eight, ranked or waiting", () => {
    render(<MiPreviewBars scores={MI} explain />);
    for (const dim of MI_DIMENSIONS) {
      expect(
        screen.getByRole("button", { name: dim.label }),
        `"${dim.label}" has no definition to open`
      ).toBeDefined();
    }
  });

  it("still says there is no reading yet when there is none", () => {
    // The empty state draws no rows at all, so there is nothing to attach a
    // definition to -- and the heading's own "?" is still there.
    render(
      <MiPreviewBars
        scores={Object.fromEntries(MI_DIMENSIONS.map((d) => [d.key, 0]))}
        explain
      />
    );
    expect(screen.getByText("Answer more questions to refine")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "What Learning Styles means" })
    ).toBeDefined();
  });

  it("adds nothing to the reveal", () => {
    const { container } = render(<MiPreviewBars scores={MI} />);
    expect(container.querySelectorAll("[data-cq-term]")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("the personality chart", () => {
  it("opens the same definition from either end of a line", () => {
    render(<MbtiSliders scores={MBTI} explain />);
    for (const d of MBTI_DICHOTOMIES) {
      const left = screen.getByRole("button", {
        name: `${d.leftLabel} (${d.leftLetter})`,
      });
      const right = screen.getByRole("button", {
        name: `${d.rightLabel} (${d.rightLetter})`,
      });
      // One definition, both ends. Defining the two ends separately is how
      // one of them ends up sounding like the right answer.
      expect(left.getAttribute("data-cq-term")).toBe(d.term);
      expect(right.getAttribute("data-cq-term")).toBe(d.term);
    }
  });

  it("adds nothing to the reveal", () => {
    const { container } = render(<MbtiSliders scores={MBTI} />);
    expect(container.querySelectorAll("[data-cq-term]")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("the values compass", () => {
  it("opens the same definition from either end of a line", () => {
    render(<ValuesSliders scores={VALUES} explain />);
    for (const dim of [...VALUES_DIMENSIONS, ...REMAINING_DIMENSIONS]) {
      const left = screen.getByRole("button", { name: dim.leftLabel });
      const right = screen.getByRole("button", { name: dim.rightLabel });
      expect(left.getAttribute("data-cq-term")).toBe(dim.term);
      expect(right.getAttribute("data-cq-term")).toBe(dim.term);
    }
  });

  it("explains the two lines it has not measured yet", () => {
    // Prestige and Fulfilment are the two words on the whole dashboard a
    // student is least likely to have met, and this card shows them with no
    // reading beside them. The concept is explainable either way.
    render(<ValuesSliders scores={VALUES} rawCounts={{}} explain />);
    expect(screen.getByRole("button", { name: "Prestige" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Fulfilment" })).toBeDefined();
    expect(screen.getAllByText("Not answered yet")).toHaveLength(3);
  });

  it("adds nothing to the reveal", () => {
    const { container } = render(<ValuesSliders scores={VALUES} />);
    expect(container.querySelectorAll("[data-cq-term]")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
