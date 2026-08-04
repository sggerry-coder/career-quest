/**
 * The pairings lib/__tests__/contrast.test.ts never looked at.
 *
 * That file measured one thing: a palette primary under white button text.
 * Everything else on the dark background was assumed. Measured, the app's
 * meaningful text ran from 1.44:1 (a dimension name inside an opacity-40
 * wrapper) to 3.80:1 (`text-white/40`), the class name in the reveal was
 * 1.85:1 for a Wanderer, and the keyboard focus ring was 2.37:1.
 *
 * Two kinds of assertion here:
 *   1. the design tokens and palette pairings, computed;
 *   2. a source scan, so a new `text-white/30` cannot be typed back in.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { themes, type ThemeName } from "@/lib/theme";
import {
  AA_TEXT,
  AA_LARGE_OR_NON_TEXT,
  BG_BOTTOM,
  BG_TOP,
  MIN_WHITE_TEXT_ALPHA,
  WHITE,
  compositeOver,
  contrastRatio,
  parseHex,
  whiteAlphaContrast,
} from "@/lib/a11y/contrast";

/** A `bg-white/5` card on the lighter gradient stop: the worst backdrop. */
const CARD = compositeOver(WHITE, 0.05, BG_BOTTOM);
/** The `bg-white/10` track every chart bar sits in, on that card. */
const TRACK = compositeOver(WHITE, 0.1, CARD);

const REPO_ROOT = join(import.meta.dirname, "..", "..");

/** Every .tsx under app/ and components/, tests excluded. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (entry.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

describe("the text tiers the app actually uses", () => {
  it("keeps every white-alpha tier at or above the floor over a card", () => {
    // The floor is not a style preference: /40 measures 3.69:1 here.
    expect(whiteAlphaContrast(0.4, CARD)).toBeLessThan(AA_TEXT);
    expect(whiteAlphaContrast(MIN_WHITE_TEXT_ALPHA, CARD)).toBeGreaterThanOrEqual(
      AA_TEXT
    );
    // The two tiers the sweep landed on.
    expect(whiteAlphaContrast(0.55, CARD)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(whiteAlphaContrast(0.65, CARD)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("has no text-white tier below the floor left in app/ or components/", () => {
    const offenders: string[] = [];
    for (const file of [
      ...sourceFiles(join(REPO_ROOT, "app")),
      ...sourceFiles(join(REPO_ROOT, "components")),
    ]) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const match of line.matchAll(/text-white\/(\d{1,3})\b/g)) {
            if (Number(match[1]) / 100 < MIN_WHITE_TEXT_ALPHA) {
              offenders.push(
                `${file.slice(REPO_ROOT.length + 1)}:${i + 1} ${match[0]}`
              );
            }
          }
        });
    }
    expect(
      offenders,
      `these tiers are below ${AA_TEXT}:1 on the app background:\n` +
        offenders.join("\n")
    ).toEqual([]);
  });

  it("has no opacity-40 wrapper multiplying a text tier back down", () => {
    // A tier that passes on its own fails again inside a 40% parent, and that
    // is exactly how the "not yet measured" chart rows reached 1.44:1.
    const offenders: string[] = [];
    for (const file of [
      ...sourceFiles(join(REPO_ROOT, "app")),
      ...sourceFiles(join(REPO_ROOT, "components")),
    ]) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // Disabled controls are exempt from 1.4.3 and are the only
          // remaining use: they pair opacity-40 with cursor-not-allowed.
          if (line.includes("opacity-40") && !line.includes("cursor-not-allowed")) {
            offenders.push(`${file.slice(REPO_ROOT.length + 1)}:${i + 1}`);
          }
        });
    }
    expect(offenders, `opacity-40 over readable text:\n${offenders.join("\n")}`)
      .toEqual([]);
  });
});

describe("the design tokens, read out of globals.css", () => {
  const css = readFileSync(join(REPO_ROOT, "app", "globals.css"), "utf8");

  /** First declaration of a custom property, i.e. the :root default. */
  function token(name: string): string {
    const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    if (!match) throw new Error(`${name} not found in app/globals.css`);
    return match[1];
  }

  it.each(["--cq-text-primary", "--cq-text-secondary", "--cq-text-muted"])(
    "%s clears the body floor on both gradient stops",
    (name) => {
      const colour = parseHex(token(name));
      for (const bg of [BG_TOP, BG_BOTTOM]) {
        expect(
          contrastRatio(colour, bg),
          `${name} = ${token(name)}`
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  );

  it("would still fail the muted grey that shipped", () => {
    // Guards the guard: #6b5f8a was 3.10:1 and passed review for months.
    expect(contrastRatio(parseHex("#6b5f8a"), BG_BOTTOM)).toBeLessThan(AA_TEXT);
  });

  it("draws the focus ring in the accent, not the primary", () => {
    // Every primary is chosen dark enough to carry white label text, which is
    // exactly what makes it a bad ring on a dark page.
    const rule = css.match(/\*:focus-visible\s*\{[^}]*\}/);
    expect(rule?.[0]).toContain("outline: 2px solid var(--cq-accent)");
  });
});

describe("every palette, on the surfaces it is read on", () => {
  const names = Object.keys(themes) as ThemeName[];

  it.each(names)(
    "%s: the focus ring is visible against the page background",
    (name) => {
      // The ring draws on the page, offset outside the control.
      const accent = parseHex(themes[name].accent);
      for (const bg of [BG_TOP, BG_BOTTOM]) {
        expect(
          contrastRatio(accent, bg),
          `${name} accent ${themes[name].accent} as a focus ring`
        ).toBeGreaterThanOrEqual(AA_LARGE_OR_NON_TEXT);
      }
    }
  );

  it.each(names)("%s: the class chip label is readable", (name) => {
    // ClassLabel / RiasecBars / ProgressBar: text on `bg-primary/20`.
    const chip = compositeOver(parseHex(themes[name].primary), 0.2, CARD);
    expect(
      contrastRatio(parseHex(themes[name].accent), chip),
      `${name} accent on its own primary/20 chip`
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(names)("%s: an accent chart bar reads against its track", (name) => {
    expect(
      contrastRatio(parseHex(themes[name].accent), TRACK),
      `${name} accent bar on bg-white/10`
    ).toBeGreaterThanOrEqual(AA_LARGE_OR_NON_TEXT);
  });

  it("is never set as text anywhere in app/ or components/", () => {
    // Not one palette's primary reaches 4.5:1 as text on the dark background
    // or on its own tint, so `text-[var(--color-primary)]` is always wrong.
    const offenders: string[] = [];
    for (const file of [
      ...sourceFiles(join(REPO_ROOT, "app")),
      ...sourceFiles(join(REPO_ROOT, "components")),
    ]) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/text-\[var\(--c(olor|q)-primary\)\]/.test(line)) {
            offenders.push(`${file.slice(REPO_ROOT.length + 1)}:${i + 1}`);
          }
        });
    }
    expect(
      offenders,
      `the palette primary used as text:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("would fail for the primary, which is what shipped", () => {
    // Guards the guard: switching these to the accent is the fix, so the
    // suite has to be able to see the primary failing.
    const failing = names.filter((name) => {
      const chip = compositeOver(parseHex(themes[name].primary), 0.2, CARD);
      return contrastRatio(parseHex(themes[name].primary), chip) < AA_TEXT;
    });
    expect(failing).toEqual(names);
  });
});

describe("chart marks that carry a reading", () => {
  it("an unhighlighted interest bar is visible against its track", () => {
    // RiasecBars below 50 used bg-white/20: 1.41:1, an invisible bar.
    expect(
      contrastRatio(compositeOver(WHITE, 0.2, CARD), TRACK)
    ).toBeLessThan(AA_LARGE_OR_NON_TEXT);
    expect(
      contrastRatio(compositeOver(WHITE, 0.45, CARD), TRACK)
    ).toBeGreaterThanOrEqual(AA_LARGE_OR_NON_TEXT);
  });

  it("has no bg-white tier below the non-text floor on a chart track", () => {
    const chartFiles = sourceFiles(join(REPO_ROOT, "components", "charts"));
    const offenders: string[] = [];
    for (const file of chartFiles) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const match of line.matchAll(/bg-white\/(\d{1,3})\b/g)) {
            const alpha = Number(match[1]) / 100;
            // /5 and /10 are the empty track and the card itself, which are
            // backdrops rather than marks.
            if (alpha > 0.1 && alpha < 0.45) {
              offenders.push(
                `${file.slice(REPO_ROOT.length + 1)}:${i + 1} ${match[0]}`
              );
            }
          }
        });
    }
    expect(offenders, `chart marks below ${AA_LARGE_OR_NON_TEXT}:1`).toEqual([]);
  });
});
