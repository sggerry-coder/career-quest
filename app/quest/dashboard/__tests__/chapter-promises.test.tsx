/**
 * @vitest-environment jsdom
 *
 * Task 8: several screens used to promise a Chapter 2 that does not exist
 * and is not being built yet (the reveal's "Chapter 2 will deepen these
 * results" was the strongest example). This scans the source of every
 * surface that touched that promise and fails if the certainty language
 * comes back.
 *
 * Uses process.cwd() rather than a relative URL from this file's own
 * location: the brief's suggested `../../../${file}` under-counts by one
 * level (it resolves to app/app/quest/... , not the repo root) since this
 * test lives four directories below the repo root
 * (app/quest/dashboard/__tests__/), not three.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "app/quest/dashboard/page.tsx",
  "components/charts/mi-preview-bars.tsx",
  "components/charts/values-sliders.tsx",
  "components/quest/reveal-sequence.tsx",
];

// Every phrasing that previously stated Chapter 2 (or its "more content"
// variants) as a certainty. Broader than the brief's own two patterns
// ("will deepen", "Deepens in") so a regression on any of the six original
// sites -- not just the two the brief's literal test happened to cover --
// fails loudly instead of silently returning.
const OVER_PROMISE_PATTERNS = [
  /will deepen/i,
  /Deepens in/i,
  /goes deeper/i,
  /More detail in/i,
  /More dimensions in/i,
];

describe("chapter promises", () => {
  it("never states a future chapter as a certainty", () => {
    for (const file of FILES) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      for (const pattern of OVER_PROMISE_PATTERNS) {
        expect(
          source,
          `${file} still matches over-promise pattern ${pattern}`
        ).not.toMatch(pattern);
      }
    }
  });

  it("still leaves the disabled Chapter 2 button alone -- it does not assert a promise", () => {
    const source = readFileSync(
      join(process.cwd(), "app/quest/dashboard/page.tsx"),
      "utf8"
    );
    expect(source).toMatch(/Begin \{chapterLabel\(2, tone\)\} — Coming soon/);
  });
});
