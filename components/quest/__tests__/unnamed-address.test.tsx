/** @vitest-environment jsdom */
/**
 * Both of these screens fire inside the interest block, which is before the
 * first naming for every student. So the name-less wording is not a rare
 * fallback -- it is what 100% of students see. Before this, everyone was
 * greeted "Nice progress, Wanderer!" and, in explorer tone, the
 * ungrammatical "Nice progress, Still forming!".
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import { CHARACTER_CLASSES } from "@/lib/character/classes";

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
