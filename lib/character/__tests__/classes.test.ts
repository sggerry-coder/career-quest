import { describe, it, expect } from "vitest";
import {
  deriveCharacterClass,
  characterClassDisplayName,
  parseCharacterClass,
  serializeCharacterClass,
  CHARACTER_CLASSES,
  type CharacterClassId,
} from "@/lib/character/classes";
import { deriveClassLabel } from "@/lib/scoring/riasec";

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

/**
 * T1: the whole mapping table, not the two entries that happened to be
 * covered. A swapped row here silently hands a student the wrong class --
 * a Maker greeted as a Bard -- and nothing else in the system would notice.
 */
describe("every deriveClassLabel outcome maps to the right class", () => {
  /** One type dominant, everything else far behind. */
  function only(type: string): Record<string, number> {
    const scores: Record<string, number> = {
      R: 10, I: 10, A: 10, S: 10, E: 10, C: 10,
    };
    scores[type] = 90;
    return scores;
  }

  const table: Array<{
    riasecType: string;
    label: string;
    classId: CharacterClassId;
    quest: string;
    explorer: string;
  }> = [
    { riasecType: "R", label: "MAKER", classId: "warsmith", quest: "Warsmith", explorer: "Maker" },
    { riasecType: "I", label: "INVESTIGATOR", classId: "mage", quest: "Mage", explorer: "Investigator" },
    { riasecType: "A", label: "CREATOR", classId: "bard", quest: "Bard", explorer: "Creator" },
    { riasecType: "S", label: "HELPER", classId: "guardian", quest: "Guardian", explorer: "Helper" },
    { riasecType: "E", label: "LEADER", classId: "vanguard", quest: "Vanguard", explorer: "Leader" },
    { riasecType: "C", label: "ORGANIZER", classId: "paladin", quest: "Paladin", explorer: "Organizer" },
  ];

  for (const row of table) {
    it(`${row.riasecType} -> ${row.label} -> ${row.classId}`, () => {
      const scores = only(row.riasecType);
      // Guard the fixture: if deriveClassLabel ever stops producing this
      // label the mapping assertion below would pass vacuously.
      expect(deriveClassLabel(scores)).toBe(row.label);

      const derived = deriveCharacterClass(scores);
      expect(derived.primary).toBe(row.classId);
      expect(derived.isNamed).toBe(true);
      expect(characterClassDisplayName(derived, "quest")).toBe(row.quest);
      expect(characterClassDisplayName(derived, "explorer")).toBe(row.explorer);
    });
  }

  it("maps the two non-interest outcomes", () => {
    expect(deriveClassLabel(noSignal)).toBe("SEEKER");
    expect(deriveCharacterClass(noSignal).primary).toBe("wanderer");
    expect(deriveClassLabel(open)).toBe("EXPLORER");
    expect(deriveCharacterClass(open).primary).toBe("rogue");
  });
});

/**
 * avatar_class is the only place a resolved class survives a reload, and it
 * is a text column -- a hyphenated dual needs no migration.
 */
describe("serializeCharacterClass / parseCharacterClass", () => {
  it("keeps the second half of a dual class", () => {
    const dual = deriveCharacterClass(helperAndInvestigator);
    expect(serializeCharacterClass(dual)).toBe("guardian-mage");
    expect(parseCharacterClass("guardian-mage")).toEqual(dual);
    expect(characterClassDisplayName(parseCharacterClass("guardian-mage"), "quest"))
      .toBe("Guardian-Mage");
  });

  it("round-trips a single class", () => {
    const single = deriveCharacterClass(strongHelper);
    expect(serializeCharacterClass(single)).toBe("guardian");
    expect(parseCharacterClass("guardian")).toEqual(single);
  });

  it("falls back to Wanderer rather than crashing on anything else", () => {
    for (const stored of [
      null,
      undefined,
      "",
      "sorceress",          // a retired id from before the emergent system
      "guardian-sorceress", // half-recognisable
      "-",
      "wanderer",
    ]) {
      const parsed = parseCharacterClass(stored);
      expect(parsed.isNamed, `${String(stored)} must not name a student`).toBe(
        stored === "guardian-sorceress"
      );
    }
    // A recognisable primary with an unusable secondary keeps the primary and
    // drops the half we cannot read.
    expect(parseCharacterClass("guardian-sorceress")).toEqual({
      primary: "guardian",
      secondary: null,
      isNamed: true,
    });
    expect(parseCharacterClass("sorceress").primary).toBe("wanderer");
    expect(parseCharacterClass(null).primary).toBe("wanderer");
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
