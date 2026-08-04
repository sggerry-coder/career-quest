import { deriveClassLabel } from "@/lib/scoring/riasec";

/**
 * The class a student becomes, derived from what they are drawn to.
 *
 * Not chosen. Character creation used to ask for an avatar class before the
 * app knew anything about the student, and the answer drove the theme for the
 * whole quest. This layer renames what deriveClassLabel already computes from
 * their actual answers — no new scoring maths.
 */

export type CharacterClassId =
  | "warsmith"
  | "mage"
  | "bard"
  | "guardian"
  | "vanguard"
  | "paladin"
  | "rogue"
  | "wanderer";

export interface CharacterClass {
  id: CharacterClassId;
  name: { quest: string; explorer: string };
  icon: string;
}

export const CHARACTER_CLASSES: Record<CharacterClassId, CharacterClass> = {
  warsmith: { id: "warsmith", name: { quest: "Warsmith", explorer: "Maker" }, icon: "\u{1F528}" },
  mage: { id: "mage", name: { quest: "Mage", explorer: "Investigator" }, icon: "\u{1F52E}" },
  bard: { id: "bard", name: { quest: "Bard", explorer: "Creator" }, icon: "\u{1F3AD}" },
  guardian: { id: "guardian", name: { quest: "Guardian", explorer: "Helper" }, icon: "\u{1F6E1}\u{FE0F}" },
  vanguard: { id: "vanguard", name: { quest: "Vanguard", explorer: "Leader" }, icon: "\u{1F6A9}" },
  paladin: { id: "paladin", name: { quest: "Paladin", explorer: "Organizer" }, icon: "\u{2696}\u{FE0F}" },
  rogue: { id: "rogue", name: { quest: "Rogue", explorer: "Explorer" }, icon: "\u{1F5DD}\u{FE0F}" },
  wanderer: { id: "wanderer", name: { quest: "Wanderer", explorer: "Still forming" }, icon: "\u{1F9ED}" },
};

/** deriveClassLabel's vocabulary → ours. */
const LABEL_TO_CLASS: Record<string, CharacterClassId> = {
  MAKER: "warsmith",
  INVESTIGATOR: "mage",
  CREATOR: "bard",
  HELPER: "guardian",
  LEADER: "vanguard",
  ORGANIZER: "paladin",
  EXPLORER: "rogue",
  SEEKER: "wanderer",
};

/** True when `value` is one of the eight class ids. */
export function isCharacterClassId(
  value: string | null | undefined
): value is CharacterClassId {
  return typeof value === "string" && Object.hasOwn(CHARACTER_CLASSES, value);
}

export interface DerivedClass {
  primary: CharacterClassId;
  secondary: CharacterClassId | null;
  /**
   * False only for Wanderer. Rogue counts as named: "open to anything" is a
   * real answer, whereas Wanderer means we do not know yet.
   */
  isNamed: boolean;
}

export function deriveCharacterClass(
  riasec: Record<string, number>
): DerivedClass {
  const label = deriveClassLabel(riasec);
  const [firstLabel, secondLabel] = label.split("-");

  const primary = LABEL_TO_CLASS[firstLabel] ?? "wanderer";
  const secondary = secondLabel ? LABEL_TO_CLASS[secondLabel] ?? null : null;

  return { primary, secondary, isNamed: primary !== "wanderer" };
}

export function characterClassDisplayName(
  derived: DerivedClass,
  tone: "quest" | "explorer"
): string {
  const first = CHARACTER_CLASSES[derived.primary].name[tone];
  if (!derived.secondary) return first;
  return `${first}-${CHARACTER_CLASSES[derived.secondary].name[tone]}`;
}
