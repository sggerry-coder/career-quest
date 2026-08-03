import { describe, it, expect } from "vitest";
import { CLASS_THEME, themeForCharacterClass } from "@/lib/character/theme-map";
import { CHARACTER_CLASSES } from "@/lib/character/classes";
import { themes } from "@/lib/theme";

describe("class palettes", () => {
  it("gives every class its own theme, with no silent fallback", () => {
    const ids = Object.keys(CHARACTER_CLASSES);
    for (const id of ids) {
      const theme = themeForCharacterClass(id as keyof typeof CHARACTER_CLASSES);
      expect(themes[theme], `${id} must map to a real palette`).toBeDefined();
    }
  });

  it("gives each class a distinct palette", () => {
    const used = Object.values(CLASS_THEME);
    expect(new Set(used).size).toBe(used.length);
  });

  it("starts the Wanderer colourless", () => {
    expect(themeForCharacterClass("wanderer")).toBe("wanderer-slate");
    expect(themes["wanderer-slate"].primary).toBe("#475569");
  });

  it("keeps corner radius as part of a class's character", () => {
    // Paladin brings order: near-square. Bard is fluid: very round.
    expect(themes[themeForCharacterClass("paladin")].borderRadius).toBe("4px");
    expect(themes[themeForCharacterClass("bard")].borderRadius).toBe("20px");
  });
});
