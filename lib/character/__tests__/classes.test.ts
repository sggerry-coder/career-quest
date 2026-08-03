import { describe, it, expect } from "vitest";
import {
  deriveCharacterClass,
  characterClassDisplayName,
  CHARACTER_CLASSES,
} from "@/lib/character/classes";

/** Scores that make deriveClassLabel return a single strong type. */
const strongHelper = { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 };
/** Two strong types, third well behind → dual class. */
const helperAndInvestigator = { R: 10, I: 80, A: 20, S: 90, E: 20, C: 10 };
/** Nothing above 40 → not enough signal. */
const noSignal = { R: 10, I: 20, A: 20, S: 30, E: 20, C: 10 };
/** Middling with no clear lead → genuinely open. */
const open = { R: 45, I: 55, A: 52, S: 50, E: 48, C: 45 };

describe("deriveCharacterClass", () => {
  it("names a single strong interest", () => {
    const d = deriveCharacterClass(strongHelper);
    expect(d.primary).toBe("guardian");
    expect(d.secondary).toBeNull();
    expect(d.isNamed).toBe(true);
  });

  it("names two strong interests as a dual class", () => {
    const d = deriveCharacterClass(helperAndInvestigator);
    expect(d.primary).toBe("guardian");
    expect(d.secondary).toBe("mage");
    expect(d.isNamed).toBe(true);
  });

  it("returns Wanderer, not a guess, when there is not enough signal", () => {
    const d = deriveCharacterClass(noSignal);
    expect(d.primary).toBe("wanderer");
    expect(d.isNamed).toBe(false);
  });

  it("returns Rogue for a genuinely open profile", () => {
    const d = deriveCharacterClass(open);
    expect(d.primary).toBe("rogue");
    // Open is a real answer, so the student IS named.
    expect(d.isNamed).toBe(true);
  });

  it("returns Wanderer for empty scores", () => {
    expect(deriveCharacterClass({}).primary).toBe("wanderer");
    expect(deriveCharacterClass({}).isNamed).toBe(false);
  });
});

describe("characterClassDisplayName", () => {
  it("joins a dual class with a hyphen in quest tone", () => {
    const d = deriveCharacterClass(helperAndInvestigator);
    expect(characterClassDisplayName(d, "quest")).toBe("Guardian-Mage");
  });

  it("uses plain names in explorer tone", () => {
    const d = deriveCharacterClass(strongHelper);
    expect(characterClassDisplayName(d, "explorer")).toBe("Helper");
  });
});

describe("CHARACTER_CLASSES", () => {
  it("has a quest and explorer name plus an icon for all eight", () => {
    const ids = Object.keys(CHARACTER_CLASSES);
    expect(ids).toHaveLength(8);
    for (const id of ids) {
      const c = CHARACTER_CLASSES[id as keyof typeof CHARACTER_CLASSES];
      expect(c.name.quest.length).toBeGreaterThan(0);
      expect(c.name.explorer.length).toBeGreaterThan(0);
      expect(c.icon.length).toBeGreaterThan(0);
    }
  });
});
