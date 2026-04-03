import { describe, it, expect } from "vitest";
import { accumulateStrengths, getTopStrengths } from "../strengths";

describe("accumulateStrengths", () => {
  it("counts frequency of each strength signal", () => {
    const signals = ["Achiever", "Ideation", "Achiever", "Empathy", "Achiever"];
    const result = accumulateStrengths(signals);
    expect(result).toEqual({
      Achiever: 3,
      Ideation: 1,
      Empathy: 1,
    });
  });

  it("returns empty object for empty input", () => {
    expect(accumulateStrengths([])).toEqual({});
  });

  it("handles single signal", () => {
    expect(accumulateStrengths(["Command"])).toEqual({ Command: 1 });
  });
});

describe("getTopStrengths", () => {
  it("returns top N strength categories sorted by count descending", () => {
    const signals = [
      "Achiever",
      "Ideation",
      "Achiever",
      "Empathy",
      "Achiever",
      "Ideation",
    ];
    const top2 = getTopStrengths(signals, 2);
    expect(top2).toEqual(["Achiever", "Ideation"]);
  });

  it("returns all if n exceeds unique count", () => {
    const signals = ["Achiever", "Empathy"];
    const top5 = getTopStrengths(signals, 5);
    expect(top5).toEqual(["Achiever", "Empathy"]);
  });

  it("returns empty array for empty input", () => {
    expect(getTopStrengths([], 3)).toEqual([]);
  });

  it("breaks ties by preserving first-seen order", () => {
    const signals = ["Ideation", "Empathy", "Command"];
    // All have count 1 — should preserve order
    const top3 = getTopStrengths(signals, 3);
    expect(top3).toEqual(["Ideation", "Empathy", "Command"]);
  });
});

describe("Boundary values", () => {
  it("getTopStrengths with n=0 returns empty array", () => {
    const signals = ["Achiever", "Ideation", "Achiever"];
    expect(getTopStrengths(signals, 0)).toEqual([]);
  });

  it("accumulateStrengths with single signal repeated many times accumulates correctly", () => {
    const signals = Array(100).fill("Achiever");
    const result = accumulateStrengths(signals);
    expect(result).toEqual({ Achiever: 100 });
  });

  it("getTopStrengths with single signal repeated returns it as top", () => {
    const signals = Array(50).fill("Empathy");
    const top5 = getTopStrengths(signals, 5);
    expect(top5).toEqual(["Empathy"]);
  });
});
