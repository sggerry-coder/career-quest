import { describe, it, expect } from "vitest";
import { earnedRelics, RELIC_THRESHOLD } from "@/lib/character/relics";
import { calculateRiasecType } from "@/lib/scoring/riasec";

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

describe("relics never touch a score", () => {
  it("leaves interest scores identical whether or not relics were earned", () => {
    const answers = [4, 4, 3];
    const before = calculateRiasecType(answers);
    // Earning relics is a read of the same data, never a write.
    earnedRelics(["Empathy", "Empathy", "Command", "Command"]);
    expect(calculateRiasecType(answers)).toBe(before);
  });
});
