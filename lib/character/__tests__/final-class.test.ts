import { describe, it, expect } from "vitest";
import {
  deriveCharacterClass,
  serializeCharacterClass,
  parseCharacterClass,
  type DerivedClass,
} from "@/lib/character/classes";
import { resolveFinalClass } from "@/lib/character/final-class";

const guardianVanguard: DerivedClass = {
  primary: "guardian",
  secondary: "vanguard",
  isNamed: true,
};

/**
 * Verified against the real scoring code by the whole-branch review: a student
 * locked as Guardian-Vanguard at the reveal, then two confirmatory answers fed
 * to Enterprising -- the type the adaptive selector picks precisely because it
 * is closest to overtaking the leader.
 */
const chartAtReveal = { R: 23.3, I: 46.7, A: 55, S: 90, E: 88.3, C: 41.7 };
const chartAfterConfirmatory = { R: 23.3, I: 46.7, A: 55, S: 90, E: 94.2, C: 41.7 };

describe("resolveFinalClass", () => {
  it("holds the class when the confirmatory round did not change the reading", () => {
    const resolved = resolveFinalClass(guardianVanguard, chartAtReveal);
    expect(resolved.primary).toBe("guardian");
    expect(resolved.secondary).toBe("vanguard");
  });

  it("follows the chart when the confirmatory round changed the reading", () => {
    // Before the fix this saved "guardian-vanguard" over a chart whose two
    // tallest bars are E then S -- and the dashboard prints the class name
    // inside those bars.
    const resolved = resolveFinalClass(
      guardianVanguard,
      chartAfterConfirmatory
    );
    expect(resolved.primary).toBe("vanguard");
    expect(resolved.secondary).toBe("guardian");
  });

  it("never takes a name away when the final chart has no lead at all", () => {
    // Every type under deriveClassLabel's floor resolves to Wanderer. A
    // student who answered the whole instrument has earned a name; five extra
    // answers are not grounds to withdraw it.
    const flat = { R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 };
    expect(deriveCharacterClass(flat).isNamed).toBe(false);

    const resolved = resolveFinalClass(guardianVanguard, flat);
    expect(resolved).toEqual(guardianVanguard);
  });

  /**
   * The spec's acceptance criterion, over the whole input space rather than
   * one hand-picked vector: "given any set of answers, the named class must be
   * derivable from the interest scores being displayed".
   */
  it("returns a class derivable from the chart, for any chart that names one", () => {
    const locked: DerivedClass[] = [
      { primary: "guardian", secondary: null, isNamed: true },
      { primary: "warsmith", secondary: "paladin", isNamed: true },
      { primary: "rogue", secondary: null, isNamed: true },
      { primary: "wanderer", secondary: null, isNamed: false },
    ];

    // Deterministic sweep: a small LCG so a failure is reproducible.
    let seed = 20260804;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    for (let i = 0; i < 5000; i += 1) {
      const riasec = {
        R: next() * 100,
        I: next() * 100,
        A: next() * 100,
        S: next() * 100,
        E: next() * 100,
        C: next() * 100,
      };
      const fromChart = deriveCharacterClass(riasec);
      const resolved = resolveFinalClass(
        locked[i % locked.length],
        riasec
      );

      if (fromChart.isNamed) {
        expect(resolved, JSON.stringify(riasec)).toEqual(fromChart);
      } else {
        expect(resolved, JSON.stringify(riasec)).toEqual(locked[i % locked.length]);
      }

      // And it survives the trip through avatar_class unchanged, so the
      // dashboard reads back the class that was derived.
      expect(parseCharacterClass(serializeCharacterClass(resolved))).toEqual(
        resolved.isNamed ? resolved : { primary: "wanderer", secondary: null, isNamed: false }
      );
    }
  });
});
