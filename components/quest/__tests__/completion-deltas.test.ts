/**
 * Locks in the confirmatory before/after delta computation (P1.3).
 */
import { describe, it, expect } from "vitest";
import { computeProfileDeltas } from "@/components/quest/completion-screen";

const BASE = { R: 50, I: 40, A: 30, S: 20, E: 10, C: 5 };

describe("computeProfileDeltas", () => {
  it("returns [] when there is no snapshot", () => {
    expect(computeProfileDeltas(null, BASE)).toEqual([]);
    expect(computeProfileDeltas(undefined, BASE)).toEqual([]);
  });

  it("returns [] when nothing moved by a full point", () => {
    expect(computeProfileDeltas(BASE, { ...BASE })).toEqual([]);
    expect(
      computeProfileDeltas(BASE, { ...BASE, R: 50.4 }) // rounds to 50
    ).toEqual([]);
  });

  it("reports movements with friendly labels, biggest first, max 3", () => {
    const current = { R: 56, I: 44, A: 28, S: 21, E: 10, C: 5 };
    const deltas = computeProfileDeltas(BASE, current);

    expect(deltas).toEqual([
      { key: "R", label: "Maker", delta: 6 },
      { key: "I", label: "Investigator", delta: 4 },
      { key: "A", label: "Creator", delta: -2 },
    ]);
    // S moved by +1 but only the top 3 movements are shown
    expect(deltas).toHaveLength(3);
  });

  it("includes negative movements and rounds before comparing", () => {
    const deltas = computeProfileDeltas(BASE, { ...BASE, C: 2.4 }); // 5 -> 2
    expect(deltas).toEqual([{ key: "C", label: "Organizer", delta: -3 }]);
  });

  it("treats missing keys as zero", () => {
    const deltas = computeProfileDeltas({ R: 10 }, { R: 10, I: 7 });
    expect(deltas).toEqual([{ key: "I", label: "Investigator", delta: 7 }]);
  });
});
