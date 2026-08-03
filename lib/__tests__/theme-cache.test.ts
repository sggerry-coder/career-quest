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
  THEME_CACHE_KEY,
  TONE_CACHE_KEY,
} from "@/lib/theme";

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
});
