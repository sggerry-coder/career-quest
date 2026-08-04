import { describe, it, expect } from "vitest";
import {
  calculateAllRiasec,
  calculateAllRiasecOrNull,
  buildRiasecEvidence,
  hasRiasecReading,
  mergeIpsativeScores,
  deriveClassLabel,
} from "../riasec";
import { deriveCharacterClass } from "@/lib/character/classes";

/**
 * A skipped question must count as genuinely missing: the maths divides by
 * what was actually answered, not by what was asked. A student who skips must
 * never be scored as though they had answered "strongly dislike".
 *
 * Every case here is written as the full journey from raw answers to the name
 * the student is shown, because that is where the cost lands. The numbers in
 * the comments are the arithmetic, worked.
 */

/**
 * Rating answers exactly as useScores stores them: reverse-worded items are
 * already flipped, two items per type.
 *
 *   R [4,4] → (8 - 2*1) / (2*3) * 100 = 100
 *   I [3,3] → (6 - 2)   / 6     * 100 = 66.67
 *   A [2,3] → (5 - 2)   / 6     * 100 = 50
 *   S [2,2] → (4 - 2)   / 6     * 100 = 33.33
 *   E [2,2] → 33.33
 *   C [1,1] → (2 - 2)   / 6     * 100 = 0
 */
const LIKERT_RAW: Record<string, number[]> = {
  R: [4, 4],
  I: [3, 3],
  A: [2, 3],
  S: [2, 2],
  E: [2, 2],
  C: [1, 1],
};

/**
 * The second ranking only. Ranks score 1st=5, 2nd=3, 3rd=1, normalised on the
 * rating scale (a legacy 5 clamps to 4):
 *
 *   I [5] → clamps to 4 → (4-1)/3 * 100 = 100
 *   S [3] →               (3-1)/3 * 100 = 66.67
 *   C [1] →               (1-1)/3 * 100 = 0
 *
 * The first ranking covers R, A and E and was skipped, so those three arrays
 * are empty — the student was never asked, not asked and unenthusiastic.
 */
const IPSATIVE_RAW_ONE_SKIPPED: Record<string, number[]> = {
  R: [],
  I: [5],
  A: [],
  E: [],
  S: [3],
  C: [1],
};

/** What the old code did: empty array in, 0 out, 0 straight into the merge. */
function mergeReadingMissingAsZero(
  likertRaw: Record<string, number[]>,
  ipsativeRaw: Record<string, number[]>
): Record<string, number> {
  return mergeIpsativeScores(
    calculateAllRiasec(likertRaw),
    calculateAllRiasec(ipsativeRaw)
  );
}

/** What the code does now: "not answered" survives as far as the merge. */
function mergeRespectingMissing(
  likertRaw: Record<string, number[]>,
  ipsativeRaw: Record<string, number[]>
): Record<string, number> {
  return mergeIpsativeScores(
    calculateAllRiasecOrNull(likertRaw),
    calculateAllRiasecOrNull(ipsativeRaw)
  );
}

describe("skipping one ranking must not deflate the types it covered", () => {
  it("leaves the three types the skipped ranking covered on their rating score alone", () => {
    const merged = mergeRespectingMissing(LIKERT_RAW, IPSATIVE_RAW_ONE_SKIPPED);

    // R, A and E have no ipsative side, so the rating side is the whole score.
    expect(merged.R).toBeCloseTo(100, 4);
    expect(merged.A).toBeCloseTo(50, 4);
    expect(merged.E).toBeCloseTo(33.33, 1);
  });

  it("still merges 70/30 for the types the answered ranking covered", () => {
    const merged = mergeRespectingMissing(LIKERT_RAW, IPSATIVE_RAW_ONE_SKIPPED);

    // I: 66.67*0.7 + 100*0.3   = 46.67 + 30 = 76.67
    expect(merged.I).toBeCloseTo(76.67, 1);
    // S: 33.33*0.7 + 66.67*0.3 = 23.33 + 20 = 43.33
    expect(merged.S).toBeCloseTo(43.33, 1);
    // C: 0*0.7 + 0*0.3 = 0 — answered, and it really is 0.
    expect(merged.C).toBeCloseTo(0, 4);
  });

  it("costs each affected type exactly the 30% the ranking was worth", () => {
    const before = mergeReadingMissingAsZero(
      LIKERT_RAW,
      IPSATIVE_RAW_ONE_SKIPPED
    );
    const after = mergeRespectingMissing(LIKERT_RAW, IPSATIVE_RAW_ONE_SKIPPED);

    // 100 → 70, 50 → 35, 33.33 → 23.33: likert * 0.7, on the types nobody
    // was asked about rather than on anything the student said.
    expect(before.R).toBeCloseTo(70, 4);
    expect(before.A).toBeCloseTo(35, 4);
    expect(before.E).toBeCloseTo(23.33, 1);

    for (const type of ["R", "A", "E"]) {
      expect(before[type]).toBeCloseTo(after[type] * 0.7, 4);
    }
    // The types the answered ranking covered are untouched either way.
    for (const type of ["I", "S", "C"]) {
      expect(before[type]).toBeCloseTo(after[type], 4);
    }
  });

  it("flips the primary class the student is named and themed by", () => {
    const before = mergeReadingMissingAsZero(
      LIKERT_RAW,
      IPSATIVE_RAW_ONE_SKIPPED
    );
    const after = mergeRespectingMissing(LIKERT_RAW, IPSATIVE_RAW_ONE_SKIPPED);

    // Before: I 76.67, R 70, S 43.33, A 35, E 23.33, C 0.
    // Top two clear 50 and lead the third by 70 - 43.33 = 26.67 > 10.
    expect(deriveClassLabel(before)).toBe("INVESTIGATOR-MAKER");
    expect(deriveCharacterClass(before).primary).toBe("mage");

    // After: R 100, I 76.67, A 50, S 43.33, E 33.33, C 0.
    // Same rule, 76.67 - 50 = 26.67 > 10 — but the leader is now the type
    // that the skipped ranking had been quietly taxing.
    expect(deriveClassLabel(after)).toBe("MAKER-INVESTIGATOR");
    expect(deriveCharacterClass(after).primary).toBe("warsmith");
  });
});

describe("skipping the rating items must not deflate a type the student ranked", () => {
  it("scores a type the student ranked first on the ranking alone", () => {
    // Both Realistic rating items skipped; "design and build a robot" ranked
    // 1st in the first ranking.
    const likertRaw = { ...LIKERT_RAW, R: [] };
    const ipsativeRaw = { R: [5], A: [3], E: [1], I: [], S: [], C: [] };

    // Before: 0*0.7 + 100*0.3 = 30. The most enjoyable thing on offer,
    // scored 30 out of 100.
    expect(mergeReadingMissingAsZero(likertRaw, ipsativeRaw).R).toBeCloseTo(
      30,
      4
    );
    // After: the ranking is the whole reading.
    expect(mergeRespectingMissing(likertRaw, ipsativeRaw).R).toBeCloseTo(
      100,
      4
    );
  });
});

describe("a type nobody was asked about must not be ranked as a low one", () => {
  it("does not name a student from the one pair of items they answered", () => {
    // Two Helper items, "Strongly Like" twice, everything else skipped.
    const likertRaw = { R: [], I: [], A: [], S: [4, 4], E: [], C: [] };
    const ipsativeRaw = { R: [], I: [], A: [], S: [], E: [], C: [] };
    const scores = mergeRespectingMissing(likertRaw, ipsativeRaw);
    const evidence = buildRiasecEvidence(likertRaw, ipsativeRaw);

    expect(scores.S).toBeCloseTo(100, 4);
    expect(evidence).toEqual({ R: 0, I: 0, A: 0, S: 2, E: 0, C: 0 });

    // Before: S 100 leads a second-placed 0 by 100 > 15, so the student was
    // named HELPER outright — leading five types by the length of the scale
    // on questions nobody had asked them.
    expect(deriveClassLabel(scores)).toBe("HELPER");
    // After: one answered type is not a comparison. "Still forming" is the
    // only honest thing to say.
    expect(deriveClassLabel(scores, evidence)).toBe("SEEKER");
    expect(deriveCharacterClass(scores, evidence).isNamed).toBe(false);
  });

  it("still names a leader once there are two answered types to compare", () => {
    // A reading on less evidence is fine; a reading on absent evidence is not.
    const likertRaw = { R: [2, 2], I: [], A: [], S: [4, 4], E: [], C: [] };
    const ipsativeRaw = { R: [], I: [], A: [], S: [], E: [], C: [] };
    const scores = mergeRespectingMissing(likertRaw, ipsativeRaw);
    const evidence = buildRiasecEvidence(likertRaw, ipsativeRaw);

    // S 100 vs R 33.33: 66.67 > 15, and there is no third answered type for
    // the dual-class rule to lean on, so it stays a single name.
    expect(deriveClassLabel(scores, evidence)).toBe("HELPER");
  });

  it("keeps counting a type that was answered and genuinely scored 0", () => {
    // "Strongly dislike" twice is a reading, and it must keep making the gaps
    // it earns. Same answers, same name, evidence or not.
    const likertRaw = {
      R: [1, 1],
      I: [3, 4],
      A: [1, 1],
      S: [4, 4],
      E: [1, 1],
      C: [1, 1],
    };
    const ipsativeRaw = { R: [], I: [], A: [], S: [], E: [], C: [] };
    const scores = mergeRespectingMissing(likertRaw, ipsativeRaw);
    const evidence = buildRiasecEvidence(likertRaw, ipsativeRaw);

    expect(scores.R).toBe(0);
    expect(evidence.R).toBe(2);
    // S 100, I 83.33, then four answered types at 0.
    expect(deriveClassLabel(scores, evidence)).toBe("HELPER-INVESTIGATOR");
    expect(deriveClassLabel(scores, evidence)).toBe(deriveClassLabel(scores));
  });

  it("says nothing at all when nothing was answered", () => {
    const empty = { R: [], I: [], A: [], S: [], E: [], C: [] };
    const scores = mergeRespectingMissing(empty, empty);
    const evidence = buildRiasecEvidence(empty, empty);

    expect(scores).toEqual({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
    expect(deriveClassLabel(scores, evidence)).toBe("SEEKER");
  });

  it("is unchanged for a student who answered the whole instrument", () => {
    // The evidence argument must be inert in the normal case: every type has
    // two rating items and a place in one ranking.
    const ipsativeRaw = { R: [5], A: [3], E: [1], I: [3], S: [5], C: [1] };
    const scores = mergeRespectingMissing(LIKERT_RAW, ipsativeRaw);
    const evidence = buildRiasecEvidence(LIKERT_RAW, ipsativeRaw);

    expect(evidence).toEqual({ R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 });
    expect(deriveClassLabel(scores, evidence)).toBe(deriveClassLabel(scores));
  });
});

describe("buildRiasecEvidence", () => {
  it("counts both instruments, because both say something about a type", () => {
    const evidence = buildRiasecEvidence(LIKERT_RAW, IPSATIVE_RAW_ONE_SKIPPED);
    // R, A, E: two rating items each, no ranking. I, S, C: plus one rank.
    expect(evidence).toEqual({ R: 2, I: 3, A: 2, S: 3, E: 2, C: 3 });
  });

  it("reports 0 for a type with no answers on either instrument", () => {
    const evidence = buildRiasecEvidence(
      { R: [], I: [4], A: [], S: [], E: [], C: [] },
      { R: [], I: [], A: [], S: [5], E: [], C: [] }
    );
    expect(evidence.R).toBe(0);
    expect(evidence.A).toBe(0);
    expect(evidence.I).toBe(1);
    expect(evidence.S).toBe(1);
  });

  it("survives records missing keys entirely", () => {
    expect(buildRiasecEvidence({}, {})).toEqual({
      R: 0,
      I: 0,
      A: 0,
      S: 0,
      E: 0,
      C: 0,
    });
  });
});

describe("calculateAllRiasecOrNull", () => {
  it("returns null for a type with no answers and a number for one with any", () => {
    const result = calculateAllRiasecOrNull({
      R: [],
      I: [1, 1],
      A: [4],
      S: [],
      E: [],
      C: [],
    });
    expect(result.R).toBeNull();
    // Answered and bottom-of-scale: a number, not a null.
    expect(result.I).toBe(0);
    expect(result.A).toBe(100);
  });

  it("agrees with calculateAllRiasec wherever there is an answer", () => {
    const raw = { R: [4, 4], I: [3], A: [], S: [2, 2], E: [], C: [1] };
    const nullable = calculateAllRiasecOrNull(raw);
    const flattened = calculateAllRiasec(raw);
    for (const type of ["R", "I", "S", "C"]) {
      expect(nullable[type]).toBe(flattened[type]);
    }
    // ...and only differs where there is not.
    expect(nullable.A).toBeNull();
    expect(flattened.A).toBe(0);
  });
});

describe("mergeIpsativeScores with a missing side", () => {
  it("uses the rating side alone when the ranking side is null", () => {
    const merged = mergeIpsativeScores(
      { R: 80, I: 60, A: 40, S: 20, E: 50, C: 70 },
      { R: 100, I: null, A: null, S: null, E: null, C: null }
    );
    expect(merged.R).toBeCloseTo(86, 4); // 80*0.7 + 100*0.3
    expect(merged.I).toBe(60);
    expect(merged.A).toBe(40);
  });

  it("uses the ranking side alone when the rating side is null", () => {
    const merged = mergeIpsativeScores(
      { R: null, I: 60, A: null, S: null, E: null, C: null },
      { R: 100, I: 50, A: null, S: null, E: null, C: null }
    );
    expect(merged.R).toBe(100);
    expect(merged.I).toBeCloseTo(57, 4); // 60*0.7 + 50*0.3
  });

  it("returns 0, and stays total, when neither side has anything", () => {
    const merged = mergeIpsativeScores(
      { R: null, I: null, A: null, S: null, E: null, C: null },
      { R: null, I: null, A: null, S: null, E: null, C: null }
    );
    for (const value of Object.values(merged)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBe(0);
    }
  });
});

/**
 * The same question the class derivation asks, asked by a chart instead.
 * deriveClassLabel drops an unevidenced type from the ranking; the bars have
 * to drop the number. Both need one predicate, and it has to behave the same
 * way hasValuesReading does about a caller that cannot tell.
 */
describe("hasRiasecReading", () => {
  const EVIDENCE = { R: 3, I: 3, A: 2, S: 3, E: 2, C: 0 };

  it("separates a type that was rated from one that was never asked", () => {
    // A scored 0 on two "strongly dislike" ratings; C was never asked. Same
    // number in the scores, opposite meaning.
    expect(hasRiasecReading("A", EVIDENCE)).toBe(true);
    expect(hasRiasecReading("C", EVIDENCE)).toBe(false);
  });

  it("counts a single answer as a reading", () => {
    expect(hasRiasecReading("R", { R: 1 })).toBe(true);
  });

  it("assumes asked when no evidence is supplied at all", () => {
    // The dashboard's position until migration 00006 is applied and wired:
    // it reads back persisted scores and has no counts to read. Blanking six
    // rows of a finished profile would be a worse lie than the one this
    // guards against — the same call hasValuesReading makes.
    expect(hasRiasecReading("C")).toBe(true);
    expect(hasRiasecReading("C", undefined)).toBe(true);
  });

  it("treats a key missing from a real evidence record as unasked", () => {
    // buildRiasecEvidence always emits all six, so a gap inside one of its
    // records is an absence it recorded, not an absence of records.
    expect(hasRiasecReading("C", { R: 2 })).toBe(false);
  });

  it("agrees with buildRiasecEvidence on the fixture that names nobody", () => {
    const evidence = buildRiasecEvidence(
      { R: [], I: [], A: [], S: [4, 4], E: [], C: [] },
      { R: [], I: [], A: [], S: [], E: [], C: [] }
    );

    expect(hasRiasecReading("S", evidence)).toBe(true);
    for (const type of ["R", "I", "A", "E", "C"]) {
      expect(hasRiasecReading(type, evidence)).toBe(false);
    }
  });
});
