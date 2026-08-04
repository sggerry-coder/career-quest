/**
 * @vitest-environment jsdom
 *
 * Locks in the instant-theme cache (P2.5): applyClassTheme sets data-theme
 * AND caches the theme name (in the same key the layout's inline pre-paint
 * script reads), tone caching round-trips, and invalid values are rejected.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  applyClassTheme,
  cacheThemeName,
  readCachedThemeName,
  cacheTone,
  readCachedTone,
  themes,
  THEME_CACHE_KEY,
  TONE_CACHE_KEY,
} from "@/lib/theme";
import { THEME_INIT_SCRIPT_NAMES, buildThemeInitScript } from "@/lib/theme-init-script";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("instant theme cache", () => {
  it("applyClassTheme sets data-theme and caches the theme name", () => {
    applyClassTheme("mage"); // purple-teal class

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "purple-teal"
    );
    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toBe("purple-teal");
    expect(readCachedThemeName()).toBe("purple-teal");
  });

  it("falls back to blue-indigo for unknown classes and still caches", () => {
    applyClassTheme("not-a-class");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "blue-indigo"
    );
    expect(readCachedThemeName()).toBe("blue-indigo");
  });

  it("round-trips a cached theme name and rejects garbage", () => {
    cacheThemeName("purple-teal");
    expect(readCachedThemeName()).toBe("purple-teal");

    window.localStorage.setItem(THEME_CACHE_KEY, "hot-pink-lasers");
    expect(readCachedThemeName()).toBeNull();

    window.localStorage.removeItem(THEME_CACHE_KEY);
    expect(readCachedThemeName()).toBeNull();
  });

  it("round-trips the tone and rejects garbage", () => {
    cacheTone("explorer");
    expect(window.localStorage.getItem(TONE_CACHE_KEY)).toBe("explorer");
    expect(readCachedTone()).toBe("explorer");

    cacheTone("quest");
    expect(readCachedTone()).toBe("quest");

    window.localStorage.setItem(TONE_CACHE_KEY, "pirate");
    expect(readCachedTone()).toBeNull();
  });

  it("uses the exact key the layout inline script reads", () => {
    // The pre-paint script in app/layout.tsx reads localStorage["cq-theme"]
    // literally; this locks the contract between the two.
    expect(THEME_CACHE_KEY).toBe("cq-theme");
  });

  it("the layout's pre-paint script whitelists every theme, including all 8 class palettes", () => {
    // Regression test: the inline script used to hardcode only the 3
    // original theme names, so 7 of the 8 class palettes never restored
    // before first paint -- a returning named student saw a flash of the
    // wrong colour every load. This fails if a theme is ever added to
    // `themes` without also reaching the pre-paint script's whitelist.
    const allThemeNames = Object.keys(themes);
    expect(allThemeNames.length).toBeGreaterThanOrEqual(10);
    for (const name of allThemeNames) {
      expect(THEME_INIT_SCRIPT_NAMES).toContain(name);
    }
    // And nothing extra that isn't a real theme.
    for (const name of THEME_INIT_SCRIPT_NAMES) {
      expect(allThemeNames).toContain(name);
    }

    // The generated script string itself (what actually ships to the
    // browser) must literally contain every theme name, not just the
    // exported constant used to build it.
    const script = buildThemeInitScript();
    for (const name of allThemeNames) {
      expect(script).toContain(`"${name}"`);
    }
  });
});
