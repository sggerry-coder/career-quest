import { describe, it, expect } from "vitest";
import {
  earnedRelics,
  relicsFromCounts,
  relicsFromSelfMap,
  RELIC_THRESHOLD,
  STRENGTH_COUNTS_KEY,
} from "@/lib/character/relics";
import { calculateRiasecType } from "@/lib/scoring/riasec";
import { accumulateStrengths, getTopStrengths } from "@/lib/scoring/strengths";

describe("earnedRelics", () => {
  it("awards nothing for a single demonstration", () => {
    expect(earnedRelics(["Empathy"])).toEqual([]);
  });

  it("awards a relic at exactly the threshold", () => {
    const relics = earnedRelics(["Empathy", "Empathy"]);
    expect(relics).toHaveLength(1);
    expect(relics[0].name).toBe("Healer's Kit");
    expect(relics[0].timesShown).toBe(RELIC_THRESHOLD);
  });

  it("records how many times the trait was shown, for the 'why'", () => {
    const relics = earnedRelics(["Empathy", "Empathy", "Empathy"]);
    expect(relics[0].timesShown).toBe(3);
  });

  it("awards several relics, most demonstrated first", () => {
    const relics = earnedRelics([
      "Command", "Command",
      "Analytical", "Analytical", "Analytical",
    ]);
    expect(relics.map((r) => r.name)).toEqual([
      "Truthseeker's Lens",
      "Rallying Banner",
    ]);
  });

  it("ignores a strength it has no relic for rather than crashing", () => {
    expect(earnedRelics(["Nonsense", "Nonsense"])).toEqual([]);
  });

  it("returns nothing for no signals", () => {
    expect(earnedRelics([])).toEqual([]);
  });
});

/**
 * The dashboard never sees the raw signal list -- it is client-only state
 * that dies with the quest. It sees what was written to students.self_map.
 * These tests use that shape, because a suite that only ever feeds
 * earnedRelics the raw list passed happily while every student saw an empty
 * shelf.
 */
describe("relics on the dashboard's actual input", () => {
  /** A plausible quest: Empathy 3x, Command 2x, Achiever once. */
  const signals = [
    "Empathy", "Command", "Empathy", "Achiever", "Command", "Empathy",
  ];

  it("is empty when fed the deduped top-5, which is what used to be passed", () => {
    // getTopStrengths dedupes, so every entry appears exactly once and no
    // strength can ever reach RELIC_THRESHOLD. This is the defect: the old
    // dashboard call site passed exactly this.
    const deduped = getTopStrengths(signals, 5);
    expect(new Set(deduped).size).toBe(deduped.length);
    expect(earnedRelics(deduped)).toEqual([]);
  });

  it("awards relics from the counts persisted in self_map", () => {
    const selfMap = {
      curiosities: ["space"],
      clarity: 3,
      [STRENGTH_COUNTS_KEY]: accumulateStrengths(signals),
    };
    const relics = relicsFromSelfMap(selfMap);
    expect(relics.map((r) => r.name)).toEqual([
      "Healer's Kit",
      "Rallying Banner",
    ]);
    expect(relics[0].timesShown).toBe(3);
  });

  it("agrees with the in-quest reveal, so the two screens cannot disagree", () => {
    expect(relicsFromSelfMap({ [STRENGTH_COUNTS_KEY]: accumulateStrengths(signals) }))
      .toEqual(earnedRelics(signals));
  });

  it("shows nothing rather than crashing on a legacy or corrupt self_map", () => {
    expect(relicsFromSelfMap(null)).toEqual([]);
    expect(relicsFromSelfMap({ curiosities: ["space"] })).toEqual([]);
    expect(relicsFromSelfMap({ [STRENGTH_COUNTS_KEY]: "nonsense" })).toEqual([]);
    expect(relicsFromCounts({ Empathy: "3" as unknown as number })).toEqual([]);
    expect(relicsFromCounts({ Empathy: Number.NaN })).toEqual([]);
  });
});

describe("relics never touch a score", () => {
  it("leaves interest scores identical whether or not relics were earned", () => {
    const answers = [4, 4, 3];
    const before = calculateRiasecType(answers);
    // Earning relics is a read of the same data, never a write.
    earnedRelics(["Empathy", "Empathy", "Command", "Command"]);
    expect(calculateRiasecType(answers)).toBe(before);
  });
});
