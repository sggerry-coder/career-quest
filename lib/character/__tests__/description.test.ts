import { describe, it, expect } from "vitest";
import { describeCharacter } from "@/lib/character/description";
import { deriveCharacterClass } from "@/lib/character/classes";

const guardian = deriveCharacterClass({ R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 });
const unformed = deriveCharacterClass({ R: 10, I: 20, A: 20, S: 30, E: 20, C: 10 });

/** Well past the still-emerging threshold of 35. */
const clearMbti = { EI: -80, SN: -60, TF: -70, JP: -50 };
/** All inside the threshold — nothing may be asserted. */
const unclearMbti = { EI: 10, SN: -5, TF: 0, JP: 20 };

const clearValues = { security_adventure: -80, income_impact: 0, solo_team: -70 };
const flatValues = { security_adventure: 0, income_impact: 0, solo_team: 0 };

describe("describeCharacter", () => {
  it("leads with the class", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: clearMbti, values: clearValues,
    });
    expect(text.startsWith("A Guardian")).toBe(true);
  });

  it("describes how they go about it when the signal is clear", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: clearMbti, values: clearValues,
    });
    expect(text).toContain("alone");
    expect(text).toContain("steady ground");
  });

  it("omits a personality trait that is still emerging rather than asserting it", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: unclearMbti, values: clearValues,
    });
    expect(text).not.toContain("alone");
    expect(text).not.toContain("out loud");
  });

  it("says so plainly when nothing is certain yet", () => {
    const text = describeCharacter({
      derived: unformed, tone: "quest", mbti: unclearMbti, values: flatValues,
    });
    expect(text).toContain("Still taking shape");
    // It must not invent a character.
    expect(text).not.toContain("A Guardian");
  });

  it("uses plain names in explorer tone", () => {
    const text = describeCharacter({
      derived: guardian, tone: "explorer", mbti: clearMbti, values: clearValues,
    });
    expect(text.startsWith("A Helper")).toBe(true);
  });

  it("never leaves a dangling connector when only one trait is known", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: clearMbti, values: flatValues,
    });
    expect(text.trim().endsWith(".")).toBe(true);
    expect(text).not.toContain(" and .");
    expect(text).not.toContain(", .");
  });
});
