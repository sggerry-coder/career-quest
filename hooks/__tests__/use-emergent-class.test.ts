/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useEmergentClass } from "@/hooks/use-emergent-class";
import { THEME_CACHE_KEY } from "@/lib/theme";

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
      ({ riasec }) => useEmergentClass({ riasec, blockKey: "riasec" }),
      { initialProps: { riasec: none } }
    );
    rerender({ riasec: helper });
    // Scores moved mid-block; the student must not be renamed yet.
    expect(result.current.derived.primary).toBe("wanderer");
  });

  it("names the student at a block boundary", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
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
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: helper, blockKey: "riasec" } }
    );
    rerender({ riasec: helperMage, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("mage");
  });

  it("an unnamed student can still be named for the first time at any block boundary", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
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
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
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
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
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
        useEmergentClass({ riasec: none, blockKey: "warmup", restoredClass: "wanderer" })
      );
      expect(wanderer.result.current.derived.isNamed).toBe(false);

      const nonsense = renderHook(() =>
        useEmergentClass({ riasec: none, blockKey: "warmup", restoredClass: "sorceress" })
      );
      expect(nonsense.result.current.derived.isNamed).toBe(false);
    });
  });

  it("does not present a blurred signal (rogue) as a second class", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
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
});
