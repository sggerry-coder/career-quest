/** @vitest-environment jsdom */
/**
 * The engagement checkpoint fires inside the interest block, which is before
 * the first naming for every student. So the name-less wording is not a rare
 * fallback -- it is what 100% of students see. Before this, everyone was
 * greeted "Nice progress, Wanderer!" and, in explorer tone, the
 * ungrammatical "Nice progress, Still forming!".
 *
 * The reveal's opening card had the same defect for anyone who finished the
 * quest without earning a class ("Here are your results, Still forming."),
 * and a second one on top: it was handed a separate `className` prop built
 * from questState.avatarClass, which only ever holds the primary, so every
 * dual-class student was greeted by half their name and shown the other half
 * two beats later.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import RevealSequence from "@/components/quest/reveal-sequence";
import { CHARACTER_CLASSES, type DerivedClass } from "@/lib/character/classes";

afterEach(() => cleanup());

/** The placeholder names a student must never be addressed by. */
const PLACEHOLDERS = [
  CHARACTER_CLASSES.wanderer.name.quest, // "Wanderer"
  CHARACTER_CLASSES.wanderer.name.explorer, // "Still forming"
];

const TONES = ["quest", "explorer"] as const;

describe("EngagementCheckpoint", () => {
  for (const tone of TONES) {
    it(`never addresses an unnamed student by a placeholder (${tone})`, () => {
      const { container } = render(
        <EngagementCheckpoint
          characterName={null}
          tone={tone}
          onContinue={vi.fn()}
        />
      );
      const text = container.textContent ?? "";
      for (const placeholder of PLACEHOLDERS) {
        expect(text, `${tone} must not say "${placeholder}"`).not.toContain(
          placeholder
        );
      }
      // Still a complete, natural sentence with no dangling comma.
      expect(text).toContain("Nice progress");
      expect(text).not.toContain(", .");
      expect(text).not.toContain(" ,");
      expect(text).not.toContain("progress, !");
    });
  }

  it("uses the name once the student has earned one", () => {
    render(
      <EngagementCheckpoint
        characterName="Guardian"
        tone="quest"
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText(/Nice progress, Guardian!/)).toBeDefined();
  });
});

const revealScoreState = {
  riasec: { R: 10, I: 80, A: 20, S: 90, E: 20, C: 10 },
  mi: {},
  mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
  mbti_raw: { EI: [], SN: [], TF: [], JP: [] },
  values: {
    security_adventure: 0,
    income_impact: 0,
    prestige_fulfilment: 0,
    structure_flexibility: 0,
    solo_team: 0,
  },
  strengths: [],
  class_label: "",
};

const unnamed: DerivedClass = {
  primary: "wanderer",
  secondary: null,
  isNamed: false,
};
const guardianMage: DerivedClass = {
  primary: "guardian",
  secondary: "mage",
  isNamed: true,
};

describe("RevealSequence opening greeting", () => {
  for (const tone of TONES) {
    it(`never addresses an unnamed student by a placeholder (${tone})`, () => {
      const { container } = render(
        <RevealSequence
          scoreState={revealScoreState}
          resolvedClass={unnamed}
          tone={tone}
          onRevealComplete={vi.fn()}
        />
      );
      const text = container.textContent ?? "";
      for (const placeholder of PLACEHOLDERS) {
        expect(text, `${tone} must not say "${placeholder}"`).not.toContain(
          placeholder
        );
      }
      // Still a complete sentence with no dangling comma.
      expect(text).not.toContain(", .");
      expect(text).not.toContain(" ,");
      expect(text).not.toContain("discovered, !");
    });
  }

  it("greets a dual-class student by the whole name, not half of it", () => {
    // The card two beats later reads "Guardian-Mage"; the greeting said
    // "Guardian". One screen, two answers.
    render(
      <RevealSequence
        scoreState={revealScoreState}
        resolvedClass={guardianMage}
        tone="quest"
        onRevealComplete={vi.fn()}
      />
    );
    expect(
      screen.getByText(/discovered, Guardian-Mage!/)
    ).toBeDefined();
  });
});
