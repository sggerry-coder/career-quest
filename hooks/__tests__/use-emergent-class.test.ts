/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useEmergentClass } from "@/hooks/use-emergent-class";

afterEach(() => cleanup());

const none = { R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 };
const helper = { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 };
const helperMage = { R: 10, I: 80, A: 20, S: 90, E: 20, C: 10 };

describe("useEmergentClass", () => {
  it("starts unnamed", () => {
    const { result } = renderHook(() =>
      useEmergentClass({ riasec: none, blockKey: "warmup" })
    );
    expect(result.current.derived.primary).toBe("wanderer");
    expect(result.current.justNamed).toBe(false);
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

  it("names the student at a block boundary and flags the moment once", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );
    rerender({ riasec: helper, blockKey: "riasec" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.justNamed).toBe(true);

    // The moment happens once, not on every later render.
    rerender({ riasec: helper, blockKey: "riasec" });
    expect(result.current.justNamed).toBe(false);
  });

  it("deepens a class without flipping it", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: helper, blockKey: "riasec" } }
    );
    rerender({ riasec: helperMage, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("mage");
    // Already named, so this is not a fresh moment.
    expect(result.current.justNamed).toBe(false);
  });
});
