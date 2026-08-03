import type { ThemeName } from "@/lib/theme";
import type { CharacterClassId } from "@/lib/character/classes";

/**
 * One palette per class. Mage keeps the original purple-teal values and
 * Paladin keeps blue-indigo's, so two of the eight are the themes the app
 * already shipped.
 */
export const CLASS_THEME: Record<CharacterClassId, ThemeName> = {
  wanderer: "wanderer-slate",
  mage: "purple-teal",
  guardian: "guardian-jade",
  paladin: "paladin-steel",
  vanguard: "vanguard-gold",
  bard: "bard-magenta",
  warsmith: "warsmith-copper",
  rogue: "rogue-teal",
};

export function themeForCharacterClass(id: CharacterClassId): ThemeName {
  return CLASS_THEME[id];
}
