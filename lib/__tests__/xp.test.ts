/**
 * Locks in the honest XP / reward model (P2.2):
 * calculateXp uses its currentSession argument, the milestone is scaled to
 * what is actually earnable in v1 (450), and cosmetic unlocks derive from XP.
 */
import { describe, it, expect } from "vitest";
import {
  calculateXp,
  getCurrentMilestone,
  getUnlockedCosmetics,
  COSMETIC_UNLOCKS,
} from "@/lib/xp";

describe("calculateXp", () => {
  it("awards character creation XP only before Session 1 completes", () => {
    expect(calculateXp(0, false)).toBe(100);
    expect(calculateXp(1, false)).toBe(100);
  });

  it("awards the full Session 1 XP on completion", () => {
    expect(calculateXp(1, true)).toBe(450);
  });

  it("uses currentSession defensively when the flag and session disagree", () => {
    // Completed students always have current_session >= 1; treat a stale 0
    // as one completed session rather than dropping earned XP.
    expect(calculateXp(0, true)).toBe(450);
  });
});

describe("getCurrentMilestone", () => {
  it("scales the bar to Chapter 1's earnable total, not a fake 1000", () => {
    expect(getCurrentMilestone(0)).toEqual({ label: "Chapter 1", maxXp: 450 });
    expect(getCurrentMilestone(1)).toEqual({ label: "Chapter 1", maxXp: 450 });
  });

  it("makes a completed Chapter 1 read as full", () => {
    const milestone = getCurrentMilestone(1);
    expect(calculateXp(1, true)).toBe(milestone.maxXp);
  });
});

describe("getUnlockedCosmetics", () => {
  it("unlocks tiers exactly at their thresholds", () => {
    expect(getUnlockedCosmetics(0)).toEqual([]);
    expect(getUnlockedCosmetics(149)).toEqual([]);
    expect(getUnlockedCosmetics(150)).toEqual(["background"]);
    expect(getUnlockedCosmetics(300)).toEqual(["background", "accent"]);
    expect(getUnlockedCosmetics(450)).toEqual([
      "background",
      "accent",
      "gold_trim",
    ]);
  });

  it("keeps every tier within the Chapter 1 milestone", () => {
    const { maxXp } = getCurrentMilestone(1);
    for (const tier of COSMETIC_UNLOCKS) {
      expect(tier.xp).toBeLessThanOrEqual(maxXp);
    }
  });
});
