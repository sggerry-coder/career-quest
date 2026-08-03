import { describe, it, expect } from "vitest";
import { scoredValue, buildProcessResponseFootprint } from "@/hooks/use-scores";
import type { ClientResponse } from "@/lib/types/quest";

function answer(value: number, reverse?: boolean): ClientResponse {
  return {
    question_id: "s1-riasec-R-02",
    response_value: value,
    response_label: "Strongly Like",
    framework: "riasec",
    framework_target: "R",
    answered_at: 0,
    reverse_scored: reverse,
  };
}

describe("scoredValue", () => {
  it("passes a normally-worded answer through untouched", () => {
    expect(scoredValue(answer(4))).toBe(4);
    expect(scoredValue(answer(1))).toBe(1);
  });

  it("flips a reverse-worded answer", () => {
    expect(scoredValue(answer(4, true))).toBe(1);
    expect(scoredValue(answer(1, true))).toBe(4);
  });

  it("treats a missing flag as not reversed", () => {
    const { reverse_scored, ...withoutFlag } = answer(4, true);
    void reverse_scored;
    expect(scoredValue(withoutFlag as ClientResponse)).toBe(4);
  });
});

describe("undo footprints record the scored value, not the raw answer", () => {
  // The footprint is what undo subtracts back out. If it recorded the raw
  // answer while processResponse added the flipped one, undoing a
  // reverse-worded question would corrupt the score instead of clearing it.
  it("stores the flipped value for a reverse-worded item", () => {
    const footprint = buildProcessResponseFootprint(answer(4, true));
    expect(footprint.riasec_additions.R).toEqual([1]);
  });

  it("stores the plain value for a normal item", () => {
    const footprint = buildProcessResponseFootprint(answer(4));
    expect(footprint.riasec_additions.R).toEqual([4]);
  });
});
