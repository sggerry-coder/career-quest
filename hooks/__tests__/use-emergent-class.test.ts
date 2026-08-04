/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useEmergentClass } from "@/hooks/use-emergent-class";
import { THEME_CACHE_KEY } from "@/lib/theme";
import { MIN_INTEREST_RESPONSES } from "@/lib/character/evidence";

// Most of these tests predate the evidence gate and are about block-boundary
// timing, locking, and theming rather than the gate itself -- they pass a
// flat `enoughEvidence` so a first naming is always allowed to happen at the
// boundary under test, same as before the gate existed. The gate itself is
// covered by its own tests further down.
const enoughEvidence = MIN_INTEREST_RESPONSES;

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
    // Enough evidence to clear the gate -- this test is about deriving
    // wanderer from flat scores, not about the gate withholding a naming.
    const { result } = renderHook(() =>
      useEmergentClass({ riasec: none, blockKey: "warmup", interestResponses: enoughEvidence })
    );
    expect(result.current.derived.primary).toBe("wanderer");
    expect(result.current.derived.isNamed).toBe(false);
  });

  it("does not re-derive while the block stays the same", () => {
    const { result, rerender } = renderHook(
      ({ riasec }) =>
        useEmergentClass({ riasec, blockKey: "riasec", interestResponses: enoughEvidence }),
      { initialProps: { riasec: none } }
    );
    rerender({ riasec: helper });
    // Scores moved mid-block; the student must not be renamed yet.
    expect(result.current.derived.primary).toBe("wanderer");
  });

  it("names the student at a block boundary", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );
    rerender({ riasec: helper, blockKey: "riasec" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);

    // Still named on a later render at the same block.
    rerender({ riasec: helper, blockKey: "riasec" });
    expect(result.current.derived.primary).toBe("guardian");
  });

  it("deepens a class without flipping it", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
      { initialProps: { riasec: helper, blockKey: "riasec" } }
    );
    rerender({ riasec: helperMage, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("mage");
  });

  it("an unnamed student can still be named for the first time at any block boundary", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );
    expect(result.current.derived.isNamed).toBe(false);

    rerender({ riasec: none, blockKey: "riasec" });
    expect(result.current.derived.primary).toBe("wanderer");

    // Naming isn't special-cased to the "riasec" block -- it can happen
    // at whatever boundary first clears the bar.
    rerender({ riasec: helper, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);
  });

  it("locks the primary once named -- a later boundary must not flip it", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );

    rerender({ riasec: guardianBard, blockKey: "riasec" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("bard");

    // Scores shift so Bard would now lead outright (Bard-Guardian if
    // derived fresh) -- the primary must hold at Guardian regardless.
    rerender({ riasec: bardGuardian, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
  });

  it("still updates the secondary while the primary stays locked", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );

    rerender({ riasec: guardianBard, blockKey: "riasec" });
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

    renderHook(() =>
      useEmergentClass({ riasec: none, blockKey: "warmup", interestResponses: enoughEvidence })
    );

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
        ({ riasec, blockKey }) =>
          useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
        { initialProps: { riasec: none, blockKey: "warmup" } }
      );
      first.rerender({ riasec: guardianBard, blockKey: "riasec" });
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
          useEmergentClass({ riasec, blockKey, restoredClass, interestResponses: 0 }),
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
        ({ riasec, blockKey }) =>
          useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
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
          useEmergentClass({ riasec, blockKey, restoredClass, interestResponses: 0 }),
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
      // Enough evidence to clear the gate -- this test is about
      // seedFromRestored rejecting these two restoredClass values, not
      // about the gate withholding a naming (flat scores stay wanderer
      // either way).
      const wanderer = renderHook(() =>
        useEmergentClass({
          riasec: none,
          blockKey: "warmup",
          restoredClass: "wanderer",
          interestResponses: enoughEvidence,
        })
      );
      expect(wanderer.result.current.derived.isNamed).toBe(false);

      const nonsense = renderHook(() =>
        useEmergentClass({
          riasec: none,
          blockKey: "warmup",
          restoredClass: "sorceress",
          interestResponses: enoughEvidence,
        })
      );
      expect(nonsense.result.current.derived.isNamed).toBe(false);
    });
  });

  it("does not present a blurred signal (rogue) as a second class", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: enoughEvidence }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );

    rerender({ riasec: helper, blockKey: "riasec" });
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
    it("refuses to name a student before there is enough evidence", () => {
      // Scores that would clearly name a Guardian, but only 3 answers behind them.
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
          blockKey: "riasec",
          interestResponses: 3,
        })
      );
      expect(result.current.derived.primary).toBe("wanderer");
      expect(result.current.derived.isNamed).toBe(false);
    });

    it("names the student once the evidence threshold is met", () => {
      const { result, rerender } = renderHook(
        ({ blockKey, interestResponses }) =>
          useEmergentClass({
            riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
            blockKey,
            interestResponses,
          }),
        { initialProps: { blockKey: "riasec", interestResponses: 3 } }
      );
      expect(result.current.derived.isNamed).toBe(false);

      rerender({ blockKey: "riasec_mi", interestResponses: 14 });
      expect(result.current.derived.primary).toBe("guardian");
      expect(result.current.derived.isNamed).toBe(true);
    });

    it("still honours a restored class even before the threshold", () => {
      // A resumed student was already named; the threshold is about first
      // naming, not about holding a name they already earned.
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: {},
          blockKey: "riasec",
          interestResponses: 0,
          restoredClass: "guardian",
        })
      );
      expect(result.current.derived.primary).toBe("guardian");
      expect(result.current.derived.isNamed).toBe(true);
    });

    it("does not lock Rogue while interest questions are still coming", () => {
      const flat = { R: 52, I: 55, A: 53, S: 50, E: 51, C: 49 };
      const { result, rerender } = renderHook(
        ({ riasec, blockKey, interestBlockComplete }) =>
          useEmergentClass({ riasec, blockKey, interestResponses: 12, interestBlockComplete }),
        { initialProps: { riasec: flat, blockKey: "riasec", interestBlockComplete: false } }
      );
      expect(result.current.derived.primary).toBe("rogue");
      expect(result.current.derived.isNamed).toBe(false);

      // A real lead emerging later must still be able to claim them.
      rerender({
        riasec: { R: 20, I: 30, A: 25, S: 88, E: 15, C: 10 },
        blockKey: "riasec_mi",
        interestBlockComplete: true,
      });
      expect(result.current.derived.primary).toBe("guardian");
      expect(result.current.derived.isNamed).toBe(true);
    });

    it("locks Rogue once the interest questions are done", () => {
      const flat = { R: 52, I: 55, A: 53, S: 50, E: 51, C: 49 };
      const { result } = renderHook(() =>
        useEmergentClass({
          riasec: flat, blockKey: "riasec_mi", interestResponses: 14, interestBlockComplete: true,
        })
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
        useEmergentClass({ riasec, blockKey: "riasec_mi", interestResponses: 14 })
      );

      const topType = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0];
      const expectedByChart = { R: "warsmith", I: "mage", A: "bard", S: "guardian", E: "vanguard", C: "paladin" }[topType];
      expect(result.current.derived.primary).toBe(expectedByChart);
    });

    /**
     * A provisional Rogue (isNamed false -- see the two tests above) must
     * never be treated as a genuine naming by the checkpoint. The session
     * page writes questState.avatarClass from emergentClass.primary, that
     * value is what gets persisted in the mid-quest checkpoint, and a resume
     * restores it via seedFromRestored -- which honours ANY non-wanderer id
     * as already named, by design, because a restored *genuine* naming must
     * hold. If the page ever persisted a provisional class's primary
     * unconditionally, a quit-and-resume would silently promote "shown, not
     * locked" into permanently locked, with no further evidence able to
     * change it. The fix lives in app/quest/session/[id]/page.tsx (the
     * SET_AVATAR_CLASS dispatch is gated on emergentClass.isNamed); these
     * two tests simulate the checkpoint round-trip on both sides of that
     * gate to prove why it has to be there.
     */
    describe("a provisional Rogue across a checkpoint round-trip", () => {
      const flat = { R: 52, I: 55, A: 53, S: 50, E: 51, C: 49 };
      const decisiveGuardian = { R: 20, I: 30, A: 25, S: 88, E: 15, C: 10 };

      it("the defect an ungated checkpoint would reintroduce", () => {
        // What questState.avatarClass would hold if SET_AVATAR_CLASS
        // dispatched emergentClass.primary unconditionally, ignoring
        // isNamed -- the pre-fix behaviour.
        const first = renderHook(
          ({ riasec, blockKey, interestBlockComplete }) =>
            useEmergentClass({ riasec, blockKey, interestResponses: 12, interestBlockComplete }),
          { initialProps: { riasec: flat, blockKey: "riasec", interestBlockComplete: false } }
        );
        expect(first.result.current.derived.primary).toBe("rogue");
        expect(first.result.current.derived.isNamed).toBe(false);
        const ungatedCheckpoint = first.result.current.derived.primary; // "rogue"
        first.unmount();

        // Resume, then a decisive Guardian signal arrives.
        const second = renderHook(
          ({ riasec, blockKey, interestBlockComplete }) =>
            useEmergentClass({
              riasec,
              blockKey,
              interestResponses: 14,
              interestBlockComplete,
              restoredClass: ungatedCheckpoint,
            }),
          { initialProps: { riasec: flat, blockKey: "riasec", interestBlockComplete: false } }
        );
        second.rerender({
          riasec: decisiveGuardian,
          blockKey: "riasec_mi",
          interestBlockComplete: true,
        });

        // This is the bug, documented: an ungated checkpoint locks the
        // provisional Rogue in on restore, and the later decisive Guardian
        // evidence can no longer reach the student.
        expect(second.result.current.derived.primary).toBe("rogue");
        expect(second.result.current.derived.isNamed).toBe(true);
      });

      it("the fix: a checkpoint gated on isNamed lets the Guardian signal through", () => {
        // What questState.avatarClass actually holds under the fixed page:
        // SET_AVATAR_CLASS only dispatches when isNamed, so a provisional
        // class leaves it at its previous value -- "wanderer" here, since
        // nothing had been named yet.
        const first = renderHook(
          ({ riasec, blockKey, interestBlockComplete }) =>
            useEmergentClass({ riasec, blockKey, interestResponses: 12, interestBlockComplete }),
          { initialProps: { riasec: flat, blockKey: "riasec", interestBlockComplete: false } }
        );
        expect(first.result.current.derived.isNamed).toBe(false);
        const gatedCheckpoint = first.result.current.derived.isNamed
          ? first.result.current.derived.primary
          : "wanderer";
        first.unmount();

        const second = renderHook(
          ({ riasec, blockKey, interestBlockComplete }) =>
            useEmergentClass({
              riasec,
              blockKey,
              interestResponses: 14,
              interestBlockComplete,
              restoredClass: gatedCheckpoint,
            }),
          { initialProps: { riasec: flat, blockKey: "riasec", interestBlockComplete: false } }
        );
        second.rerender({
          riasec: decisiveGuardian,
          blockKey: "riasec_mi",
          interestBlockComplete: true,
        });

        expect(second.result.current.derived.primary).toBe("guardian");
        expect(second.result.current.derived.isNamed).toBe(true);
      });
    });
  });
});
