import { describe, it, expect } from "vitest";
import {
  countInterestResponses,
  MIN_INTEREST_RESPONSES,
} from "@/lib/character/evidence";

describe("countInterestResponses", () => {
  it("counts every answer across all six types", () => {
    expect(
      countInterestResponses({ R: [4, 3], I: [2], A: [], S: [1, 1, 1], E: [], C: [] })
    ).toBe(6);
  });

  it("is zero for an empty record", () => {
    expect(countInterestResponses({})).toBe(0);
  });

  it("ignores a malformed entry rather than throwing", () => {
    expect(
      countInterestResponses({ R: [4], I: undefined as unknown as number[] })
    ).toBe(1);
  });
});

describe("MIN_INTEREST_RESPONSES", () => {
  it("is high enough that the interest block, not the warm-up, decides", () => {
    // The warm-up is 5 questions and now contributes no interest answers at
    // all; the interest block contributes 14 Likert items. A threshold in
    // between means naming cannot happen until real evidence exists.
    expect(MIN_INTEREST_RESPONSES).toBeGreaterThan(5);
    expect(MIN_INTEREST_RESPONSES).toBeLessThanOrEqual(14);
  });
});
