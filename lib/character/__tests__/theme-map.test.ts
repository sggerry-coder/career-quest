import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CLASS_THEME, themeForCharacterClass } from "@/lib/character/theme-map";
import {
  CHARACTER_CLASSES,
  type CharacterClassId,
} from "@/lib/character/classes";
import {
  themes,
  classDefinitions,
  getThemeForClass,
  type ThemeName,
} from "@/lib/theme";

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

  it("is the only class -> theme map: narration agrees with it by construction", () => {
    // theme-map.ts used to be imported by nothing but this file while
    // applyClassTheme routed through classDefinitions[].theme. Two parallel
    // tables that agreed by luck.
    for (const def of classDefinitions) {
      expect(def.theme, `${def.id} narration theme`).toBe(
        themeForCharacterClass(def.id)
      );
    }
  });

  it("resolves a class's palette through the map, Wanderer for anything else", () => {
    for (const id of Object.keys(CHARACTER_CLASSES) as CharacterClassId[]) {
      expect(getThemeForClass(id).name).toBe(themeForCharacterClass(id));
    }
    // A retired id, an empty column, junk -- no colour has been earned.
    expect(getThemeForClass("sorceress").name).toBe("wanderer-slate");
    expect(getThemeForClass("").name).toBe("wanderer-slate");
  });

  it("syncs theme values between app/globals.css and lib/theme.ts", () => {
    // Read the CSS file from disk
    const cssPath = new URL("../../../app/globals.css", import.meta.url);
    const cssContent = readFileSync(cssPath, "utf8");

    // Parse CSS theme blocks: extract [data-theme="NAME"] { ... }
    const cssThemeRegex = /\[data-theme="([^"]+)"\]\s*\{([^}]+)\}/g;
    const cssThemes: Record<string, Record<string, string>> = {};

    let match;
    while ((match = cssThemeRegex.exec(cssContent)) !== null) {
      const themeName = match[1];
      const cssBlock = match[2];

      // Extract CSS variables from the block
      const primaryMatch = cssBlock.match(/--cq-primary:\s*([^;]+);/);
      const accentMatch = cssBlock.match(/--cq-accent:\s*([^;]+);/);
      const radiusMatch = cssBlock.match(/--cq-radius:\s*([^;]+);/);

      if (primaryMatch && accentMatch && radiusMatch) {
        cssThemes[themeName] = {
          primary: primaryMatch[1].trim(),
          accent: accentMatch[1].trim(),
          radius: radiusMatch[1].trim(),
        };
      }
    }

    // Normalize hex color to lowercase for case-insensitive comparison
    const normalizeHex = (hex: string): string => {
      return hex.toLowerCase();
    };

    // Verify every theme in themes record has matching CSS block
    for (const [themeName, themeConfig] of Object.entries(themes) as [
      ThemeName,
      (typeof themes)[ThemeName],
    ][]) {
      expect(
        cssThemes[themeName],
        `theme "${themeName}" must have a [data-theme] block in app/globals.css`
      ).toBeDefined();

      const cssBlock = cssThemes[themeName];

      // Check primary colour (case-insensitive hex)
      expect(
        normalizeHex(cssBlock.primary),
        `theme "${themeName}" CSS --cq-primary must match TypeScript primary`
      ).toBe(normalizeHex(themeConfig.primary));

      // Check accent colour (case-insensitive hex)
      expect(
        normalizeHex(cssBlock.accent),
        `theme "${themeName}" CSS --cq-accent must match TypeScript accent`
      ).toBe(normalizeHex(themeConfig.accent));

      // Check border radius
      expect(
        cssBlock.radius,
        `theme "${themeName}" CSS --cq-radius must match TypeScript borderRadius`
      ).toBe(themeConfig.borderRadius);
    }
  });
});
