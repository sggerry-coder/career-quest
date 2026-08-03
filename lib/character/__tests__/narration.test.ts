import { describe, it, expect } from "vitest";
import { classDefinitions } from "@/lib/theme";
import { CHARACTER_CLASSES } from "@/lib/character/classes";

describe("narration", () => {
  it("covers every character class", () => {
    const defined = classDefinitions.map((c) => c.id).sort();
    const expected = Object.keys(CHARACTER_CLASSES).sort();
    expect(defined).toEqual(expected);
  });

  it("has both tones for every narration beat", () => {
    for (const def of classDefinitions) {
      for (const [beat, text] of Object.entries(def.narration)) {
        expect(text.quest.length, `${def.id}.${beat}.quest`).toBeGreaterThan(0);
        expect(text.explorer.length, `${def.id}.${beat}.explorer`).toBeGreaterThan(0);
      }
    }
  });

  it("never names a class in the beats that play before naming", () => {
    // warmup_intro and riasec_intro run while the student is still a
    // Wanderer, so neither tone may reference the class the student will
    // become in either beat.
    const tones = ["quest", "explorer"] as const;
    for (const def of classDefinitions) {
      if (def.id === "wanderer") continue;
      for (const tone of tones) {
        const early = `${def.narration.warmup_intro[tone]} ${def.narration.riasec_intro[tone]}`;
        expect(
          early,
          `${def.id} leaks its name early (${tone} tone)`
        ).not.toContain(def.name[tone]);
      }
    }
  });
});
