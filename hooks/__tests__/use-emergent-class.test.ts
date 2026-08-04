/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useEmergentClass } from "@/hooks/use-emergent-class";
import { THEME_CACHE_KEY } from "@/lib/theme";

// Blocks matter now: a *first* naming only happens once the interest block is
// behind the student (see isInterestBlockComplete). "warmup" and "riasec" are
// the two blocks where naming is withheld; "riasec_mi" and everything after
// are boundaries where it can happen.

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => cleanup());

const none = { R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 };
const helper = { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 };
const helperMage = { R: 10, I: 80, A: 20, S: 90, E: 20, C: 10 };
// Reviewer-supplied fixtures for the anti-flip tests: same two top scores
// (Guardian/Bard) with which one leads swapped between renders.
const guardianBard = { R: 10, I: 20, A: 60, S: 90, E: 20, C: 10 };
const bardGuardian = { R: 10, I: 20, A: 95, S: 70, E: 20, C: 10 };
// A third signal (Mage) overtaking the second-place slot, to prove the
// secondary is genuinely free to change once the primary is locked.
const mageGuardian = { R: 10, I: 90, A: 20, S: 60, E: 20, C: 10 };
// Reviewer's fixture: scores broaden enough that no single type leads --
// deriveCharacterClass resolves this to "rogue" (open/no clear lean).
const broadenedToRogue = { R: 10, I: 20, A: 55, S: 60, E: 50, C: 10 };

describe("useEmergentClass", () => {
  it("starts unnamed", () => {
    const { result } = renderHook(() =>
      useEmergentClass({ riasec: none, blockKey: "warmup" })
    );
    expect(result.current.derived.primary).toBe("wanderer");
    expect(result.current.derived.isNamed).toBe(false);
  });

  it("does not re-derive while the block stays the same", () => {
    const { result, rerender } = renderHook(
      ({ riasec }) => useEmergentClass({ riasec, blockKey: "riasec_mi" }),
      { initialProps: { riasec: none } }
    );
    rerender({ riasec: helper });
    // Scores moved mid-block; the student must not be renamed yet.
    expect(result.current.derived.primary).toBe("wanderer");
  });

  it("names the student at a block boundary", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "riasec" } }
    );
    rerender({ riasec: helper, blockKey: "riasec_mi" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);

    // Still named on a later render at the same block.
    rerender({ riasec: helper, blockKey: "riasec_mi" });
    expect(result.current.derived.primary).toBe("guardian");
  });

  it("deepens a class without flipping it", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: helper, blockKey: "riasec_mi" } }
    );
    rerender({ riasec: helperMage, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("mage");
  });

  it("an unnamed student can still be named for the first time at any later block boundary", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );
    expect(result.current.derived.isNamed).toBe(false);

    rerender({ riasec: none, blockKey: "riasec_mi" });
    expect(result.current.derived.primary).toBe("wanderer");

    // Naming isn't special-cased to the first post-interest boundary -- it
    // can happen at whatever boundary first clears the bar.
    rerender({ riasec: helper, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);
  });

  it("locks the primary once named -- a later boundary must not flip it", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "riasec" } }
    );

    rerender({ riasec: guardianBard, blockKey: "riasec_mi" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("bard");

    // Scores shift so Bard would now lead outright (Bard-Guardian if
    // derived fresh) -- the primary must hold at Guardian regardless.
    rerender({ riasec: bardGuardian, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
  });

  it("still updates the secondary while the primary stays locked", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "riasec" } }
    );

    rerender({ riasec: guardianBard, blockKey: "riasec_mi" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("bard");

    // A different class (Mage) overtakes the runner-up spot -- the locked
    // primary holds, but the secondary is free to follow the new signal.
    rerender({ riasec: mageGuardian, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("mage");
  });

  it("never writes a theme while the student is unnamed (Wanderer)", () => {
    // Simulate a returning, already-named student: the landing page or
    // dashboard already applied their real theme before the session
    // mounted. The very first render here has empty/tied scores, which
    // resolve to unnamed Wanderer -- that must not overwrite the theme
    // already on the page.
    document.documentElement.setAttribute("data-theme", "guardian-jade");
    window.localStorage.setItem(THEME_CACHE_KEY, "guardian-jade");

    renderHook(() => useEmergentClass({ riasec: none, blockKey: "warmup" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "guardian-jade"
    );
    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toBe(
      "guardian-jade"
    );
  });

  /**
   * A quit-and-resume is a fresh mount, so before the seed existed the hook
   * restarted as an unnamed Wanderer and resolveNext's "anything is allowed"
   * branch was free to rename the student. Guardian-Bard came back as
   * Bard-Guardian, theme and all.
   */
  describe("across a mid-quest resume", () => {
    it("holds the primary a resumed student was already named", () => {
      // --- Session one: the student is named Guardian-Bard, then quits.
      const first = renderHook(
        ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
        { initialProps: { riasec: none, blockKey: "riasec" } }
      );
      first.rerender({ riasec: guardianBard, blockKey: "riasec_mi" });
      expect(first.result.current.derived.primary).toBe("guardian");
      expect(first.result.current.derived.secondary).toBe("bard");
      // What the checkpoint carries: questState.avatarClass.
      const checkpointedClass = first.result.current.derived.primary;
      first.unmount();

      // --- Session two. The hook mounts before the restore lands: the page
      // is still deciding whether to offer Resume, so quest state is the
      // reducer's initial "warmup" with empty scores. The checkpoint then
      // arrives and the block advances, which is the first boundary the
      // resumed hook sees.
      const second = renderHook(
        ({ riasec, blockKey, restoredClass }) =>
          useEmergentClass({ riasec, blockKey, restoredClass }),
        {
          initialProps: {
            riasec: none,
            blockKey: "warmup",
            restoredClass: checkpointedClass as string,
          },
        }
      );
      second.rerender({
        riasec: bardGuardian,
        blockKey: "riasec_mi",
        restoredClass: checkpointedClass as string,
      });

      expect(second.result.current.derived.primary).toBe("guardian");
      expect(second.result.current.derived.secondary).toBe("bard");
    });

    it("flips without the seed -- the defect this guards against", () => {
      // The identical resume sequence with no restoredClass: the hook starts
      // as a Wanderer, the boundary after the restore is a free first
      // naming, and the student comes back a Bard. If this ever stops
      // flipping, the test above has stopped proving anything.
      const { result, rerender } = renderHook(
        ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
        { initialProps: { riasec: none, blockKey: "warmup" } }
      );
      rerender({ riasec: bardGuardian, blockKey: "riasec_mi" });
      expect(result.current.derived.primary).toBe("bard");
    });

    it("adopts a class restored after mount, as the Resume prompt does", () => {
      // The student sees the Resume prompt first, so the checkpoint lands a
      // render or more after the hook mounted.
      const { result, rerender } = renderHook(
        ({ riasec, blockKey, restoredClass }) =>
          useEmergentClass({ riasec, blockKey, restoredClass }),
        {
          initialProps: {
            riasec: none,
            blockKey: "warmup",
            restoredClass: null as string | null,
          },
        }
      );
      expect(result.current.derived.isNamed).toBe(false);

      rerender({ riasec: guardianBard, blockKey: "riasec", restoredClass: "guardian" });
      expect(result.current.derived.primary).toBe("guardian");

      rerender({ riasec: bardGuardian, blockKey: "mbti_values", restoredClass: "guardian" });
      expect(result.current.derived.primary).toBe("guardian");
    });

    it("ignores a wanderer or unrecognised restored class", () => {
      const wanderer = renderHook(() =>
        useEmergentClass({
          riasec: none,
          blockKey: "warmup",
          restoredClass: "wanderer",
        })
      );
      expect(wanderer.result.current.derived.isNamed).toBe(false);

      const nonsense = renderHook(() =>
        useEmergentClass({
          riasec: none,
          blockKey: "warmup",
          restoredClass: "sorceress",
        })
      );
      expect(nonsense.result.current.derived.isNamed).toBe(false);
    });
  });

  it("does not present a blurred signal (rogue) as a second class", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "riasec" } }
    );

    rerender({ riasec: helper, blockKey: "riasec_mi" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBeNull();

    // Scores broaden into "no clear lean" (rogue) -- the fresh signal got
    // *less* certain, not more. Must stay plain Guardian, never
    // "Guardian-Rogue".
    rerender({ riasec: broadenedToRogue, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBeNull();
  });

  describe("evidence gate", () => {
    it("refuses to name a student while interest answers are still to come", () => {
      // Scores that would clearly name a Guardian, sitting inside the block
      // that is still collecting them.
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
          blockKey: "riasec",
        })
      );
      expect(result.current.derived.primary).toBe("wanderer");
      expect(result.current.derived.isNamed).toBe(false);
    });

    it("names the student once the interest block is behind them", () => {
      const { result, rerender } = renderHook(
        ({ blockKey }) =>
          useEmergentClass({
            riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
            blockKey,
          }),
        { initialProps: { blockKey: "riasec" } }
      );
      expect(result.current.derived.isNamed).toBe(false);

      rerender({ blockKey: "riasec_mi" });
      expect(result.current.derived.primary).toBe("guardian");
      expect(result.current.derived.isNamed).toBe(true);
    });

    it("still honours a restored class even inside the interest block", () => {
      // A resumed student was already named; the gate is about first
      // naming, not about holding a name they already earned.
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: {},
          blockKey: "riasec",
          restoredClass: "guardian",
        })
      );
      expect(result.current.derived.primary).toBe("guardian");
      expect(result.current.derived.isNamed).toBe(true);
    });

    /**
     * C1a. A student who quits at question 15-17 has answered 10-12 of the 12
     * rating items but neither ipsative ranking -- and the ipsative pair is
     * 30% of every merged interest score. Resuming dispatches RESTORE_STATE,
     * which moves current_block in the same commit as the restored scores,
     * so the derivation effect fires mid-interest-block. The retired
     * response-count gate cleared at 10 rating answers and named them there;
     * the lock then refused to let the missing evidence change the answer,
     * and the two ipsative rankings turned a Warsmith-Mage chart into a
     * Rogue one. The dashboard printed "Warsmith-Rogue" -- a name no chart
     * produces -- inside the bars that disproved it.
     */
    it("does not name a student who resumes mid-interest-block", () => {
      // The chart as it stands with the ratings in but the rankings not.
      const ratingsOnly = { R: 100, I: 100, A: 66.7, S: 50, E: 33.3, C: 33.3 };
      // The same student once both ipsative rankings land.
      const withRankings = { R: 70, I: 70, A: 66.7, S: 65, E: 53.3, C: 43.3 };

      const { result, rerender } = renderHook(
        ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
        // Mount as the page does -- reducer initial state -- then the
        // restore lands and moves the block, all inside "riasec".
        { initialProps: { riasec: none, blockKey: "warmup" } }
      );
      rerender({ riasec: ratingsOnly, blockKey: "riasec" });

      expect(result.current.derived.isNamed).toBe(false);
      expect(result.current.namingEventId).toBe(0);

      // They finish the block. Now, and only now, are they named -- from the
      // chart they are about to be shown.
      rerender({ riasec: withRankings, blockKey: "riasec_mi" });
      expect(result.current.derived.primary).toBe("rogue");
      expect(result.current.derived.isNamed).toBe(true);
      expect(result.current.derived.secondary).toBeNull();
    });

    it("locks Rogue derived over the finished interest instrument", () => {
      const flat = { R: 52, I: 55, A: 53, S: 50, E: 51, C: 49 };
      const { result } = renderHook(() =>
        useEmergentClass({ riasec: flat, blockKey: "riasec_mi" })
      );
      expect(result.current.derived.primary).toBe("rogue");
      expect(result.current.derived.isNamed).toBe(true);
    });

    it("names a class the interest bars actually support", () => {
      // At the moment of naming, the class must be the one a student would
      // read off the chart. "CLASS: WARSMITH" above a chart where Helper is
      // the tallest bar is the defect this guards.
      const riasec = { R: 20, I: 30, A: 25, S: 85, E: 15, C: 10 };
      const { result } = renderHook(() =>
        useEmergentClass({ riasec, blockKey: "riasec_mi" })
      );

      const topType = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0];
      const expectedByChart = { R: "warsmith", I: "mage", A: "bard", S: "guardian", E: "vanguard", C: "paladin" }[topType];
      expect(result.current.derived.primary).toBe(expectedByChart);
    });

    it("names a student who skipped most of the interest block, once it is done", () => {
      // A student who answered only a handful of the interest questions but
      // left a clear Guardian lead. The gate exists to stop a *premature*
      // naming while more answers are still coming -- once the interest
      // block is finished, nothing more will arrive before the reveal, so
      // what they did answer should be enough.
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
          blockKey: "riasec_mi",
        })
      );
      expect(result.current.derived.primary).toBe("guardian");
      expect(result.current.derived.isNamed).toBe(true);
    });

    it("still leaves a student with no real lead unnamed once the interest block is done", () => {
      // Almost nothing answered, and what's there shows no lead at all --
      // deriveCharacterClass honestly returns Wanderer for this, and the
      // finished-block bypass must not force a name that isn't there.
      const { result } = renderHook(() =>
        useEmergentClass({ riasec: none, blockKey: "riasec_mi" })
      );
      expect(result.current.derived.primary).toBe("wanderer");
      expect(result.current.derived.isNamed).toBe(false);
    });
  });

  describe("naming event", () => {
    it("raises a naming event exactly once, when the student is first named", () => {
      const { result, rerender } = renderHook(
        ({ blockKey }) =>
          useEmergentClass({
            riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
            blockKey,
          }),
        { initialProps: { blockKey: "riasec" } }
      );
      expect(result.current.namingEventId).toBe(0);

      rerender({ blockKey: "riasec_mi" });
      expect(result.current.namingEventId).toBe(1);

      // Deepening is not a new naming.
      rerender({ blockKey: "mbti_values" });
      expect(result.current.namingEventId).toBe(1);
    });

    it("raises no naming event for a student who was already named on resume", () => {
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: {}, blockKey: "riasec", restoredClass: "guardian",
        })
      );
      // They were named in an earlier sitting; replaying the moment would be wrong.
      expect(result.current.namingEventId).toBe(0);
    });
  });
});
