/**
 * Every palette's primary is a button background with white label text.
 *
 * The class palettes shipped under a comment claiming they cleared ~4.5:1;
 * three of them measured 3.68-3.77:1 and the app's default purple measured
 * 4.23:1. Nothing computed the number, so nothing noticed. This does.
 */
import { describe, it, expect } from "vitest";
import { themes, type ThemeName } from "@/lib/theme";
// The maths moved to lib/a11y/contrast so the text tiers, the class chip and
// the focus ring could be measured against the same implementation rather
// than a second copy of it. See lib/__tests__/text-contrast.test.ts.
import { contrastWithWhite, AA_TEXT } from "@/lib/a11y/contrast";

/** WCAG AA for normal-size text. */
const MIN_RATIO = AA_TEXT;

describe("contrastWithWhite", () => {
  it("agrees with known reference values", () => {
    // White on white is 1:1; black on white is 21:1.
    expect(contrastWithWhite("#ffffff")).toBeCloseTo(1, 2);
    expect(contrastWithWhite("#000000")).toBeCloseTo(21, 1);
    // #767676 is the canonical "just passes AA on white" grey, 4.54:1.
    expect(contrastWithWhite("#767676")).toBeCloseTo(4.54, 1);
  });

  it("would still fail the primaries that were shipped broken", () => {
    // Guards the guard: if the maths ever silently returned a large number,
    // the palette assertions below would pass vacuously.
    for (const wasBroken of ["#059669", "#0d9488", "#3b82f6", "#8b5cf6"]) {
      expect(contrastWithWhite(wasBroken)).toBeLessThan(MIN_RATIO);
    }
  });
});

describe("every theme's primary carries white text", () => {
  for (const name of Object.keys(themes) as ThemeName[]) {
    it(`${name} clears ${MIN_RATIO}:1`, () => {
      const ratio = contrastWithWhite(themes[name].primary);
      expect(
        ratio,
        `${name} primary ${themes[name].primary} is ${ratio.toFixed(2)}:1 ` +
          `against white -- darken it until it clears ${MIN_RATIO}:1`
      ).toBeGreaterThanOrEqual(MIN_RATIO);
    });
  }

  it("keeps every palette visually distinct", () => {
    // Darkening for contrast must not collapse two classes onto the same
    // colour -- the palette is how a student recognises their class.
    const primaries = Object.values(themes).map((t) => t.primary);
    expect(new Set(primaries).size).toBe(primaries.length);
  });
});
