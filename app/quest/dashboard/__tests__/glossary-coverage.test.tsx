/**
 * @vitest-environment jsdom
 *
 * The guard that stops the dashboard growing a new unexplained word.
 *
 * It renders the real page against a student whose profile lights up every
 * surface at once -- all eight strengths, a relic, an emerging letter, a type
 * nobody was asked about -- and then compares the set of terms actually on the
 * screen against the set of definitions that exist. Set *equality*, in both
 * directions, because both directions are real failures:
 *
 *   - a word on the dashboard with no definition is the bug this feature was
 *     built to fix, arriving again;
 *   - a definition nothing on the dashboard opens is dead copy that will be
 *     edited for years by someone who thinks students are reading it.
 *
 * TypeScript already stops a trigger pointing at a term that does not exist.
 * What it cannot see is a label rendered with no trigger at all, which is why
 * components/charts/__tests__/glossary-triggers.test.tsx walks each chart's
 * own list of rows separately.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GLOSSARY } from "@/data/glossary";
import { strengthCategories } from "@/data/strength-categories";

const h = vi.hoisted(() => {
  const studentRow = {
    name: "Aria",
    age: 15,
    avatar_class: "mage-guardian",
    tone: "quest",
    current_session: 1,
    has_completed_session1: true,
    // Two demonstrations of one strength is the relic threshold, so the relic
    // shelf renders rather than returning null.
    self_map: { strength_counts: { Empathy: 3, Analytical: 2 } },
  };

  const scoresRow: Record<string, unknown> = {
    riasec_scores: { R: 80, I: 60, A: 40, S: 20, E: 10, C: 0 },
    // C unasked: the row that carries a definition but no reading.
    riasec_raw_counts: { R: 3, I: 3, A: 2, S: 2, E: 2, C: 0 },
    mi_scores: {
      linguistic: 70,
      logical: 60,
      spatial: 50,
      musical: 0,
      bodily: 0,
      interpersonal: 0,
      intrapersonal: 0,
      naturalistic: 0,
    },
    // EI has too few answers behind it, so the Still Emerging pill shows.
    mbti_indicators: { EI: 80, SN: 80, TF: 80, JP: 80 },
    mbti_raw_counts: { EI: 2, SN: 3, TF: 3, JP: 3 },
    values_compass: {
      security_adventure: 66,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 0,
    },
    values_raw_counts: {
      security_adventure: 1,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 1,
    },
    // Every category the scoring can produce, so every strength chip is on
    // the page at once.
    strengths: [
      "Achiever",
      "Ideation",
      "Empathy",
      "Command",
      "Creativity",
      "Analytical",
      "Communication",
      "Adaptability",
    ],
  };

  function makeTableApi(table: string) {
    const rows: Record<string, unknown> = {
      students: studentRow,
      assessment_scores: scoresRow,
    };
    const listResult = { data: [{ badge_id: "self_discoverer" }], error: null };
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: () => Promise.resolve({ data: rows[table] ?? null, error: null }),
      then: (
        resolve: (v: unknown) => unknown,
        reject: (e: unknown) => unknown
      ) => Promise.resolve(listResult).then(resolve, reject),
    };
    return builder;
  }

  return { scoresRow, makeTableApi };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => h.makeTableApi(table),
  }),
}));

import Dashboard from "@/app/quest/dashboard/page";

afterEach(() => cleanup());

/** Every term with a trigger on the rendered page. */
function termsOnScreen(): Set<string> {
  return new Set(
    Array.from(document.querySelectorAll("[data-cq-term]")).map(
      (el) => el.getAttribute("data-cq-term")!
    )
  );
}

describe("the dashboard's jargon", () => {
  it("has a definition behind every term it puts on the screen", async () => {
    render(<Dashboard />);
    await screen.findByText("Aria");

    const missing = [...termsOnScreen()].filter(
      (term) => !Object.hasOwn(GLOSSARY, term)
    );
    expect(missing, `no definition for: ${missing.join(", ")}`).toEqual([]);
  });

  it("puts every definition it holds within reach of a student", async () => {
    render(<Dashboard />);
    await screen.findByText("Aria");

    const onScreen = termsOnScreen();
    const unreachable = Object.keys(GLOSSARY).filter(
      (term) => !onScreen.has(term)
    );
    expect(
      unreachable,
      `defined but nothing on the dashboard opens it: ${unreachable.join(", ")}`
    ).toEqual([]);
  });

  it("explains every strength it is capable of detecting", async () => {
    render(<Dashboard />);
    await screen.findByText("Aria");

    // The chips are rendered twice -- Detected Strengths and the self-map
    // comparison card -- so this asserts each name is a trigger somewhere,
    // not how many times.
    for (const category of strengthCategories) {
      expect(
        screen.getAllByRole("button", { name: category.name }).length,
        `"${category.name}" is on the dashboard with nothing to tap`
      ).toBeGreaterThan(0);
    }
  });

  it("explains a word the student has no reading for", async () => {
    // The interest type nobody was asked about. This is the row where a
    // student most needs to know what the word meant, and the definition is
    // of the type rather than of their score, so there is one to give.
    render(<Dashboard />);
    await screen.findByText("Aria");

    fireEvent.click(screen.getByRole("button", { name: "Organizer" }));
    expect(screen.getByRole("dialog", { name: "Organizer" })).toBeDefined();
    // Still says it was not asked. The popup explains, it does not paper over.
    expect(screen.getByText("Not asked")).toBeDefined();
  });

  it("explains why a personality letter is missing", async () => {
    render(<Dashboard />);
    await screen.findByText("Aria");

    fireEvent.click(screen.getByRole("button", { name: "Still Emerging" }));
    const dialog = screen.getByRole("dialog", { name: "Still Emerging" });
    expect(dialog.textContent).toContain(GLOSSARY["still-emerging"].body);
  });
});

describe("what the definitions did not disturb", () => {
  it("leaves every reading on the page exactly as it was", async () => {
    // The four charts were fixed the day before this landed, for a different
    // bug class. Adding a trigger to a row must not change what the row says.
    render(<Dashboard />);
    await screen.findByText("Aria");

    expect(screen.getAllByText("Not asked")).toHaveLength(1);
    expect(screen.getAllByText("Not answered yet")).toHaveLength(1);
    expect(screen.getByText("Leans Adventure")).toBeDefined();
    expect(screen.getAllByText("Balanced for now")).toHaveLength(1);
    expect(screen.getByText("80")).toBeDefined();
    expect(screen.getByText(/CLASS:\s*Mage-Guardian/)).toBeDefined();
  });

  it("keeps every section heading announcing itself as just its own name", async () => {
    // The "?" lives inside the heading, and a button's label is folded into
    // the accessible name of the heading around it. Left alone, this would
    // announce as "Ability Scores What Ability Scores means, heading".
    render(<Dashboard />);
    await screen.findByText("Aria");

    for (const name of [
      "Ability Scores",
      "Character Traits",
      "Learning Styles",
      "Values Compass",
      "Detected Strengths",
      "Relics",
    ]) {
      expect(
        screen.getByRole("heading", { name }),
        `heading "${name}" no longer announces as itself`
      ).toBeDefined();
    }
  });
});
