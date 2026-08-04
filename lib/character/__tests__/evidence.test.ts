import { describe, it, expect } from "vitest";
import { isInterestBlockComplete } from "@/lib/character/evidence";
import { session1CoreQuestions } from "@/data/questions/session-1-core";

describe("isInterestBlockComplete", () => {
  it("is false while interest answers are still to come", () => {
    expect(isInterestBlockComplete("warmup")).toBe(false);
    expect(isInterestBlockComplete("riasec")).toBe(false);
  });

  it("is true from the block after the interest block onward", () => {
    expect(isInterestBlockComplete("riasec_mi")).toBe(true);
    expect(isInterestBlockComplete("mbti_values")).toBe(true);
    expect(isInterestBlockComplete("selfmap")).toBe(true);
    expect(isInterestBlockComplete("reveal")).toBe(true);
    expect(isInterestBlockComplete("confirmatory")).toBe(true);
  });

  /**
   * The function is a statement about where the interest instrument lives, so
   * it has to be checked against the instrument rather than against itself.
   * Moving a RIASEC question into a later block -- or adding a block before
   * "riasec" -- would silently let a first naming happen on partial evidence
   * again, which is the whole defect this gate exists to close.
   */
  it("agrees with where Session 1 actually asks about interests", () => {
    const interestBlocks = new Set(
      session1CoreQuestions
        .filter((q) => q.framework === "riasec")
        .map((q) => q.block)
    );
    expect([...interestBlocks]).toEqual(["riasec"]);

    for (const block of interestBlocks) {
      expect(isInterestBlockComplete(block)).toBe(false);
    }
  });

  it("counts every interest item in the block it gates on", () => {
    // 12 Likert ratings + 2 ipsative rankings. The retired response-count
    // threshold only ever saw the 12: the ipsative pair goes to a different
    // raw array, so the count could clear while 30% of the merged interest
    // score was still unasked.
    const interestItems = session1CoreQuestions.filter(
      (q) => q.framework === "riasec"
    );
    expect(interestItems.filter((q) => q.question_type === "likert")).toHaveLength(12);
    expect(interestItems.filter((q) => q.question_type === "ipsative")).toHaveLength(2);
  });
});
