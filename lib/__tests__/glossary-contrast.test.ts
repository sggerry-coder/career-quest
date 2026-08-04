/**
 * The popup is a new surface, so its floors are measured rather than assumed.
 *
 * Everything else on the dashboard was measured in the sweep that produced
 * lib/a11y/contrast.ts, and the finding there was that eyeballing translucent
 * white on a dark page is not a skill anybody has: the tiers in this app ran
 * from 1.44:1 to 3.80:1 while looking fine. This card introduces a background
 * that exists nowhere else, so every text pairing on it is computed here.
 *
 * The card is deliberately opaque. A `bg-white/5` card like the ones around it
 * would make the body text's contrast depend on whichever chart happened to be
 * behind the popup at the time, which is not a number anyone can hold.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AA_TEXT,
  AA_LARGE_OR_NON_TEXT,
  WHITE,
  compositeOver,
  contrastRatio,
  parseHex,
} from "@/lib/a11y/contrast";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const SOURCE = readFileSync(
  join(REPO_ROOT, "components", "ui", "glossary-term.tsx"),
  "utf8"
);

/** The popup card's own background, read out of the component. */
const SURFACE = "#1a1035";

describe("the definition popup's surface", () => {
  it("is the opaque colour these ratios were computed against", () => {
    // If someone swaps the card to a tint or a different hex, every number
    // below is measuring a surface that is no longer on the screen. Fail here
    // rather than keep reporting a stale 13:1.
    expect(SOURCE).toContain(`bg-[${SURFACE}]`);
  });

  it("carries the heading well clear of the body floor", () => {
    // Pure white on the card.
    const ratio = contrastRatio(WHITE, parseHex(SURFACE));
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
    expect(ratio).toBeCloseTo(17.95, 1);
  });

  it("carries the definition itself well clear of the body floor", () => {
    // text-white/85 -- the definition is the one thing on this card that has
    // to be readable, so it does not sit on a quiet tier.
    const body = compositeOver(WHITE, 0.85, parseHex(SURFACE));
    const ratio = contrastRatio(body, parseHex(SURFACE));
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
    expect(ratio).toBeCloseTo(13.07, 1);
  });

  it("keeps the dismiss button's label readable", () => {
    // "Got it" is pure white on the same card.
    expect(contrastRatio(WHITE, parseHex(SURFACE))).toBeGreaterThanOrEqual(
      AA_TEXT
    );
  });

  it("draws a border the card can actually be found by", () => {
    // The card is the same colour family as the page it dims, so its own fill
    // gives it almost nothing: measured against the black/70 backdrop it is
    // 1.13:1, which is invisible. The border is the entire boundary, so it is
    // held to the 3:1 floor for meaningful non-text.
    const backdrop = compositeOver([0, 0, 0], 0.7, parseHex("#1a1035"));
    expect(contrastRatio(parseHex(SURFACE), backdrop)).toBeLessThan(
      AA_LARGE_OR_NON_TEXT
    );

    const border = compositeOver(WHITE, 0.4, parseHex(SURFACE));
    expect(contrastRatio(border, backdrop)).toBeGreaterThanOrEqual(
      AA_LARGE_OR_NON_TEXT
    );
    expect(SOURCE).toContain("border border-white/40 bg-[#1a1035]");
  });

  it("would still fail the /20 border that shipped first", () => {
    // Guards the guard: /20 looked fine and measured 2.08:1. The suite has to
    // be able to see it failing, or raising it was luck rather than a fix.
    const backdrop = compositeOver([0, 0, 0], 0.7, parseHex("#1a1035"));
    const weak = compositeOver(WHITE, 0.2, parseHex(SURFACE));
    expect(contrastRatio(weak, backdrop)).toBeLessThan(AA_LARGE_OR_NON_TEXT);
  });
});

describe("the triggers that open it", () => {
  it("uses no text tier the app-wide sweep would reject", () => {
    // lib/__tests__/text-contrast.test.ts scans app/ and components/ for
    // exactly this, so the assertion is duplicated rather than trusted: this
    // file is where someone editing the popup will look.
    for (const match of SOURCE.matchAll(/text-white\/(\d{1,3})\b/g)) {
      expect(
        Number(match[1]) / 100,
        `${match[0]} in components/ui/glossary-term.tsx`
      ).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("marks the '?' hint with a border that is visible on a card", () => {
    // The hint's whole affordance is a 20px ring; below the non-text floor it
    // is a "?" floating in space. `bg-white/5` card on the lighter gradient
    // stop, the worst backdrop it lands on.
    const card = compositeOver(WHITE, 0.05, parseHex("#1a1035"));
    const border = compositeOver(WHITE, 0.4, card);
    expect(contrastRatio(border, card)).toBeGreaterThanOrEqual(
      AA_LARGE_OR_NON_TEXT
    );
    expect(SOURCE).toContain("border-white/40");
  });
});
