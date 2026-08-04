/**
 * The rule behind the completion screen's one qualified sentence.
 *
 * Chapter 1 asks 40 questions (35 core + 5 confirmatory) and offers "I'm not
 * sure" on 19 of them. The threshold sits where more of those 19 are missing
 * than were answered, so the numbers below are the real ones a student can
 * arrive with, not round figures.
 */
import { describe, it, expect } from "vitest";
import {
  SPARSE_SKIP_THRESHOLD,
  isSparseProfile,
  sparseProfileNote,
} from "../profile-depth";

const ASKED = 40;

describe("isSparseProfile", () => {
  it("leaves a full quest alone", () => {
    expect(isSparseProfile(ASKED, ASKED)).toBe(false);
  });

  it("leaves a student who skipped a few alone", () => {
    // 9 skipped: fewer than half the 19 skippable questions are missing.
    expect(isSparseProfile(ASKED - 9, ASKED)).toBe(false);
  });

  it("flags the profile once more of the skippable block is missing than answered", () => {
    expect(isSparseProfile(ASKED - SPARSE_SKIP_THRESHOLD, ASKED)).toBe(true);
  });

  it("flags a student who skipped every question they could", () => {
    // All 19: the whole interest instrument, which is what the archetype is
    // read off.
    expect(isSparseProfile(ASKED - 19, ASKED)).toBe(true);
  });
});

describe("sparseProfileNote", () => {
  it("says nothing when there is nothing to qualify", () => {
    expect(sparseProfileNote("quest", ASKED, ASKED)).toBeNull();
    expect(sparseProfileNote("explorer", ASKED, ASKED)).toBeNull();
  });

  it("names both counts in quest tone", () => {
    const note = sparseProfileNote("quest", 21, ASKED);
    expect(note).toContain("21 of 40");
    expect(note).toContain("first sketch");
  });

  it("names both counts in explorer tone, without the quest vocabulary", () => {
    const note = sparseProfileNote("explorer", 21, ASKED);
    expect(note).toContain("21 of 40");
    expect(note).not.toContain("legend");
  });

  it("never reads as an apology or a fault in either tone", () => {
    for (const tone of ["quest", "explorer"] as const) {
      const note = sparseProfileNote(tone, 21, ASKED)!;
      expect(note).not.toMatch(/sorry|error|problem|failed|couldn't|wrong/i);
      // And always offers the way forward rather than just the limit.
      expect(note).toMatch(/answer more/i);
    }
  });
});
